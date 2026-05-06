import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { deleteAccount } from '$lib/server/account';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, listingsByUser } from '$lib/server/profiles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile, listings, userRows] = await Promise.all([
    getOrCreateProfile(db, user.id),
    listingsByUser(db, user.id, { self: true }),
    db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, user.id)).limit(1),
  ]);
  return {
    profile: {
      username: profile.username,
      bio: profile.bio,
      avatarKey: profile.avatarKey,
      name: userRows[0]?.name ?? user.email,
    },
    drafts: listings.filter((l) => l.status === 'draft'),
    published: listings.filter((l) => l.status !== 'draft'),
  };
};

export const actions: Actions = {
  // Permanently delete the user and everything they own. The form requires
  // typing the user's HexHive username as a confirmation guard.
  deleteAccount: async (event) => {
    const user = requireUser(event);
    const fd = await event.request.formData();
    const typed = String(fd.get('confirmUsername') ?? '');

    const profile = await getOrCreateProfile(db, user.id);
    if (!profile.username || typed !== profile.username) {
      return fail(400, { deleteError: 'Type your username exactly to confirm.' });
    }

    await deleteAccount(db, user.id);

    // Best-effort: invalidate the session cookie. Better Auth signs cookies
    // tied to the now-deleted user; we still redirect to / which will fall
    // through to a logged-out experience on next request.
    try {
      await auth.api.signOut({ headers: event.request.headers });
    } catch {
      // ignore — session row is already gone via FK cascade
    }

    throw redirect(303, '/');
  },
};

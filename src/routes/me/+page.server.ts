import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth, enabledSocialProviders, type SocialProvider } from '$lib/auth';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { deleteAccount } from '$lib/server/account';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, listingsByUser } from '$lib/server/profiles';
import type { Actions, PageServerLoad } from './$types';

export interface ConnectedAccount {
  provider: SocialProvider;
  accountId: string;
  createdAt: number;
}

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile, listings, userRows, accountRows] = await Promise.all([
    getOrCreateProfile(db, user.id),
    listingsByUser(db, user.id, { self: true }),
    db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, user.id)).limit(1),
    db
      .select({
        accountId: schema.account.accountId,
        providerId: schema.account.providerId,
        createdAt: schema.account.createdAt,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, user.id)),
  ]);
  // Filter to only providers HexHive currently supports — defends the UI
  // against legacy provider rows surviving from older deploys.
  const known = new Set<string>(enabledSocialProviders);
  const connections: ConnectedAccount[] = accountRows
    .filter((a): a is { accountId: string; providerId: SocialProvider; createdAt: Date } => known.has(a.providerId))
    .map((a) => ({
      provider: a.providerId,
      accountId: a.accountId,
      createdAt: a.createdAt.getTime(),
    }));
  return {
    profile: {
      username: profile.username,
      pronouns: profile.pronouns,
      bio: profile.bio,
      contactEmail: profile.contactEmail,
      avatarKey: profile.avatarKey,
      bannerKey: profile.bannerKey,
      name: userRows[0]?.name ?? user.email,
    },
    drafts: listings.filter((l) => l.status === 'draft'),
    published: listings.filter((l) => l.status !== 'draft'),
    connections,
    availableProviders: enabledSocialProviders.filter((p) => !connections.some((c) => c.provider === p)),
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

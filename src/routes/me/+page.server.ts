import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, listingsByUser } from '$lib/server/profiles';
import type { PageServerLoad } from './$types';

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

import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, listingsByUser } from '$lib/server/profiles';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile, listings] = await Promise.all([
    getOrCreateProfile(db, user.id),
    listingsByUser(db, user.id, { self: true })
  ]);
  return {
    profile: { username: profile.username, bio: profile.bio },
    drafts: listings.filter((l) => l.status === 'draft'),
    published: listings.filter((l) => l.status !== 'draft')
  };
};

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import { db } from '$lib/db';
import { getProfileByUsername, listingsByUser } from '$lib/server/profiles';

export const load: PageServerLoad = async ({ params }) => {
  const profile = await getProfileByUsername(db, params.username);
  if (!profile) throw error(404, 'User not found');

  const userRows = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, profile.userId))
    .limit(1);
  const listings = await listingsByUser(db, profile.userId, { self: false });
  return {
    profile: { username: profile.username, bio: profile.bio, name: userRows[0]?.name ?? '' },
    listings
  };
};

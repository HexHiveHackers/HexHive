import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { getProfileByUsername, listingsByUser } from '$lib/server/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const profile = await getProfileByUsername(db, params.username);
  if (!profile) throw error(404, 'User not found');

  const userRows = await db
    .select({ name: schema.user.name, isPlaceholder: schema.user.isPlaceholder })
    .from(schema.user)
    .where(eq(schema.user.id, profile.userId))
    .limit(1);
  const listings = await listingsByUser(db, profile.userId, { self: false });
  return {
    profile: {
      username: profile.username,
      pronouns: profile.pronouns,
      bio: profile.bio,
      contactEmail: profile.contactEmail,
      avatarKey: profile.avatarKey,
      bannerKey: profile.bannerKey,
      name: userRows[0]?.name ?? '',
      homepageUrl: profile.homepageUrl,
      isPlaceholder: userRows[0]?.isPlaceholder ?? false,
    },
    listings,
  };
};

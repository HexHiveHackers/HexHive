import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { hexhiveAffiliationFor, listAffiliationsForUser } from '$lib/server/affiliations';
import { listAliasesForUser } from '$lib/server/alias-entries';
import { listLinksForUser } from '$lib/server/profile-links';
import { getProfileByUsername, lastActiveFor, listingsByUser } from '$lib/server/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const profile = await getProfileByUsername(db, params.username);
  if (!profile) throw error(404, 'User not found');

  const userRows = await db
    .select({
      name: schema.user.name,
      isPlaceholder: schema.user.isPlaceholder,
      isAdmin: schema.user.isAdmin,
    })
    .from(schema.user)
    .where(eq(schema.user.id, profile.userId))
    .limit(1);
  const listings = await listingsByUser(db, profile.userId, { self: false });
  const lastActive = await lastActiveFor(db, profile.userId, { respectHideFlag: true });
  const dbAffiliations = await listAffiliationsForUser(db, profile.userId);
  const affiliations = userRows[0]?.isAdmin
    ? [hexhiveAffiliationFor(profile.username), ...dbAffiliations]
    : dbAffiliations;
  const aliases = await listAliasesForUser(db, profile.userId);
  const links = await listLinksForUser(db, profile.userId);
  return {
    profile: {
      username: profile.username,
      alias: profile.alias,
      pronouns: profile.pronouns,
      bio: profile.bio,
      contactEmail: profile.contactEmail,
      avatarKey: profile.avatarKey,
      bannerKey: profile.bannerKey,
      name: userRows[0]?.name ?? '',
      homepageUrl: profile.homepageUrl,
      isPlaceholder: userRows[0]?.isPlaceholder ?? false,
      lastActive: lastActive ? lastActive.getTime() : null,
    },
    listings,
    affiliations,
    aliases,
    links,
  };
};

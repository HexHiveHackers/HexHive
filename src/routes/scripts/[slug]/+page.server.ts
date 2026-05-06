import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { getAssetHiveBySlug } from '$lib/server/listings';
import { buildOgMeta } from '$lib/server/seo';

export const load: PageServerLoad = async ({ params, url }) => {
  const detail = await getAssetHiveBySlug(db, 'script', params.slug);
  if (!detail) throw error(404, 'Not found');
  const og = buildOgMeta({
    origin: url.origin,
    listingType: detail.listing.type,
    slug: detail.listing.slug,
    title: detail.listing.title,
    description: detail.listing.description
  });
  return { detail, og };
};

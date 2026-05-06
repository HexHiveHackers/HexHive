import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { getRomhackBySlug } from '$lib/server/listings';
import { buildOgMeta } from '$lib/server/seo';

export const load: PageServerLoad = async ({ params, url }) => {
  const detail = await getRomhackBySlug(db, params.slug);
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

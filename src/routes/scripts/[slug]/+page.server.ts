import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { getAssetHiveBySlug } from '$lib/server/listings';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getAssetHiveBySlug(db, 'script', params.slug);
  if (!detail) throw error(404, 'Not found');
  return { detail };
};

import { db } from '$lib/db';
import { listAssetHives } from '$lib/server/listings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? undefined;
  const includeMature = url.searchParams.get('mature') === 'show';
  const items = await listAssetHives(db, 'sound', { q, includeMature, limit: 60 });
  return { items, filters: { q: q ?? null, mature: includeMature } };
};

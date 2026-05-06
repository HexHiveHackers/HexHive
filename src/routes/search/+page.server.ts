import { db } from '$lib/db';
import { searchListings } from '$lib/server/search';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const typeParam = url.searchParams.get('type');
  const type = (['romhack', 'sprite', 'sound', 'script'] as const).find((t) => t === typeParam);
  const hits = q ? await searchListings(db, q, { type }) : [];
  return { q, type: type ?? null, hits };
};

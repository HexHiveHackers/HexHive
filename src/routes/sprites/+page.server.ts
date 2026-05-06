import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listAssetHives } from '$lib/server/listings';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? undefined;
  const items = await listAssetHives(db, 'sprite', { q, limit: 60 });
  return { items, filters: { q: q ?? null } };
};

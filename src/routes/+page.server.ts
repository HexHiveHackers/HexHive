import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listRomhacks, listAssetHives } from '$lib/server/listings';

export const load: PageServerLoad = async () => {
  const [romhacks, sprites, sounds, scripts] = await Promise.all([
    listRomhacks(db, { limit: 3 }),
    listAssetHives(db, 'sprite', { limit: 3 }),
    listAssetHives(db, 'sound', { limit: 3 }),
    listAssetHives(db, 'script', { limit: 3 })
  ]);
  return { romhacks, sprites, sounds, scripts };
};

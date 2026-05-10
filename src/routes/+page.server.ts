import { listTools } from '$lib/data/tools';
import { db } from '$lib/db';
import { listAssetHives, listRomhacks } from '$lib/server/listings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [romhacks, sprites, sounds, scripts] = await Promise.all([
    listRomhacks(db, { limit: 3 }),
    listAssetHives(db, 'sprite', { limit: 3 }),
    listAssetHives(db, 'sound', { limit: 3 }),
    listAssetHives(db, 'script', { limit: 3 }),
  ]);
  const tools = listTools().slice(0, 3);
  return { romhacks, sprites, sounds, scripts, tools };
};

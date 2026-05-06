import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listRomhacks } from '$lib/server/listings';

export const load: PageServerLoad = async () => {
  const recent = await listRomhacks(db, { limit: 6 });
  return { recent };
};

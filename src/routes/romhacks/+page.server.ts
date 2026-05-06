import { db } from '$lib/db';
import { SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';
import { listRomhacks } from '$lib/server/listings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const baseRomParam = url.searchParams.get('baseRom');
  const q = url.searchParams.get('q') ?? undefined;
  const baseRom = (SUPPORTED_BASE_ROM as readonly string[]).includes(baseRomParam ?? '') ? baseRomParam! : undefined;

  const includeMature = url.searchParams.get('mature') === 'show';
  const items = await listRomhacks(db, { baseRom, q, includeMature, limit: 60 });
  return { items, filters: { baseRom: baseRom ?? null, q: q ?? null, mature: includeMature } };
};

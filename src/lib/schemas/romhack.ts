import { z } from 'zod';
import { ListingBase } from './listing';
import { baseRom, baseRomVersion, baseRomRegion } from './zod-helpers';

export const RomhackInput = ListingBase.extend({
  baseRom,
  baseRomVersion,
  baseRomRegion,
  release: z.string().min(1).max(40),
  categories: z.array(z.string().min(1).max(60)).default([]),
  states: z.array(z.string().min(1).max(60)).default([]),
  tags: z.array(z.string().min(1).max(40)).default([]),
  screenshots: z.array(z.string().url()).default([]),
  boxart: z.array(z.string().url()).default([]),
  trailer: z.array(z.string().url()).default([])
});

export type RomhackInput = z.infer<typeof RomhackInput>;

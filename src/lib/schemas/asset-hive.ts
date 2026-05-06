import { z } from 'zod';
import { ListingBase } from './listing';
import { SUPPORTED_BASE_ROM } from './zod-helpers';

export const AssetHiveInput = ListingBase.extend({
  targetedRoms: z.array(z.enum(SUPPORTED_BASE_ROM)).min(1),
});

export type AssetHiveInput = z.infer<typeof AssetHiveInput>;

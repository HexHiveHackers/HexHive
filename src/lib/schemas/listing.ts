import { z } from 'zod';
import { ASSET_PERMISSION, slug } from './zod-helpers';

export const ListingBase = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(10_000).default(''),
  permissions: z.array(z.enum(ASSET_PERMISSION)),
  slug: slug.optional(),
});

export type ListingBaseInput = z.infer<typeof ListingBase>;

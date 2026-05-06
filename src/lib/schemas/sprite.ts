import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';

const SpriteEntry = z.object({
  type: z.string().min(1),
  subtype: z.string().min(1),
  variant: z
    .union([z.string(), z.array(z.string()), z.record(z.string(), z.union([z.string(), z.array(z.string())]))])
    .optional()
});

export const SpriteInput = AssetHiveInput.extend({
  category: z.union([SpriteEntry, z.array(SpriteEntry), z.record(z.string(), SpriteEntry)]),
  fileMap: z.record(z.string(), SpriteEntry).optional()
});
export type SpriteInput = z.infer<typeof SpriteInput>;

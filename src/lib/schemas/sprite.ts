import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';
import { SPRITE_MAP_CATEGORY, validateTriple } from './sprite-variants';

const SpriteEntry = z
  .object({
    type: z.string().min(1),
    subtype: z.string().min(1),
    variant: z
      .union([z.string(), z.array(z.string()), z.record(z.string(), z.union([z.string(), z.array(z.string())]))])
      .optional(),
  })
  .superRefine((val, ctx) => {
    const r = validateTriple(val.type, val.subtype, val.variant);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: r.error, path: [r.path] });
  });

const FileMapEntry = z
  .object({
    type: z.string().min(1),
    subtype: z.string().min(1),
    variant: z.union([z.string(), z.tuple([z.enum(SPRITE_MAP_CATEGORY), z.string()])]).optional(),
  })
  .superRefine((val, ctx) => {
    const variantValue = Array.isArray(val.variant) ? val.variant[1] : val.variant;
    const r = validateTriple(val.type, val.subtype, variantValue);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: r.error, path: [r.path] });
  });

export const SpriteInput = AssetHiveInput.extend({
  category: z.union([SpriteEntry, z.array(SpriteEntry), z.record(z.string(), SpriteEntry)]),
  fileMap: z.record(z.string(), FileMapEntry).optional(),
});
export type SpriteInput = z.infer<typeof SpriteInput>;

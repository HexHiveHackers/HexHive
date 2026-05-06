import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';
import { SUPPORTED_BASE_ROM_VERSION } from './zod-helpers';

export const ScriptInput = AssetHiveInput.extend({
  categories: z.array(z.string().min(1)).min(1, 'At least one category must be selected'),
  features: z.array(z.string().min(1)).min(1, 'At least one feature must be selected'),
  prerequisites: z.array(z.string()).default([]),
  targetedVersions: z
    .array(z.enum(SUPPORTED_BASE_ROM_VERSION))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, { message: 'Each version can only be selected once' }),
  tools: z.array(z.string().min(1)).min(1, 'At least one tool must be selected'),
});
export type ScriptInput = z.infer<typeof ScriptInput>;

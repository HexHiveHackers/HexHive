import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';

export const SOUND_CATEGORY = ['Attack', 'Cry', 'Jingle', 'SFX', 'Song'] as const;

export const SoundInput = AssetHiveInput.extend({
  category: z.enum(SOUND_CATEGORY)
});
export type SoundInput = z.infer<typeof SoundInput>;

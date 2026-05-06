import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import type { RomhackInput } from '$lib/schemas/romhack';
import type { ScriptInput } from '$lib/schemas/script';
import type { SoundInput } from '$lib/schemas/sound';
import type { SpriteInput } from '$lib/schemas/sprite';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type ListingTypedInput =
  | { type: 'romhack'; input: RomhackInput }
  | { type: 'sprite'; input: SpriteInput }
  | { type: 'sound'; input: SoundInput }
  | { type: 'script'; input: ScriptInput };

export async function writeMeta(db: DB, listingId: string, ti: ListingTypedInput) {
  switch (ti.type) {
    case 'romhack': {
      await db.insert(schema.romhackMeta).values({
        listingId,
        baseRom: ti.input.baseRom,
        baseRomVersion: ti.input.baseRomVersion,
        baseRomRegion: ti.input.baseRomRegion,
        release: ti.input.release,
        categories: ti.input.categories ?? [],
        states: ti.input.states ?? [],
        tags: ti.input.tags ?? [],
        screenshots: ti.input.screenshots ?? [],
        boxart: ti.input.boxart ?? [],
        trailer: ti.input.trailer ?? [],
      });
      return;
    }
    case 'sprite': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0,
      });
      await db.insert(schema.spriteMeta).values({
        listingId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: ti.input.category as any,
        fileMap: ti.input.fileMap ?? null,
      });
      return;
    }
    case 'sound': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0,
      });
      await db.insert(schema.soundMeta).values({
        listingId,
        category: ti.input.category,
      });
      return;
    }
    case 'script': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0,
      });
      await db.insert(schema.scriptMeta).values({
        listingId,
        categories: ti.input.categories,
        features: ti.input.features,
        prerequisites: ti.input.prerequisites ?? [],
        targetedVersions: ti.input.targetedVersions,
        tools: ti.input.tools,
      });
      return;
    }
  }
}

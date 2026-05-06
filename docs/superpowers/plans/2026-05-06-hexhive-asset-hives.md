# HexHive Asset-Hive Verticals (Sprites/Sounds/Scripts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the Romhacks vertical so the same upload → list → detail → download flow works for the three "asset-hive" types — Sprites, Sounds, and Scripts. Replace the simplified Sprite schema with the full `SpriteVariant` discriminated-union typing ported from the original HexHive repo.

**Architecture:** Refactor the Romhack-only server module into a small dispatch over listing types: a per-type `meta` writer, a per-type list/detail reader, a per-type file-allowlist, and a unified `presign` / `finalize` endpoint that accepts any of the four types. UI gets a generic `AssetHiveCard` plus per-type pages.

**Tech stack:** Same as Plans 1–2. No new packages.

**Starting tag:** `romhacks-vertical-complete` (commit on `main`).

---

## File structure (created/modified by this plan)

```
src/
  lib/
    schemas/
      sprite.ts                  # REPLACED with full discriminated-union typing
      sprite-variants.ts         # NEW: exported SpriteVariant tree (the constants)
    utils/
      file-types.ts              # ADD sprite/sound/script limits
    server/
      listings.ts                # ADD createAssetHiveDraft, list/get for each type
      meta-writers.ts            # NEW: per-type meta inserter (sprite/sound/script)
    components/
      listings/
        AssetHiveCard.svelte     # NEW: card for sprite/sound/script
      forms/
        SpriteForm.svelte        # NEW
        SoundForm.svelte         # NEW
        ScriptForm.svelte        # NEW
        AssetHiveBaseFields.svelte  # NEW: title/description/permissions/targetedRoms
  routes/
    api/uploads/
      presign/+server.ts         # MODIFIED: dispatch over `type`
      finalize/+server.ts        # MODIFIED: dispatch over `type`
    sprites/
      +page.server.ts  +page.svelte
      [slug]/+page.server.ts  [slug]/+page.svelte
    sounds/
      +page.server.ts  +page.svelte
      [slug]/+page.server.ts  [slug]/+page.svelte
    scripts/
      +page.server.ts  +page.svelte
      [slug]/+page.server.ts  [slug]/+page.svelte
    upload/
      sprite/+page.server.ts   sprite/+page.svelte
      sound/+page.server.ts    sound/+page.svelte
      script/+page.server.ts   script/+page.svelte
    +page.server.ts             # MODIFIED: include recents from each type
    +page.svelte                # MODIFIED: render mixed feed
```

**Note:** This plan deliberately does NOT collapse `/romhacks/+page.svelte`, `/sprites/+page.svelte`, `/sounds/+page.svelte`, `/scripts/+page.svelte` into one parameterized route. Each type has its own filter UI (Sprites filter by `category` shape; Scripts filter by `categories[]` and `targetedVersions[]`; Sounds by `category` enum). Per-type pages keep filter UIs honest.

---

## Conventions (carry over from Plan 2)

- After each task: `bun run check` and `bun run test` must be clean before commit.
- Commits use `git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit -m "<subject>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"`.
- Conventional commits scoped per area.
- Don't push to GitHub unless instructed.

---

### Task 1: Port the full SpriteVariant tree

**Files:** Create `src/lib/schemas/sprite-variants.ts`, replace `src/lib/schemas/sprite.ts`, add tests.

The original HexHive defined a deep tree: `Battle.Pokemon.Front`, `Overworld.NPC.Walking`, etc. We bring it across as constants + a Zod check that validates `(type, subtype, variant)` triples against the tree.

- [ ] **Step 1: Reference the original tree**

Open `/tmp/HexHive/types/listing.d.ts` and `/tmp/HexHive/shared/zod-helpers.ts` for the source of truth (the `SpriteVariant` type and the `validateSpriteVariant` function). The repo is still cloned from Plan 1.

- [ ] **Step 2: `src/lib/schemas/sprite-variants.ts`**

```ts
// Port of the original HexHive SpriteVariant tree as runtime constants.
// Shape: { [type]: { [subtype]: { variant: undefined | 'string' | string[] } } }
//   - variant === undefined  → no variant allowed
//   - variant === 'string'   → free-form string
//   - variant is an array    → must be one of the listed values

export type VariantSpec =
  | { variant?: undefined }
  | { variant: 'string' }
  | { variant: readonly string[] };

export const SPRITE_VARIANTS = {
  Battle: {
    Attack: { variant: undefined },
    Background: { variant: 'string' },                  // EnvironmentVariant: free-form
    Other: { variant: 'string' },
    Pokeball: { variant: 'string' },
    Pokemon: { variant: ['Back', 'Front'] as const },
    Trainer: { variant: ['Back', 'Front'] as const }
  },
  Environment: {
    Object: { variant: ['HM', 'Item'] as const },
    Other: { variant: 'string' },
    Preview: { variant: 'string' },
    Tiles: { variant: 'string' }
  },
  GameIntro: {
    Background: { variant: 'string' },
    Particles: { variant: 'string' },
    'Publisher Splash Screens': { variant: 'string' },
    Sprite: { variant: 'string' },
    Text: { variant: 'string' }
  },
  Menu: {
    Item: { variant: undefined },
    Mugshots: { variant: ['Battle', 'Dialogue'] as const },
    Other: { variant: 'string' },
    Player: { variant: ['New Game', 'Trainer Card'] as const },
    Pokemon: { variant: ['Animated', 'Static'] as const }
  },
  Overworld: {
    NPC: { variant: 'string' },
    Other: { variant: 'string' },
    Player: { variant: 'string' },
    Pokemon: { variant: ['Follower', 'Land', 'Surfing'] as const }
  },
  UI: {
    Bag: { variant: ['Female', 'Male'] as const },
    Box: { variant: 'string' },
    Case: { variant: 'string' },
    Custom: { variant: 'string' },
    Menu: { variant: 'string' },
    Pokedex: { variant: 'string' },
    PokeNav: { variant: 'string' },
    'Town Map': { variant: 'string' }
  }
} as const satisfies Record<string, Record<string, VariantSpec>>;

export const SPRITE_MAP_CATEGORY = ['animated', 'animatedShiny', 'default', 'shiny'] as const;
export type SpriteMapCategory = (typeof SPRITE_MAP_CATEGORY)[number];

export type SpriteType = keyof typeof SPRITE_VARIANTS;
export type SpriteSubtype<T extends SpriteType> = keyof (typeof SPRITE_VARIANTS)[T];

export function validateTriple(
  type: string,
  subtype: string,
  variant: unknown
): { ok: true } | { ok: false; error: string; path: 'type' | 'subtype' | 'variant' } {
  const types = SPRITE_VARIANTS as unknown as Record<string, Record<string, VariantSpec>>;
  if (!(type in types)) return { ok: false, error: `Invalid sprite type: "${type}"`, path: 'type' };
  if (!(subtype in types[type])) {
    return { ok: false, error: `Invalid subtype "${subtype}" for type "${type}"`, path: 'subtype' };
  }
  const spec = types[type][subtype];

  if (spec.variant === undefined) {
    if (variant !== undefined && variant !== null && variant !== '' && !(Array.isArray(variant) && !variant.length)) {
      return { ok: false, error: `No variant expected for ${type}/${subtype}`, path: 'variant' };
    }
    return { ok: true };
  }

  // Variant required
  const empty =
    variant === undefined ||
    variant === null ||
    (typeof variant === 'string' && variant.trim() === '') ||
    (Array.isArray(variant) && variant.length === 0);
  if (empty) return { ok: false, error: `Variant required for ${type}/${subtype}`, path: 'variant' };

  if (spec.variant === 'string') return { ok: true };

  // spec.variant is a tuple of allowed strings
  const allowed = spec.variant as readonly string[];
  const check = (v: unknown): boolean => typeof v === 'string' && allowed.includes(v);

  if (typeof variant === 'string') return check(variant) ? { ok: true } : { ok: false, error: `Invalid variant "${variant}" for ${type}/${subtype}`, path: 'variant' };
  if (Array.isArray(variant)) {
    for (const v of variant) if (!check(v)) return { ok: false, error: `Invalid variant "${v}" for ${type}/${subtype}`, path: 'variant' };
    return { ok: true };
  }
  if (typeof variant === 'object' && variant !== null) {
    for (const arr of Object.values(variant as Record<string, unknown>)) {
      const list = Array.isArray(arr) ? arr : [arr];
      for (const v of list) if (!check(v)) return { ok: false, error: `Invalid variant "${String(v)}" for ${type}/${subtype}`, path: 'variant' };
    }
    return { ok: true };
  }
  return { ok: false, error: `Variant must be a string, array, or object`, path: 'variant' };
}
```

- [ ] **Step 3: Failing test — `src/lib/schemas/sprite-variants.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateTriple } from './sprite-variants';

describe('validateTriple', () => {
  it('rejects unknown type', () => {
    const r = validateTriple('Bogus', 'X', 'Y');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('type');
  });

  it('rejects unknown subtype', () => {
    const r = validateTriple('Battle', 'Bogus', 'X');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('subtype');
  });

  it('accepts no-variant cases (Battle.Attack)', () => {
    expect(validateTriple('Battle', 'Attack', undefined).ok).toBe(true);
  });

  it('rejects providing a variant where none expected', () => {
    const r = validateTriple('Battle', 'Attack', 'Front');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('variant');
  });

  it('accepts an enum variant (Battle.Pokemon = Front)', () => {
    expect(validateTriple('Battle', 'Pokemon', 'Front').ok).toBe(true);
  });

  it('rejects an off-list enum variant', () => {
    expect(validateTriple('Battle', 'Pokemon', 'Sideways').ok).toBe(false);
  });

  it('accepts free-form string variants (Battle.Background = "Cave")', () => {
    expect(validateTriple('Battle', 'Background', 'Cave').ok).toBe(true);
  });

  it('accepts an array of enum variants', () => {
    expect(validateTriple('Battle', 'Pokemon', ['Front', 'Back']).ok).toBe(true);
  });

  it('rejects an array containing an off-list value', () => {
    expect(validateTriple('Battle', 'Pokemon', ['Front', 'Sideways']).ok).toBe(false);
  });

  it('accepts a record of arrays for SpriteFileMap-style entries', () => {
    expect(
      validateTriple('Battle', 'Pokemon', { default: ['Front'], shiny: ['Back'] }).ok
    ).toBe(true);
  });
});
```

- [ ] **Step 4: Run — verify failure, then pass**

- [ ] **Step 5: Replace `src/lib/schemas/sprite.ts`**

```ts
import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';
import { validateTriple, SPRITE_MAP_CATEGORY } from './sprite-variants';

const SpriteEntry = z
  .object({
    type: z.string().min(1),
    subtype: z.string().min(1),
    variant: z
      .union([
        z.string(),
        z.array(z.string()),
        z.record(z.string(), z.union([z.string(), z.array(z.string())]))
      ])
      .optional()
  })
  .superRefine((val, ctx) => {
    const r = validateTriple(val.type, val.subtype, val.variant);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: r.error, path: [r.path] });
  });

const FileMapEntry = z
  .object({
    type: z.string().min(1),
    subtype: z.string().min(1),
    variant: z
      .union([
        z.string(),
        z.tuple([z.enum(SPRITE_MAP_CATEGORY), z.string()])
      ])
      .optional()
  })
  .superRefine((val, ctx) => {
    const variantValue = Array.isArray(val.variant) ? val.variant[1] : val.variant;
    const r = validateTriple(val.type, val.subtype, variantValue);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: r.error, path: [r.path] });
  });

export const SpriteInput = AssetHiveInput.extend({
  category: z.union([SpriteEntry, z.array(SpriteEntry), z.record(z.string(), SpriteEntry)]),
  fileMap: z.record(z.string(), FileMapEntry).optional()
});
export type SpriteInput = z.infer<typeof SpriteInput>;
```

- [ ] **Step 6: Update Sprite tests in `src/lib/schemas/asset-hive.test.ts`**

Add cases that exercise the discriminated validation. Locate the existing `describe('SpriteInput', ...)` block and replace with:

```ts
describe('SpriteInput', () => {
  it('accepts a valid Battle.Pokemon entry', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' } }).success
    ).toBe(true);
  });
  it('rejects an off-list variant', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Sideways' } }).success
    ).toBe(false);
  });
  it('rejects an unknown subtype', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Nope' } }).success
    ).toBe(false);
  });
  it('accepts a fileMap with category-tagged variants', () => {
    expect(
      SpriteInput.safeParse({
        ...base,
        category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
        fileMap: {
          'frontN.png': { type: 'Battle', subtype: 'Pokemon', variant: ['default', 'Front'] }
        }
      }).success
    ).toBe(true);
  });
});
```

- [ ] **Step 7: `bun run check`, `bun run test`, commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(schemas): replace simplified Sprite with full SpriteVariant tree" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Extend file-type allowlist

**File:** Modify `src/lib/utils/file-types.ts` and add tests.

Add limits for `sprite`, `sound`, `script`. Numbers are rough first cuts; tune in Plan 4.

- [ ] **Step 1: Add limits**

```ts
export const SPRITE_LIMITS = {
  perFileBytes: 5 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  maxFiles: 200,
  allowedExtensions: ['.png', '.gif', '.bmp', '.zip']
} as const;

export const SOUND_LIMITS = {
  perFileBytes: 20 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  maxFiles: 50,
  allowedExtensions: ['.wav', '.ogg', '.mp3', '.s', '.zip']
} as const;

export const SCRIPT_LIMITS = {
  perFileBytes: 10 * 1024 * 1024,
  totalBytes: 30 * 1024 * 1024,
  maxFiles: 100,
  allowedExtensions: ['.s', '.txt', '.md', '.py', '.c', '.h', '.json', '.zip']
} as const;
```

Update `LIMITS_BY_TYPE`:

```ts
const LIMITS_BY_TYPE = {
  romhack: ROMHACK_LIMITS,
  sprite: SPRITE_LIMITS,
  sound: SOUND_LIMITS,
  script: SCRIPT_LIMITS
} as const satisfies Record<ListingType, unknown>;
```

Change the `validateUploads` first-arg type from `keyof typeof LIMITS_BY_TYPE` to `ListingType` (now that all four are defined).

- [ ] **Step 2: Add tests**

In `src/lib/utils/file-types.test.ts`, add a new describe block per type. One sanity test each for happy path + extension rejection. The existing romhack tests stay.

```ts
describe('validateUploads (sprite)', () => {
  it('accepts a .png', () => {
    expect(validateUploads('sprite', [
      { filename: 'a.png', contentType: 'image/png', size: 1000 }
    ]).ok).toBe(true);
  });
  it('rejects .exe', () => {
    expect(validateUploads('sprite', [
      { filename: 'a.exe', contentType: 'x', size: 100 }
    ]).ok).toBe(false);
  });
});

describe('validateUploads (sound)', () => {
  it('accepts a .wav', () => {
    expect(validateUploads('sound', [
      { filename: 'a.wav', contentType: 'audio/wav', size: 1000 }
    ]).ok).toBe(true);
  });
});

describe('validateUploads (script)', () => {
  it('accepts a .s', () => {
    expect(validateUploads('script', [
      { filename: 'a.s', contentType: 'text/plain', size: 1000 }
    ]).ok).toBe(true);
  });
});
```

- [ ] **Step 3: Run, commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(utils): add sprite/sound/script upload limits" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Per-type meta writers + generalized draft

**Files:** Create `src/lib/server/meta-writers.ts`, modify `src/lib/server/listings.ts`.

Generalize `createRomhackDraft` into `createListingDraft` that delegates per-type meta insertion. Keep `createRomhackDraft` as a thin wrapper for backwards compatibility (the existing presign endpoint still imports it; we'll switch over in Task 4).

- [ ] **Step 1: `src/lib/server/meta-writers.ts`**

```ts
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import type { RomhackInput } from '$lib/schemas/romhack';
import type { SpriteInput } from '$lib/schemas/sprite';
import type { SoundInput } from '$lib/schemas/sound';
import type { ScriptInput } from '$lib/schemas/script';

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
        trailer: ti.input.trailer ?? []
      });
      return;
    }
    case 'sprite': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0
      });
      await db.insert(schema.spriteMeta).values({
        listingId,
        category: ti.input.category as unknown,
        fileMap: ti.input.fileMap ?? null
      });
      return;
    }
    case 'sound': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0
      });
      await db.insert(schema.soundMeta).values({
        listingId,
        category: ti.input.category
      });
      return;
    }
    case 'script': {
      await db.insert(schema.assetHiveMeta).values({
        listingId,
        targetedRoms: ti.input.targetedRoms,
        fileCount: 0,
        totalSize: 0
      });
      await db.insert(schema.scriptMeta).values({
        listingId,
        categories: ti.input.categories,
        features: ti.input.features,
        prerequisites: ti.input.prerequisites ?? [],
        targetedVersions: ti.input.targetedVersions,
        tools: ti.input.tools
      });
      return;
    }
  }
}
```

- [ ] **Step 2: Add `createListingDraft` to `src/lib/server/listings.ts`**

Refactor: extract slug-finding into a helper, use `writeMeta`, keep `createRomhackDraft` as a thin shim that calls `createListingDraft` with `type: 'romhack'`. Add the new function:

```ts
import { writeMeta, type ListingTypedInput } from './meta-writers';
import type { ListingType } from '$lib/db/schema';

async function nextSlug(db: DB, type: ListingType, candidate: string): Promise<string> {
  return uniqueSlug(candidate, async (s) => {
    const rows = await db
      .select({ id: schema.listing.id })
      .from(schema.listing)
      .where(and(eq(schema.listing.type, type), eq(schema.listing.slug, s)))
      .limit(1);
    return rows.length > 0;
  });
}

export interface ListingDraft {
  listingId: string;
  versionId: string;
  slug: string;
}

export async function createListingDraft(
  db: DB,
  args: { authorId: string; ti: ListingTypedInput }
): Promise<ListingDraft> {
  const { ti } = args;
  const titleSlug = ti.input.slug ?? slugify(ti.input.title);
  const slug = await nextSlug(db, ti.type, titleSlug);

  const listingId = newId();
  const versionId = newId();

  await db.insert(schema.listing).values({
    id: listingId,
    type: ti.type,
    slug,
    authorId: args.authorId,
    title: ti.input.title,
    description: ti.input.description ?? '',
    permissions: ti.input.permissions,
    status: 'draft'
  });
  await writeMeta(db, listingId, ti);

  // Romhacks use `release` as the version label; asset-hives don't have one yet, default to '1.0'.
  const versionLabel = ti.type === 'romhack' ? ti.input.release : '1.0';
  await db.insert(schema.listingVersion).values({
    id: versionId,
    listingId,
    version: versionLabel,
    isCurrent: true,
    changelog: null
  });

  return { listingId, versionId, slug };
}
```

Then replace the body of `createRomhackDraft` with:

```ts
export async function createRomhackDraft(
  db: DB,
  args: { authorId: string; input: RomhackCreateInput }
): Promise<ListingDraft> {
  return createListingDraft(db, { authorId: args.authorId, ti: { type: 'romhack', input: args.input } });
}
```

- [ ] **Step 3: Run existing tests — they should still pass since `createRomhackDraft` is a thin wrapper.**

- [ ] **Step 4: Add a draft test for each new type — `src/lib/server/listings.test.ts`**

Append:

```ts
describe('createListingDraft for asset-hive types', () => {
  it('drafts a sprite with category', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sprite',
        input: {
          title: 'Sprite Pack', permissions: ['Free'],
          targetedRoms: ['Emerald'],
          category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' }
        }
      }
    });
    expect(draft.slug).toBe('sprite-pack');
  });

  it('drafts a sound', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sound',
        input: {
          title: 'Cry Pack', permissions: ['Free'],
          targetedRoms: ['Emerald'],
          category: 'Cry'
        }
      }
    });
    expect(draft.slug).toBe('cry-pack');
  });

  it('drafts a script', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'script',
        input: {
          title: 'Engine Mod', permissions: ['Credit'],
          targetedRoms: ['Fire Red'],
          categories: ['Feature'],
          features: ['Engine'],
          targetedVersions: ['v1.0'],
          tools: ['HMA Script']
        }
      }
    });
    expect(draft.slug).toBe('engine-mod');
  });
});
```

- [ ] **Step 5: Run, commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(server): add createListingDraft + meta-writers for sprite/sound/script" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Generalize the presign + finalize endpoints

**Files:** Modify `src/routes/api/uploads/presign/+server.ts`, `src/routes/api/uploads/finalize/+server.ts`, plus add tests for the new types.

The presign endpoint currently hard-codes `RomhackInput`. Switch to a discriminated union over all four types and dispatch to `createListingDraft`.

- [ ] **Step 1: Updated `src/routes/api/uploads/presign/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { RomhackInput } from '$lib/schemas/romhack';
import { SpriteInput } from '$lib/schemas/sprite';
import { SoundInput } from '$lib/schemas/sound';
import { ScriptInput } from '$lib/schemas/script';
import { validateUploads, type FileMeta } from '$lib/utils/file-types';
import { presignFor } from '$lib/server/uploads';
import { createListingDraft } from '$lib/server/listings';
import type { ListingTypedInput } from '$lib/server/meta-writers';

const FileMetaSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive()
});

const PresignBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('romhack'), input: RomhackInput, files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('sprite'),  input: SpriteInput,  files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('sound'),   input: SoundInput,   files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('script'),  input: ScriptInput,  files: z.array(FileMetaSchema).min(1) })
]);

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);

  let parsed;
  try {
    parsed = PresignBody.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const validation = validateUploads(parsed.type, parsed.files as FileMeta[]);
  if (!validation.ok) throw error(400, validation.error);

  const ti = { type: parsed.type, input: parsed.input } as ListingTypedInput;
  const draft = await createListingDraft(db, { authorId: user.id, ti });

  const uploads = await presignFor({
    listingId: draft.listingId,
    versionId: draft.versionId,
    files: parsed.files
  });

  return json({
    listingId: draft.listingId,
    versionId: draft.versionId,
    slug: draft.slug,
    uploads
  });
};
```

- [ ] **Step 2: Update finalize to update `asset_hive_meta` totals after persisting files**

`src/routes/api/uploads/finalize/+server.ts` accepts an optional `type` for asset-hives so we can update the `file_count` / `total_size` columns. Add the type to the body, persist files via a new `finalizeListing` (rename `finalizeRomhack`), and bump asset-hive totals when applicable.

In `src/lib/server/listings.ts`, add:

```ts
export async function finalizeListing(
  db: DB,
  args: {
    type: ListingType;
    listingId: string;
    versionId: string;
    files: PersistedFile[];
  }
): Promise<void> {
  for (const f of args.files) {
    await db.insert(schema.listingFile).values({
      id: newId(),
      versionId: args.versionId,
      r2Key: f.r2Key,
      filename: f.filename,
      originalFilename: f.originalFilename,
      size: f.size,
      hash: f.hash
    });
  }

  if (args.type !== 'romhack') {
    const total = args.files.reduce((s, f) => s + f.size, 0);
    await db
      .update(schema.assetHiveMeta)
      .set({ fileCount: args.files.length, totalSize: total })
      .where(eq(schema.assetHiveMeta.listingId, args.listingId));
  }

  await db
    .update(schema.listing)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(schema.listing.id, args.listingId));
}

// Keep finalizeRomhack as a backwards-compatible shim so existing callers/tests
// don't break.
export async function finalizeRomhack(
  db: DB,
  args: { listingId: string; versionId: string; files: PersistedFile[] }
): Promise<void> {
  return finalizeListing(db, { type: 'romhack', ...args });
}
```

Update `src/routes/api/uploads/finalize/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { verifyAllUploaded } from '$lib/server/uploads';
import { finalizeListing } from '$lib/server/listings';

const FinalizeBody = z.object({
  type: z.enum(['romhack', 'sprite', 'sound', 'script']).default('romhack'),
  listingId: z.string().min(1),
  versionId: z.string().min(1),
  files: z.array(z.object({
    r2Key: z.string().min(1),
    filename: z.string().min(1),
    originalFilename: z.string().min(1),
    size: z.number().int().positive(),
    hash: z.string().nullable().optional()
  })).min(1)
});

export const POST: RequestHandler = async (event) => {
  requireUser(event);

  let body;
  try {
    body = FinalizeBody.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const ok = await verifyAllUploaded(body.files.map((f) => f.r2Key));
  if (!ok) throw error(502, 'One or more files were not received by storage');

  await finalizeListing(db, {
    type: body.type,
    listingId: body.listingId,
    versionId: body.versionId,
    files: body.files.map((f) => ({ ...f, hash: f.hash ?? null }))
  });

  return json({ ok: true });
};
```

- [ ] **Step 3: Add tests for the new types' presign**

Append to `src/routes/api/uploads/presign/server.test.ts`:

```ts
describe('POST /api/uploads/presign — asset-hive types', () => {
  it('presigns a sound', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      type: 'sound',
      input: {
        title: 'Cries', permissions: ['Free'],
        targetedRoms: ['Emerald'],
        category: 'Cry'
      },
      files: [{ filename: 'a.wav', contentType: 'audio/wav', size: 100 }]
    }));
    expect(res.status).toBe(200);
  });

  it('presigns a sprite with valid category', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      type: 'sprite',
      input: {
        title: 'Pack', permissions: ['Free'],
        targetedRoms: ['Emerald'],
        category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' }
      },
      files: [{ filename: 'a.png', contentType: 'image/png', size: 100 }]
    }));
    expect(res.status).toBe(200);
  });
});
```

> Note: the existing tests mock `createRomhackDraft` directly. Since the endpoint now uses `createListingDraft`, update the mock target accordingly:

```ts
vi.mock('$lib/server/listings', async () => ({
  createListingDraft: vi.fn(async () => draft),
  // shim still exported for the test that checks createRomhackDraft path:
  createRomhackDraft: vi.fn(async () => draft)
}));
```

- [ ] **Step 4: Run tests, run check, commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(api): generalize presign+finalize over romhack|sprite|sound|script" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Per-type list/detail readers

**File:** Modify `src/lib/server/listings.ts`.

Add `listAssetHives(type, filters)`, `getAssetHiveBySlug(type, slug)`. Reuses joins; the per-type meta is loaded based on `type`.

- [ ] **Step 1: Implement**

```ts
export interface AssetHiveListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'sprite' | 'sound' | 'script';
  targetedRoms: string[];
  fileCount: number;
  totalSize: number;
  downloads: number;
  authorName: string;
  createdAt: Date;
}

export async function listAssetHives(
  db: DB,
  type: 'sprite' | 'sound' | 'script',
  filters: { q?: string; limit?: number; offset?: number }
): Promise<AssetHiveListItem[]> {
  const where = [eq(schema.listing.type, type), eq(schema.listing.status, 'published')];
  if (filters.q) where.push(like(schema.listing.title, `%${filters.q}%`));

  const rows = await db
    .select({
      id: schema.listing.id,
      slug: schema.listing.slug,
      title: schema.listing.title,
      description: schema.listing.description,
      targetedRoms: schema.assetHiveMeta.targetedRoms,
      fileCount: schema.assetHiveMeta.fileCount,
      totalSize: schema.assetHiveMeta.totalSize,
      downloads: schema.listing.downloads,
      authorName: schema.user.name,
      createdAt: schema.listing.createdAt
    })
    .from(schema.listing)
    .innerJoin(schema.assetHiveMeta, eq(schema.assetHiveMeta.listingId, schema.listing.id))
    .innerJoin(schema.user, eq(schema.user.id, schema.listing.authorId))
    .where(and(...where))
    .orderBy(desc(schema.listing.createdAt))
    .limit(filters.limit ?? 60)
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({ ...r, type }));
}

export interface AssetHiveDetail {
  listing: typeof schema.listing.$inferSelect;
  base: typeof schema.assetHiveMeta.$inferSelect;
  meta:
    | { kind: 'sprite'; data: typeof schema.spriteMeta.$inferSelect }
    | { kind: 'sound'; data: typeof schema.soundMeta.$inferSelect }
    | { kind: 'script'; data: typeof schema.scriptMeta.$inferSelect };
  version: typeof schema.listingVersion.$inferSelect;
  files: (typeof schema.listingFile.$inferSelect)[];
  authorName: string;
}

export async function getAssetHiveBySlug(
  db: DB,
  type: 'sprite' | 'sound' | 'script',
  slug: string
): Promise<AssetHiveDetail | null> {
  const lr = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.type, type), eq(schema.listing.slug, slug)))
    .limit(1);
  const listing = lr[0];
  if (!listing) return null;

  const base = (await db.select().from(schema.assetHiveMeta).where(eq(schema.assetHiveMeta.listingId, listing.id)).limit(1))[0];
  if (!base) return null;

  let meta: AssetHiveDetail['meta'];
  if (type === 'sprite') {
    const m = (await db.select().from(schema.spriteMeta).where(eq(schema.spriteMeta.listingId, listing.id)).limit(1))[0];
    if (!m) return null;
    meta = { kind: 'sprite', data: m };
  } else if (type === 'sound') {
    const m = (await db.select().from(schema.soundMeta).where(eq(schema.soundMeta.listingId, listing.id)).limit(1))[0];
    if (!m) return null;
    meta = { kind: 'sound', data: m };
  } else {
    const m = (await db.select().from(schema.scriptMeta).where(eq(schema.scriptMeta.listingId, listing.id)).limit(1))[0];
    if (!m) return null;
    meta = { kind: 'script', data: m };
  }

  const version = (await db
    .select()
    .from(schema.listingVersion)
    .where(and(eq(schema.listingVersion.listingId, listing.id), eq(schema.listingVersion.isCurrent, true)))
    .limit(1))[0];
  if (!version) return null;

  const files = await db.select().from(schema.listingFile).where(eq(schema.listingFile.versionId, version.id));
  const author = (await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, listing.authorId))
    .limit(1))[0];

  return { listing, base, meta, version, files, authorName: author?.name ?? 'unknown' };
}
```

- [ ] **Step 2: Tests in `src/lib/server/listings.test.ts`**

Add an end-to-end test that drafts → finalizes → lists/details for each asset-hive type. Use `finalizeListing` so the asset-hive totals get populated:

```ts
describe('asset-hive list/detail', () => {
  it('lists and fetches a sound', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sound',
        input: { title: 'Snd', permissions: ['Free'], targetedRoms: ['Emerald'], category: 'SFX' }
      }
    });
    await finalizeListing(db, {
      type: 'sound',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'sk', filename: 'a.wav', originalFilename: 'a.wav', size: 42, hash: null }]
    });
    const list = await listAssetHives(db, 'sound', {});
    expect(list.some((r) => r.slug === draft.slug && r.fileCount === 1 && r.totalSize === 42)).toBe(true);

    const detail = await getAssetHiveBySlug(db, 'sound', draft.slug);
    expect(detail?.meta.kind).toBe('sound');
    if (detail?.meta.kind === 'sound') expect(detail.meta.data.category).toBe('SFX');
  });
});
```

- [ ] **Step 3: Run, commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(server): add listAssetHives + getAssetHiveBySlug" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: AssetHiveCard + per-type list pages

**Files:** Create `src/lib/components/listings/AssetHiveCard.svelte`, plus six route files (`/sprites`, `/sounds`, `/scripts`, each with `+page.server.ts` and `+page.svelte`).

- [ ] **Step 1: AssetHiveCard**

```svelte
<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';

  type Type = 'sprite' | 'sound' | 'script';

  let { item, type }: {
    item: {
      slug: string; title: string; description: string;
      targetedRoms: string[]; fileCount: number; totalSize: number;
      downloads: number; authorName: string;
    };
    type: Type;
  } = $props();

  const route = type === 'sprite' ? 'sprites' : type === 'sound' ? 'sounds' : 'scripts';
  const sizeKb = Math.round(item.totalSize / 1024);
</script>

<a class="block border rounded-lg bg-card hover:bg-accent/40 transition-colors p-4"
   href={`/${route}/${item.slug}`}>
  <div class="flex items-start justify-between gap-2 mb-2">
    <h3 class="font-medium line-clamp-2">{item.title}</h3>
    <TypeBadge {type} />
  </div>
  <p class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{item.description}</p>
  <div class="mt-3 flex flex-wrap gap-1">
    {#each item.targetedRoms as r}<Badge variant="secondary">{r}</Badge>{/each}
    <Badge variant="outline">{item.fileCount} files</Badge>
    <Badge variant="outline">{sizeKb} KB</Badge>
  </div>
  <div class="mt-3 text-xs text-muted-foreground flex justify-between">
    <span>by {item.authorName}</span>
    <span>{item.downloads} ↓</span>
  </div>
</a>
```

- [ ] **Step 2: Per-type list pages — `src/routes/sprites/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listAssetHives } from '$lib/server/listings';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? undefined;
  const items = await listAssetHives(db, 'sprite', { q, limit: 60 });
  return { items, filters: { q: q ?? null } };
};
```

`src/routes/sprites/+page.svelte`:

```svelte
<script lang="ts">
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  import ListingsGrid from '$lib/components/listings/ListingsGrid.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  let { data } = $props();
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Sprites</h1>
    <a href="/upload/sprite"><Button>Upload</Button></a>
  </header>
  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={data.filters.q ?? ''} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>
  {#snippet card(it)}
    <AssetHiveCard item={it} type="sprite" />
  {/snippet}
  <ListingsGrid items={data.items} item={card}>
    {#snippet empty()}<p class="text-sm text-muted-foreground">No sprites yet.</p>{/snippet}
  </ListingsGrid>
</section>
```

`/sounds` and `/scripts` are identical structure, just swap `sprite → sound` (`sounds`) and `sprite → script` (`scripts`) and the heading text.

- [ ] **Step 3: Smoke each page**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
for p in /sprites /sounds /scripts; do
  curl -s -o /tmp/p.html -w "GET ${p} HTTP %{http_code}\n" http://localhost:5173${p}
done
pkill -f 'vite dev'
```

Expected: three HTTP 200s.

- [ ] **Step 4: Commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(asset-hives): list pages for sprites/sounds/scripts + AssetHiveCard" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Per-type detail pages

**Files:** Six files: `src/routes/{sprites,sounds,scripts}/[slug]/{+page.server.ts,+page.svelte}`.

- [ ] **Step 1: Detail server load (sprites; sounds/scripts identical pattern)**

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { getAssetHiveBySlug } from '$lib/server/listings';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getAssetHiveBySlug(db, 'sprite', params.slug);
  if (!detail) throw error(404, 'Not found');
  return { detail };
};
```

- [ ] **Step 2: Detail page (sprites)**

```svelte
<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  const { listing, base, meta, files, authorName } = data.detail;
  const sprite = meta.kind === 'sprite' ? meta.data : null;
</script>

<article class="mx-auto max-w-4xl px-4 py-10">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="sprite" />
      <span>by {authorName}</span><span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    <p class="mt-3 text-muted-foreground whitespace-pre-line">{listing.description}</p>
  </header>

  <section class="grid sm:grid-cols-2 gap-4 mb-8">
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Targets</h2>
      <div class="flex flex-wrap gap-1">
        {#each base.targetedRoms as r}<Badge>{r}</Badge>{/each}
      </div>
    </div>
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Pack</h2>
      <div class="flex flex-wrap gap-1">
        <Badge variant="outline">{base.fileCount} files</Badge>
        <Badge variant="outline">{Math.round(base.totalSize / 1024)} KB</Badge>
      </div>
    </div>
    {#if sprite}
      <div class="border rounded-lg p-4 sm:col-span-2">
        <h2 class="text-sm font-medium mb-2">Categories</h2>
        <pre class="text-xs whitespace-pre-wrap">{JSON.stringify(sprite.category, null, 2)}</pre>
      </div>
    {/if}
  </section>

  <section class="border rounded-lg p-4">
    <h2 class="text-sm font-medium mb-3">Files</h2>
    <ul class="grid gap-2">
      {#each files as f}
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate">{f.originalFilename}</span>
          <a href={`/api/downloads/${f.id}`}><Button size="sm">Download</Button></a>
        </li>
      {/each}
    </ul>
  </section>
</article>
```

- [ ] **Step 3: Sounds detail page** — same shape, but the meta block shows `category` (enum):

```svelte
<!-- inside the meta panel -->
{#if meta.kind === 'sound'}
  <Badge>{meta.data.category}</Badge>
{/if}
```

- [ ] **Step 4: Scripts detail page** — show the multi-array meta:

```svelte
{#if meta.kind === 'script'}
  <div class="grid gap-3">
    <div><h3 class="text-sm font-medium">Categories</h3>
      <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.categories as c}<Badge variant="outline">{c}</Badge>{/each}</div></div>
    <div><h3 class="text-sm font-medium">Features</h3>
      <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.features as c}<Badge variant="outline">{c}</Badge>{/each}</div></div>
    <div><h3 class="text-sm font-medium">Targets</h3>
      <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.targetedVersions as c}<Badge variant="secondary">{c}</Badge>{/each}</div></div>
    <div><h3 class="text-sm font-medium">Tools</h3>
      <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.tools as c}<Badge variant="outline">{c}</Badge>{/each}</div></div>
  </div>
{/if}
```

(Inline these inside the same `border rounded-lg` panel layout used for sprites.)

- [ ] **Step 5: Commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(asset-hives): detail pages for sprites/sounds/scripts" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Upload pages

**Files:** Six files: `src/routes/upload/{sprite,sound,script}/{+page.server.ts,+page.svelte}`. Also the three form components.

The orchestration logic in `src/routes/upload/romhack/+page.svelte` is the template — copy and adapt for each type.

- [ ] **Step 1: AssetHiveBaseFields.svelte — shared title/description/permissions/targetedRoms**

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { ASSET_PERMISSION, SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
  };
  let { value = $bindable<V>() }: { value: V } = $props();
</script>

<div class="grid gap-4">
  <div class="grid gap-1.5">
    <Label for="title">Title</Label>
    <Input id="title" bind:value={value.title} required />
  </div>
  <div class="grid gap-1.5">
    <Label for="description">Description</Label>
    <textarea id="description" rows="5" bind:value={value.description}
              class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
  </div>
  <div class="grid gap-1.5">
    <Label>Targeted ROMs</Label>
    <div class="flex flex-wrap gap-3">
      {#each SUPPORTED_BASE_ROM as r}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.targetedRoms.includes(r)}
                 onchange={(e) => {
                   value.targetedRoms = e.currentTarget.checked
                     ? [...value.targetedRoms, r]
                     : value.targetedRoms.filter((x) => x !== r);
                 }} />
          {r}
        </label>
      {/each}
    </div>
  </div>
  <div class="grid gap-1.5">
    <Label>Permissions</Label>
    <div class="flex flex-wrap gap-3">
      {#each ASSET_PERMISSION as p}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.permissions.includes(p)}
                 onchange={(e) => {
                   value.permissions = e.currentTarget.checked
                     ? [...value.permissions, p]
                     : value.permissions.filter((x) => x !== p);
                 }} />
          {p}
        </label>
      {/each}
    </div>
  </div>
</div>
```

- [ ] **Step 2: SoundForm — wraps Base fields and adds the Sound `category` enum select**

```svelte
<script lang="ts">
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import { Label } from '$lib/components/ui/label';
  import { SOUND_CATEGORY } from '$lib/schemas/sound';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
    category: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid gap-1.5">
    <Label for="category">Category</Label>
    <select id="category" bind:value={value.category}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      {#each SOUND_CATEGORY as c}<option value={c}>{c}</option>{/each}
    </select>
  </div>
</div>
```

- [ ] **Step 3: ScriptForm — adds the multi-array fields + targetedVersions**

```svelte
<script lang="ts">
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { SUPPORTED_BASE_ROM_VERSION } from '$lib/schemas/zod-helpers';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
    categoriesText: string;
    featuresText: string;
    prerequisitesText: string;
    targetedVersions: string[];
    toolsText: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="grid gap-1.5">
      <Label for="categoriesText">Categories (comma)</Label>
      <Input id="categoriesText" bind:value={value.categoriesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="featuresText">Features (comma)</Label>
      <Input id="featuresText" bind:value={value.featuresText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="prerequisitesText">Prerequisites (comma)</Label>
      <Input id="prerequisitesText" bind:value={value.prerequisitesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="toolsText">Tools (comma)</Label>
      <Input id="toolsText" bind:value={value.toolsText} />
    </div>
  </div>
  <div class="grid gap-1.5">
    <Label>Targeted versions</Label>
    <div class="flex flex-wrap gap-3">
      {#each SUPPORTED_BASE_ROM_VERSION as v}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.targetedVersions.includes(v)}
                 onchange={(e) => {
                   value.targetedVersions = e.currentTarget.checked
                     ? [...value.targetedVersions, v]
                     : value.targetedVersions.filter((x) => x !== v);
                 }} />
          {v}
        </label>
      {/each}
    </div>
  </div>
</div>
```

- [ ] **Step 4: SpriteForm — for v1, accept a single category triple. UI complexity for the full discriminated union is deferred to Plan 4's polish pass.**

```svelte
<script lang="ts">
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { SPRITE_VARIANTS } from '$lib/schemas/sprite-variants';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
    type: string;
    subtype: string;
    variantText: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();

  const types = Object.keys(SPRITE_VARIANTS);
  $: subtypes = (SPRITE_VARIANTS as any)[value.type] ? Object.keys((SPRITE_VARIANTS as any)[value.type]) : [];
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="type">Type</Label>
      <select id="type" bind:value={value.type}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each types as t}<option value={t}>{t}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="subtype">Subtype</Label>
      <select id="subtype" bind:value={value.subtype}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each subtypes as s}<option value={s}>{s}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="variantText">Variant</Label>
      <Input id="variantText" bind:value={value.variantText}
             placeholder="leave blank if not applicable" />
    </div>
  </div>
</div>
```

> Note: Use `$derived(...)` for `subtypes` instead of the legacy `$:` if your Svelte 5 version flags `$:` as deprecated. The plan uses `$:` for brevity; switch to `let subtypes = $derived(...)` if check warns.

- [ ] **Step 5: Per-type upload pages**

`src/routes/upload/sound/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth-utils';
export const load: PageServerLoad = async (event) => { requireUser(event); return {}; };
```

`src/routes/upload/sound/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import SoundForm from '$lib/components/forms/SoundForm.svelte';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';

  let form = $state({
    title: '', description: '',
    permissions: ['Credit'] as string[],
    targetedRoms: ['Emerald'] as string[],
    category: 'SFX'
  });
  let files = $state<File[]>([]);
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    err = null;
    if (!files.length) { err = 'Pick at least one file'; return; }
    busy = true;
    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'sound',
          input: form,
          files: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size }))
        })
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { listingId, versionId, slug, uploads } = await presignRes.json();

      await Promise.all(uploads.map((u: any, i: number) =>
        fetch(u.url, { method: 'PUT', headers: { 'content-type': files[i].type || 'application/octet-stream' }, body: files[i] })
          .then((r) => { if (!r.ok) throw new Error(`R2 PUT failed for ${u.originalFilename}`); })
      ));

      const finalizeRes = await fetch('/api/uploads/finalize', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'sound', listingId, versionId,
          files: uploads.map((u: any) => ({ r2Key: u.r2Key, filename: u.filename, originalFilename: u.originalFilename, size: u.size }))
        })
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());
      await goto(`/sounds/${slug}`);
    } catch (e: any) { err = e?.message ?? 'Upload failed'; }
    finally { busy = false; }
  }
</script>

<section class="mx-auto max-w-2xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Upload Sounds</h1>
  <form onsubmit={submit} class="grid gap-6">
    <SoundForm bind:value={form} />
    <div>
      <label class="text-sm font-medium block mb-2">Audio files</label>
      <FileDropzone bind:files accept=".wav,.ogg,.mp3,.s,.zip" />
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Publish'}</Button>
  </form>
</section>
```

`src/routes/upload/script/+page.svelte` is the same shape but:
- form initial state: `categoriesText:'', featuresText:'', prerequisitesText:'', targetedVersions:['v1.0'], toolsText:''`
- before posting, transform: `splitList` each `*Text` field into the array equivalents (`categories`, `features`, `prerequisites`, `tools`).
- accept: `.s,.txt,.md,.py,.c,.h,.json,.zip`
- redirect target: `/scripts/${slug}`

`src/routes/upload/sprite/+page.svelte` similar:
- form initial state: `type:'Battle', subtype:'Pokemon', variantText:'Front'`
- before posting, build `category: { type, subtype, variant: variantText || undefined }`
- accept: `.png,.gif,.bmp,.zip`
- redirect target: `/sprites/${slug}`

Show all three pages explicitly in the implementation. Don't try to share the orchestration logic across types in this plan — copy-paste with per-type adaptations is clearer at this scale; we'll generalize if a fourth asset-hive type ever appears.

- [ ] **Step 6: Smoke (auth-redirect for each)**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
for p in /upload/sprite /upload/sound /upload/script; do
  curl -sI "http://localhost:5173${p}" | head -2
done
pkill -f 'vite dev'
```

Expected: `303` and a `location:` header pointing at `/login?next=...` for each.

- [ ] **Step 7: Commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(asset-hives): upload pages for sprites/sounds/scripts" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Mixed feed on home page

**Files:** Modify `src/routes/+page.server.ts` and `src/routes/+page.svelte`.

Show the most recent 3 of each type (12 cards total) below the hero.

- [ ] **Step 1: Server load**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listRomhacks, listAssetHives } from '$lib/server/listings';

export const load: PageServerLoad = async () => {
  const [romhacks, sprites, sounds, scripts] = await Promise.all([
    listRomhacks(db, { limit: 3 }),
    listAssetHives(db, 'sprite', { limit: 3 }),
    listAssetHives(db, 'sound', { limit: 3 }),
    listAssetHives(db, 'script', { limit: 3 })
  ]);
  return { romhacks, sprites, sounds, scripts };
};
```

- [ ] **Step 2: Page**

Replace the existing "Recent romhacks" section with four sections — one per type — using `RomhackCard` for romhacks and `AssetHiveCard` for the others. Keep "Browse all" links pointing at the per-type list pages.

```svelte
<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  let { data } = $props();
</script>

<!-- hero block unchanged -->

<section class="mx-auto max-w-6xl px-4 py-12 grid gap-12">
  {#each [
    { kind: 'romhack', label: 'Romhacks', items: data.romhacks, href: '/romhacks' },
    { kind: 'sprite',  label: 'Sprites',  items: data.sprites,  href: '/sprites' },
    { kind: 'sound',   label: 'Sounds',   items: data.sounds,   href: '/sounds' },
    { kind: 'script',  label: 'Scripts',  items: data.scripts,  href: '/scripts' }
  ] as section}
    <div>
      <div class="flex items-end justify-between mb-4">
        <h2 class="font-display text-xl">{section.label}</h2>
        <a href={section.href} class="text-sm underline">Browse all</a>
      </div>
      {#if section.items.length === 0}
        <p class="text-sm text-muted-foreground">Nothing yet.</p>
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each section.items as item}
            {#if section.kind === 'romhack'}
              <RomhackCard {item} />
            {:else}
              <AssetHiveCard {item} type={section.kind as 'sprite' | 'sound' | 'script'} />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</section>
```

- [ ] **Step 3: Smoke + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(home): mixed feed of recent romhacks/sprites/sounds/scripts" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: E2E test for one asset-hive type

**File:** Create `src/routes/upload/sound/e2e.test.ts`.

Mirror the romhack e2e test for sounds. Confirms presign → finalize → list → detail works for asset-hive types.

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '$lib/db/schema';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (k: string) => `https://put.example/${k}`),
  presignGet: vi.fn(async (k: string) => `https://get.example/${k}`),
  headObject: vi.fn(async () => ({}))
}));

let db: ReturnType<typeof drizzle<typeof schema>>;
vi.mock('$lib/db', () => ({ get db() { return db; } }));

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Author', email: 'a@x.com' });
});

describe('sound upload happy path', () => {
  it('drafts, finalizes, lists, fetches detail', async () => {
    const presign = (await import('../../api/uploads/presign/+server')).POST;
    const finalize = (await import('../../api/uploads/finalize/+server')).POST;
    const { listAssetHives, getAssetHiveBySlug } = await import('$lib/server/listings');

    const evt = (body: any) => ({
      request: new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }),
      locals: { user: { id: 'u1', name: 'Author' }, session: null },
      url: new URL('http://x')
    }) as any;

    const presignRes = await presign(evt({
      type: 'sound',
      input: {
        title: 'E2E Sound', permissions: ['Free'],
        targetedRoms: ['Emerald'],
        category: 'SFX'
      },
      files: [{ filename: 'a.wav', contentType: 'audio/wav', size: 1234 }]
    }));
    const presignJson = await presignRes.json();

    const finalizeRes = await finalize(evt({
      type: 'sound',
      listingId: presignJson.listingId,
      versionId: presignJson.versionId,
      files: [{
        r2Key: presignJson.uploads[0].r2Key,
        filename: presignJson.uploads[0].filename,
        originalFilename: presignJson.uploads[0].originalFilename,
        size: presignJson.uploads[0].size
      }]
    }));
    expect(finalizeRes.status).toBe(200);

    const list = await listAssetHives(db, 'sound', {});
    expect(list.some((r) => r.title === 'E2E Sound' && r.fileCount === 1 && r.totalSize === 1234)).toBe(true);

    const detail = await getAssetHiveBySlug(db, 'sound', presignJson.slug);
    expect(detail).not.toBeNull();
    expect(detail!.meta.kind).toBe('sound');
  });
});
```

- [ ] **Step 2: Run, commit, tag**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "test(asset-hives): server-side happy-path for sound upload flow" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git tag asset-hives-complete
```

---

## Self-review

**Spec coverage:**
- Sprite full discriminated-union schema → Task 1 ✓
- Sound + Script schemas already in place from foundation; this plan exercises them.
- File-type allowlists for new types → Task 2 ✓
- Generalized listing creation/finalization → Tasks 3, 4 ✓
- Per-type list/detail readers → Task 5 ✓
- AssetHiveCard + per-type list pages → Task 6 ✓
- Per-type detail pages → Task 7 ✓
- Per-type upload pages → Task 8 ✓
- Home page mixed feed → Task 9 ✓
- E2E test for an asset-hive type → Task 10 ✓
- Profiles, versioning UI, search/FTS, moderation — **deferred to Plan 4** (intentional)

**Placeholders:** none. Sprite upload UI is intentionally minimal (single-triple) with a callout that Plan 4 polishes it; that's a deliberate scope decision, not a placeholder.

**Type consistency:** `ListingTypedInput`, `ListingDraft`, `AssetHiveListItem`, `AssetHiveDetail`, `PersistedFile` are defined once. `finalizeRomhack` is preserved as a shim so existing tests don't break. The Romhack-only `getRomhackBySlug` and `listRomhacks` stay; new generic helpers are additive.

---

## What this plan does NOT cover (intentional)

- Rich Sprite category builder UI (Plan 4 polish).
- User profile pages, versioning UI, FTS search, moderation flag form + admin queue (Plan 4).
- Per-user upload quotas (still relying only on per-listing size caps).
- OG metadata, sitemap, structured data.

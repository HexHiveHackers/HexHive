# HexHive Romhacks Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Romhacks asset type end-to-end on top of the foundation: browse list (`/romhacks`), detail page (`/romhacks/[slug]`), authenticated upload (`/upload/romhack`) using direct browser → R2 presigned PUT URLs, and `/api/downloads/[fileId]` that increments the counter and redirects to a signed GET.

**Architecture:** Three thin server endpoints (`presign`, `finalize`, `downloads`) plus SvelteKit `+page.server.ts` loads. Reads go straight through Drizzle. Writes go through `src/lib/server/listings.ts` (one place that knows how to compose `listing` + `listing_version` + `listing_file` + `romhack_meta` rows in a transaction). All payloads cross the boundary as Zod-validated objects.

**Tech Stack:** Same as foundation. Adds `nanoid` for ids and `mime` for content-type sniffing on upload.

**Foundation tag:** `foundation-complete` (commit `ade14a1`). This plan starts there.

**Working dir:** `/home/user/Projects/hexhive`. Repo: `jmynes/hexhive` (private). Don't push until the user says so.

---

## File Structure (created/modified by this plan)

```
src/
  lib/
    utils/
      ids.ts                     # nanoid + slug helpers
      ids.test.ts
      file-types.ts              # allowlist + per-type size cap
      file-types.test.ts
    server/
      listings.ts                # createRomhackDraft, finalizeRomhack, getRomhackBySlug, listRomhacks
      listings.test.ts
      uploads.ts                 # presignFor, verifyAllUploaded
      uploads.test.ts
    components/
      listings/
        RomhackCard.svelte
        ListingsGrid.svelte
      forms/
        FileDropzone.svelte
        RomhackForm.svelte
  routes/
    romhacks/
      +page.server.ts            # load published romhacks (with filters)
      +page.svelte               # grid + filter sidebar
      [slug]/
        +page.server.ts          # load detail + current version + files + author
        +page.svelte
    upload/
      romhack/
        +page.server.ts          # requireUser, default form data
        +page.svelte             # uses RomhackForm + FileDropzone, orchestrates presign → PUT → finalize
    api/
      uploads/
        presign/+server.ts       # POST: requireUser, validate, return URLs
        finalize/+server.ts      # POST: requireUser, HEAD R2, persist listing
      downloads/
        [fileId]/+server.ts      # GET: increment counter, 303 to signed GET
```

---

## Conventions (same as foundation plan)

- After every task: `bun run check` and `bun run test` must pass before commit.
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- Commits use `git -c user.email=jmynes@local -c user.name=jmynes commit -m "..."`.
- Don't push to GitHub unless instructed.

---

### Task 1: ID + slug helpers

**Files:** Create `src/lib/utils/ids.ts`, `src/lib/utils/ids.test.ts`.

- [ ] **Step 1: Install nanoid**

```bash
cd /home/user/Projects/hexhive
bun add nanoid
```

- [ ] **Step 2: Write the failing test — `src/lib/utils/ids.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { newId, slugify, uniqueSlug } from './ids';

describe('newId', () => {
  it('produces a 21-char nanoid by default', () => {
    expect(newId()).toHaveLength(21);
  });
  it('respects a length argument', () => {
    expect(newId(12)).toHaveLength(12);
  });
});

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Kaizo Emerald')).toBe('kaizo-emerald');
  });
  it('strips diacritics and punctuation', () => {
    expect(slugify('Pokémon: Glazed!')).toBe('pokemon-glazed');
  });
  it('collapses repeated dashes and trims', () => {
    expect(slugify('  --hi--there--  ')).toBe('hi-there');
  });
  it('falls back to a random slug when input is empty', () => {
    expect(slugify('')).toMatch(/^[a-z0-9]{6,}$/);
  });
});

describe('uniqueSlug', () => {
  it('returns the candidate when no collision', async () => {
    expect(await uniqueSlug('kaizo', async () => false)).toBe('kaizo');
  });
  it('appends -2, -3, ... on collision', async () => {
    const taken = new Set(['kaizo', 'kaizo-2']);
    const res = await uniqueSlug('kaizo', async (s) => taken.has(s));
    expect(res).toBe('kaizo-3');
  });
});
```

- [ ] **Step 3: Run — verify failure**

```bash
bun run test src/lib/utils/ids.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement — `src/lib/utils/ids.ts`**

```ts
import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 21);

export function newId(length = 21): string {
  return length === 21 ? nano() : customAlphabet(alphabet, length)();
}

export function slugify(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || newId(8);
}

export async function uniqueSlug(
  candidate: string,
  isTaken: (s: string) => Promise<boolean>
): Promise<string> {
  if (!(await isTaken(candidate))) return candidate;
  for (let i = 2; i < 1000; i++) {
    const s = `${candidate}-${i}`;
    if (!(await isTaken(s))) return s;
  }
  return `${candidate}-${newId(6)}`;
}
```

- [ ] **Step 5: Verify pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(utils): add nanoid + slugify + uniqueSlug helpers"
```

---

### Task 2: File-type allowlist + size caps

**Files:** Create `src/lib/utils/file-types.ts`, `src/lib/utils/file-types.test.ts`.

- [ ] **Step 1: Failing test — `src/lib/utils/file-types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateUploads, ROMHACK_LIMITS } from './file-types';

describe('validateUploads (romhack)', () => {
  it('accepts a single .ips under cap', () => {
    const r = validateUploads('romhack', [
      { filename: 'patch.ips', contentType: 'application/octet-stream', size: 2_000_000 }
    ]);
    expect(r.ok).toBe(true);
  });

  it('rejects a disallowed extension', () => {
    const r = validateUploads('romhack', [
      { filename: 'evil.exe', contentType: 'application/octet-stream', size: 100 }
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/extension/i);
  });

  it('rejects when file exceeds per-file size cap', () => {
    const r = validateUploads('romhack', [
      { filename: 'huge.ips', contentType: 'application/octet-stream', size: ROMHACK_LIMITS.perFileBytes + 1 }
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });

  it('rejects when total exceeds total-size cap', () => {
    const big = ROMHACK_LIMITS.perFileBytes;
    const files = Array.from({ length: 5 }, (_, i) => ({
      filename: `p${i}.ips`,
      contentType: 'application/octet-stream',
      size: big
    }));
    const r = validateUploads('romhack', files);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/total/i);
  });

  it('rejects empty file list', () => {
    expect(validateUploads('romhack', []).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify failure**

```bash
bun run test src/lib/utils/file-types.test.ts
```

- [ ] **Step 3: Implement — `src/lib/utils/file-types.ts`**

```ts
import type { ListingType } from '$lib/db/schema';

export const ROMHACK_LIMITS = {
  perFileBytes: 50 * 1024 * 1024,        // 50 MB
  totalBytes: 100 * 1024 * 1024,          // 100 MB across all files in a listing
  maxFiles: 10,
  allowedExtensions: ['.ips', '.ups', '.bps', '.zip', '.7z']
} as const;

const LIMITS_BY_TYPE = {
  romhack: ROMHACK_LIMITS
  // sprite/sound/script will be added in Plan 3
} as const satisfies Partial<Record<ListingType, unknown>>;

export interface FileMeta {
  filename: string;
  contentType: string;
  size: number;
}

type Result = { ok: true } | { ok: false; error: string };

export function validateUploads(type: keyof typeof LIMITS_BY_TYPE, files: FileMeta[]): Result {
  const limits = LIMITS_BY_TYPE[type];
  if (!files.length) return { ok: false, error: 'At least one file is required' };
  if (files.length > limits.maxFiles) {
    return { ok: false, error: `Too many files (max ${limits.maxFiles})` };
  }

  let total = 0;
  for (const f of files) {
    const ext = '.' + (f.filename.split('.').pop() ?? '').toLowerCase();
    if (!(limits.allowedExtensions as readonly string[]).includes(ext)) {
      return { ok: false, error: `Extension ${ext} not allowed for ${type}` };
    }
    if (f.size <= 0) return { ok: false, error: `Empty file: ${f.filename}` };
    if (f.size > limits.perFileBytes) {
      return { ok: false, error: `File ${f.filename} too large (max ${limits.perFileBytes} bytes)` };
    }
    total += f.size;
  }
  if (total > limits.totalBytes) {
    return { ok: false, error: `Total file size too large (max ${limits.totalBytes} bytes)` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(utils): add per-type upload allowlist and size caps"
```

---

### Task 3: Server uploads module (presign + verify)

**Files:** Create `src/lib/server/uploads.ts`, `src/lib/server/uploads.test.ts`.

This wraps the R2 helper from foundation Task 6 with the listing-aware key layout (`{listingId}/{versionId}/{filename}`) and a verification step that confirms every key was actually uploaded.

- [ ] **Step 1: Failing test — `src/lib/server/uploads.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(async (key: string) => `https://get.example/${key}`),
  headObject: vi.fn(async () => ({}))
}));

beforeEach(() => vi.clearAllMocks());

describe('presignFor', () => {
  it('returns a URL per file with R2 keys under {listingId}/{versionId}/', async () => {
    const { presignFor } = await import('./uploads');
    const out = await presignFor({
      listingId: 'L1',
      versionId: 'V1',
      files: [
        { filename: 'patch.ips', contentType: 'application/octet-stream', size: 100 }
      ]
    });
    expect(out).toHaveLength(1);
    expect(out[0].r2Key).toMatch(/^L1\/V1\/[a-z0-9]+-patch\.ips$/);
    expect(out[0].url).toContain('put.example');
  });
});

describe('verifyAllUploaded', () => {
  it('returns true when every HEAD succeeds', async () => {
    const { verifyAllUploaded } = await import('./uploads');
    expect(await verifyAllUploaded(['a', 'b'])).toBe(true);
  });

  it('returns false when any HEAD throws', async () => {
    const { headObject } = await import('$lib/storage/r2');
    (headObject as any).mockImplementationOnce(async () => { throw new Error('not found'); });
    const { verifyAllUploaded } = await import('./uploads');
    expect(await verifyAllUploaded(['a', 'b'])).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement — `src/lib/server/uploads.ts`**

```ts
import { presignPut, headObject } from '$lib/storage/r2';
import { newId } from '$lib/utils/ids';

export interface PresignRequestFile {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignedFile {
  r2Key: string;
  url: string;
  filename: string;
  originalFilename: string;
  size: number;
}

export async function presignFor(input: {
  listingId: string;
  versionId: string;
  files: PresignRequestFile[];
}): Promise<PresignedFile[]> {
  return Promise.all(
    input.files.map(async (f) => {
      const safe = f.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = `${input.listingId}/${input.versionId}/${newId(8)}-${safe}`;
      const url = await presignPut(r2Key, f.contentType, f.size);
      return {
        r2Key,
        url,
        filename: r2Key.split('/').pop()!,
        originalFilename: f.filename,
        size: f.size
      };
    })
  );
}

export async function verifyAllUploaded(r2Keys: string[]): Promise<boolean> {
  for (const key of r2Keys) {
    try {
      await headObject(key);
    } catch {
      return false;
    }
  }
  return true;
}
```

- [ ] **Step 4: Pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(server): add presignFor and verifyAllUploaded"
```

---

### Task 4: Server listings module (Romhack CRUD)

**Files:** Create `src/lib/server/listings.ts`, `src/lib/server/listings.test.ts`.

Uses an injectable `db` so tests can pass an in-memory libSQL drizzle handle and run real SQL against the migrated schema.

- [ ] **Step 1: Failing test — `src/lib/server/listings.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import {
  createRomhackDraft,
  finalizeRomhack,
  getRomhackBySlug,
  listRomhacks,
  type RomhackCreateInput
} from './listings';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Author', email: 'a@x.com' });
});

const sampleInput = (): RomhackCreateInput => ({
  title: 'Kaizo Emerald',
  description: 'Hard mode',
  permissions: ['Credit'],
  baseRom: 'Emerald',
  baseRomVersion: 'v1.0',
  baseRomRegion: 'English',
  release: '1.0.0',
  categories: ['Difficulty'],
  states: ['Beta'],
  tags: [],
  screenshots: [],
  boxart: [],
  trailer: []
});

describe('Romhack listing CRUD', () => {
  it('creates a draft and finalizes it', async () => {
    const draft = await createRomhackDraft(db, { authorId: 'u1', input: sampleInput() });
    expect(draft.listingId).toBeTruthy();
    expect(draft.versionId).toBeTruthy();
    expect(draft.slug).toBe('kaizo-emerald');

    await finalizeRomhack(db, {
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [
        { r2Key: 'k', filename: 'k.ips', originalFilename: 'patch.ips', size: 100, hash: null }
      ]
    });

    const got = await getRomhackBySlug(db, 'kaizo-emerald');
    expect(got).not.toBeNull();
    expect(got!.listing.status).toBe('published');
    expect(got!.files).toHaveLength(1);
    expect(got!.meta.baseRom).toBe('Emerald');
  });

  it('lists only published romhacks', async () => {
    const a = await createRomhackDraft(db, { authorId: 'u1', input: { ...sampleInput(), title: 'Pub' } });
    await finalizeRomhack(db, {
      listingId: a.listingId, versionId: a.versionId,
      files: [{ r2Key: 'k2', filename: 'k.ips', originalFilename: 'a.ips', size: 1, hash: null }]
    });
    await createRomhackDraft(db, { authorId: 'u1', input: { ...sampleInput(), title: 'Draft' } });

    const list = await listRomhacks(db, {});
    const titles = list.map((r) => r.title);
    expect(titles).toContain('Pub');
    expect(titles).not.toContain('Draft');
  });

  it('produces a unique slug on title collision', async () => {
    const a = await createRomhackDraft(db, { authorId: 'u1', input: { ...sampleInput(), title: 'Same' } });
    const b = await createRomhackDraft(db, { authorId: 'u1', input: { ...sampleInput(), title: 'Same' } });
    expect(a.slug).toBe('same');
    expect(b.slug).toBe('same-2');
  });

  it('filters by baseRom', async () => {
    const a = await createRomhackDraft(db, {
      authorId: 'u1',
      input: { ...sampleInput(), title: 'FR Hack', baseRom: 'Fire Red' }
    });
    await finalizeRomhack(db, {
      listingId: a.listingId, versionId: a.versionId,
      files: [{ r2Key: 'k3', filename: 'k.ips', originalFilename: 'a.ips', size: 1, hash: null }]
    });

    const fr = await listRomhacks(db, { baseRom: 'Fire Red' });
    expect(fr.every((r) => r.baseRom === 'Fire Red')).toBe(true);
    expect(fr.some((r) => r.title === 'FR Hack')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement — `src/lib/server/listings.ts`**

```ts
import { and, desc, eq, like, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId, slugify, uniqueSlug } from '$lib/utils/ids';
import type { RomhackInput } from '$lib/schemas/romhack';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type RomhackCreateInput = RomhackInput;

export interface RomhackDraft {
  listingId: string;
  versionId: string;
  slug: string;
}

export async function createRomhackDraft(
  db: DB,
  args: { authorId: string; input: RomhackCreateInput }
): Promise<RomhackDraft> {
  const candidate = args.input.slug ?? slugify(args.input.title);
  const slug = await uniqueSlug(candidate, async (s) => {
    const rows = await db
      .select({ id: schema.listing.id })
      .from(schema.listing)
      .where(and(eq(schema.listing.type, 'romhack'), eq(schema.listing.slug, s)))
      .limit(1);
    return rows.length > 0;
  });

  const listingId = newId();
  const versionId = newId();

  await db.insert(schema.listing).values({
    id: listingId,
    type: 'romhack',
    slug,
    authorId: args.authorId,
    title: args.input.title,
    description: args.input.description ?? '',
    permissions: args.input.permissions,
    status: 'draft'
  });
  await db.insert(schema.romhackMeta).values({
    listingId,
    baseRom: args.input.baseRom,
    baseRomVersion: args.input.baseRomVersion,
    baseRomRegion: args.input.baseRomRegion,
    release: args.input.release,
    categories: args.input.categories ?? [],
    states: args.input.states ?? [],
    tags: args.input.tags ?? [],
    screenshots: args.input.screenshots ?? [],
    boxart: args.input.boxart ?? [],
    trailer: args.input.trailer ?? []
  });
  await db.insert(schema.listingVersion).values({
    id: versionId,
    listingId,
    version: args.input.release,
    isCurrent: true,
    changelog: null
  });

  return { listingId, versionId, slug };
}

export interface PersistedFile {
  r2Key: string;
  filename: string;
  originalFilename: string;
  size: number;
  hash: string | null;
}

export async function finalizeRomhack(
  db: DB,
  args: { listingId: string; versionId: string; files: PersistedFile[] }
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
  await db
    .update(schema.listing)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(schema.listing.id, args.listingId));
}

export interface RomhackListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  baseRom: string;
  baseRomVersion: string;
  release: string;
  categories: string[];
  downloads: number;
  authorName: string;
  createdAt: Date;
}

export async function listRomhacks(
  db: DB,
  filters: { baseRom?: string; q?: string; limit?: number; offset?: number }
): Promise<RomhackListItem[]> {
  const where = [eq(schema.listing.type, 'romhack'), eq(schema.listing.status, 'published')];
  if (filters.baseRom) where.push(eq(schema.romhackMeta.baseRom, filters.baseRom));
  if (filters.q) where.push(like(schema.listing.title, `%${filters.q}%`));

  const rows = await db
    .select({
      id: schema.listing.id,
      slug: schema.listing.slug,
      title: schema.listing.title,
      description: schema.listing.description,
      baseRom: schema.romhackMeta.baseRom,
      baseRomVersion: schema.romhackMeta.baseRomVersion,
      release: schema.romhackMeta.release,
      categories: schema.romhackMeta.categories,
      downloads: schema.listing.downloads,
      authorName: schema.user.name,
      createdAt: schema.listing.createdAt
    })
    .from(schema.listing)
    .innerJoin(schema.romhackMeta, eq(schema.romhackMeta.listingId, schema.listing.id))
    .innerJoin(schema.user, eq(schema.user.id, schema.listing.authorId))
    .where(and(...where))
    .orderBy(desc(schema.listing.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return rows;
}

export interface RomhackDetail {
  listing: typeof schema.listing.$inferSelect;
  meta: typeof schema.romhackMeta.$inferSelect;
  version: typeof schema.listingVersion.$inferSelect;
  files: (typeof schema.listingFile.$inferSelect)[];
  authorName: string;
}

export async function getRomhackBySlug(db: DB, slug: string): Promise<RomhackDetail | null> {
  const listingRows = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.type, 'romhack'), eq(schema.listing.slug, slug)))
    .limit(1);
  const listing = listingRows[0];
  if (!listing) return null;

  const metaRows = await db
    .select()
    .from(schema.romhackMeta)
    .where(eq(schema.romhackMeta.listingId, listing.id))
    .limit(1);
  const versionRows = await db
    .select()
    .from(schema.listingVersion)
    .where(and(eq(schema.listingVersion.listingId, listing.id), eq(schema.listingVersion.isCurrent, true)))
    .limit(1);
  if (!metaRows[0] || !versionRows[0]) return null;

  const fileRows = await db
    .select()
    .from(schema.listingFile)
    .where(eq(schema.listingFile.versionId, versionRows[0].id));
  const authorRows = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, listing.authorId))
    .limit(1);

  return {
    listing,
    meta: metaRows[0],
    version: versionRows[0],
    files: fileRows,
    authorName: authorRows[0]?.name ?? 'unknown'
  };
}

export async function incrementDownloads(db: DB, listingId: string): Promise<void> {
  await db
    .update(schema.listing)
    .set({ downloads: sql`${schema.listing.downloads} + 1` })
    .where(eq(schema.listing.id, listingId));
}
```

- [ ] **Step 4: Pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(server): add Romhack listing CRUD with slug uniqueness and base-rom filter"
```

---

### Task 5: `/api/uploads/presign` endpoint

**Files:** Create `src/routes/api/uploads/presign/+server.ts`, `src/routes/api/uploads/presign/server.test.ts`.

The endpoint accepts a list of file metadata and a listing type, validates against the type's allowlist, calls `createRomhackDraft` (for `romhack`) to mint a `listingId`/`versionId`, and returns presigned PUT URLs. Other types arrive in Plan 3.

- [ ] **Step 1: Failing test — `src/routes/api/uploads/presign/server.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(),
  headObject: vi.fn()
}));

const fakeDb = {} as any;
const draft = { listingId: 'L', versionId: 'V', slug: 'k' };

vi.mock('$lib/db', () => ({ db: fakeDb }));
vi.mock('$lib/server/listings', async () => ({
  createRomhackDraft: vi.fn(async () => draft)
}));

beforeEach(() => vi.clearAllMocks());

const buildEvent = (body: unknown, user: any = { id: 'u1' }) => ({
  request: new Request('http://x/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }),
  locals: { user, session: null },
  url: new URL('http://x/api/uploads/presign')
}) as any;

describe('POST /api/uploads/presign', () => {
  it('401s without a user', async () => {
    const { POST } = await import('./+server');
    await expect(POST(buildEvent({ type: 'romhack' }, null))).rejects.toMatchObject({ status: 303 });
  });

  it('400s when validation fails', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({ type: 'romhack', input: {}, files: [] }));
    expect(res.status).toBe(400);
  });

  it('returns presigned URLs for a valid romhack', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      type: 'romhack',
      input: {
        title: 'Kaizo', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English',
        release: '1.0.0'
      },
      files: [{ filename: 'patch.ips', contentType: 'application/octet-stream', size: 100 }]
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listingId).toBe('L');
    expect(json.versionId).toBe('V');
    expect(json.uploads).toHaveLength(1);
    expect(json.uploads[0].url).toContain('put.example');
  });
});
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement — `src/routes/api/uploads/presign/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { RomhackInput } from '$lib/schemas/romhack';
import { validateUploads, type FileMeta } from '$lib/utils/file-types';
import { presignFor } from '$lib/server/uploads';
import { createRomhackDraft } from '$lib/server/listings';

const FileMetaSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive()
});

const PresignBody = z.object({
  type: z.enum(['romhack']),  // sprite/sound/script in Plan 3
  input: RomhackInput,
  files: z.array(FileMetaSchema).min(1)
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  let parsed;
  try {
    parsed = PresignBody.parse(await event.request.json());
  } catch (e) {
    throw error(400, 'Invalid request body');
  }

  const validation = validateUploads('romhack', parsed.files as FileMeta[]);
  if (!validation.ok) throw error(400, validation.error);

  const draft = await createRomhackDraft(db, { authorId: user.id, input: parsed.input });
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

- [ ] **Step 4: Pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(api): POST /api/uploads/presign for romhack drafts"
```

---

### Task 6: `/api/uploads/finalize` endpoint

**Files:** Create `src/routes/api/uploads/finalize/+server.ts`, `src/routes/api/uploads/finalize/server.test.ts`.

After the browser PUTs files to R2, it POSTs the resolved keys back here. The server HEADs each key, persists the files, and marks the listing published.

- [ ] **Step 1: Failing test — `src/routes/api/uploads/finalize/server.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(),
  presignGet: vi.fn(),
  headObject: vi.fn(async () => ({}))
}));
vi.mock('$lib/db', () => ({ db: {} as any }));
const finalizeMock = vi.fn(async () => {});
vi.mock('$lib/server/listings', () => ({
  finalizeRomhack: finalizeMock
}));

beforeEach(() => vi.clearAllMocks());

const buildEvent = (body: unknown, user: any = { id: 'u1' }) => ({
  request: new Request('http://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }),
  locals: { user, session: null },
  url: new URL('http://x/api/uploads/finalize')
}) as any;

describe('POST /api/uploads/finalize', () => {
  it('401s without a user', async () => {
    const { POST } = await import('./+server');
    await expect(POST(buildEvent({}, null))).rejects.toMatchObject({ status: 303 });
  });

  it('502s when an R2 HEAD fails', async () => {
    const { headObject } = await import('$lib/storage/r2');
    (headObject as any).mockImplementationOnce(async () => { throw new Error('no'); });
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      listingId: 'L', versionId: 'V',
      files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }]
    }));
    expect(res.status).toBe(502);
    expect(finalizeMock).not.toHaveBeenCalled();
  });

  it('finalizes when all keys exist', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      listingId: 'L', versionId: 'V',
      files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }]
    }));
    expect(res.status).toBe(200);
    expect(finalizeMock).toHaveBeenCalledOnce();
    expect((await res.json()).slug).toBeUndefined();  // server doesn't need to echo slug here
  });
});
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement — `src/routes/api/uploads/finalize/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { verifyAllUploaded } from '$lib/server/uploads';
import { finalizeRomhack } from '$lib/server/listings';

const FinalizeBody = z.object({
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

  await finalizeRomhack(db, {
    listingId: body.listingId,
    versionId: body.versionId,
    files: body.files.map((f) => ({ ...f, hash: f.hash ?? null }))
  });

  return json({ ok: true });
};
```

- [ ] **Step 4: Pass + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(api): POST /api/uploads/finalize verifies R2 and publishes"
```

---

### Task 7: Romhack list page

**Files:** Create `src/routes/romhacks/+page.server.ts`, `src/routes/romhacks/+page.svelte`, `src/lib/components/listings/RomhackCard.svelte`, `src/lib/components/listings/ListingsGrid.svelte`.

- [ ] **Step 1: Server load — `src/routes/romhacks/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listRomhacks } from '$lib/server/listings';
import { SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';

export const load: PageServerLoad = async ({ url }) => {
  const baseRomParam = url.searchParams.get('baseRom');
  const q = url.searchParams.get('q') ?? undefined;
  const baseRom = (SUPPORTED_BASE_ROM as readonly string[]).includes(baseRomParam ?? '')
    ? baseRomParam!
    : undefined;

  const items = await listRomhacks(db, { baseRom, q, limit: 60 });
  return { items, filters: { baseRom: baseRom ?? null, q: q ?? null } };
};
```

- [ ] **Step 2: Card — `src/lib/components/listings/RomhackCard.svelte`**

```svelte
<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { item }: {
    item: {
      slug: string; title: string; description: string;
      baseRom: string; baseRomVersion: string; release: string;
      categories: string[]; downloads: number; authorName: string;
    }
  } = $props();
</script>

<a class="block border rounded-lg bg-card hover:bg-accent/40 transition-colors p-4"
   href={`/romhacks/${item.slug}`}>
  <div class="flex items-start justify-between gap-2 mb-2">
    <h3 class="font-medium line-clamp-2">{item.title}</h3>
    <TypeBadge type="romhack" />
  </div>
  <p class="text-sm text-muted-foreground line-clamp-2 min-h-10">{item.description}</p>
  <div class="mt-3 flex flex-wrap gap-1">
    <Badge variant="secondary">{item.baseRom} {item.baseRomVersion}</Badge>
    <Badge variant="outline">v{item.release}</Badge>
    {#each item.categories.slice(0, 3) as c}
      <Badge variant="outline">{c}</Badge>
    {/each}
  </div>
  <div class="mt-3 text-xs text-muted-foreground flex justify-between">
    <span>by {item.authorName}</span>
    <span>{item.downloads} ↓</span>
  </div>
</a>
```

- [ ] **Step 3: Grid — `src/lib/components/listings/ListingsGrid.svelte`**

```svelte
<script lang="ts" generics="T">
  import { type Snippet } from 'svelte';
  let { items, item, empty }: {
    items: T[];
    item: Snippet<[T]>;
    empty?: Snippet;
  } = $props();
</script>

{#if items.length === 0}
  {#if empty}{@render empty()}{:else}
    <p class="text-sm text-muted-foreground">No results.</p>
  {/if}
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each items as it}
      {@render item(it)}
    {/each}
  </div>
{/if}
```

- [ ] **Step 4: Page — `src/routes/romhacks/+page.svelte`**

```svelte
<script lang="ts">
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  import ListingsGrid from '$lib/components/listings/ListingsGrid.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';

  let { data } = $props();
  let q = $state(data.filters.q ?? '');
  let baseRom = $state(data.filters.baseRom ?? '');
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Romhacks</h1>
    <a href="/upload/romhack"><Button>Upload</Button></a>
  </header>

  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={q} oninput={(e) => (q = e.currentTarget.value)} />
    <select name="baseRom" bind:value={baseRom}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      <option value="">Any base ROM</option>
      {#each SUPPORTED_BASE_ROM as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <Button type="submit" variant="outline">Filter</Button>
  </form>

  <ListingsGrid items={data.items}
                item={(it) => <RomhackCard item={it} />}>
    {#snippet empty()}
      <p class="text-sm text-muted-foreground">No romhacks match your filters yet.</p>
    {/snippet}
  </ListingsGrid>
</section>
```

> Note: SvelteKit currently doesn't support inline JSX syntax like `(it) => <RomhackCard ...>`. Use a snippet instead. Replace the `item={...}` line with the snippet form below.

Replace the `<ListingsGrid>` block with:

```svelte
<ListingsGrid items={data.items} item={card}>
  {#snippet empty()}
    <p class="text-sm text-muted-foreground">No romhacks match your filters yet.</p>
  {/snippet}
</ListingsGrid>

{#snippet card(it)}
  <RomhackCard item={it} />
{/snippet}
```

- [ ] **Step 5: Smoke**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /tmp/r.html -w "HTTP %{http_code}\n" http://localhost:5173/romhacks
grep -c "Romhacks" /tmp/r.html
pkill -f 'vite dev'
```

Expected: HTTP 200, ≥1 match for "Romhacks".

- [ ] **Step 6: `bun run check` and `bun run test` clean. Commit.**

```bash
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(romhacks): list page with filter form, RomhackCard, ListingsGrid"
```

---

### Task 8: Romhack detail page + download endpoint

**Files:** Create `src/routes/romhacks/[slug]/+page.server.ts`, `src/routes/romhacks/[slug]/+page.svelte`, `src/routes/api/downloads/[fileId]/+server.ts`, `src/routes/api/downloads/[fileId]/server.test.ts`.

- [ ] **Step 1: Detail server load — `src/routes/romhacks/[slug]/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { getRomhackBySlug } from '$lib/server/listings';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getRomhackBySlug(db, params.slug);
  if (!detail) throw error(404, 'Not found');
  return { detail };
};
```

- [ ] **Step 2: Detail page — `src/routes/romhacks/[slug]/+page.svelte`**

```svelte
<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  const { listing, meta, files, authorName } = data.detail;
</script>

<article class="mx-auto max-w-4xl px-4 py-10">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="romhack" />
      <span>by {authorName}</span>
      <span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    <p class="mt-3 text-muted-foreground whitespace-pre-line">{listing.description}</p>
  </header>

  <section class="grid sm:grid-cols-2 gap-4 mb-8">
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Base ROM</h2>
      <div class="flex flex-wrap gap-1">
        <Badge>{meta.baseRom}</Badge>
        <Badge variant="outline">{meta.baseRomVersion}</Badge>
        <Badge variant="outline">{meta.baseRomRegion}</Badge>
      </div>
    </div>
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Release</h2>
      <Badge variant="secondary">v{meta.release}</Badge>
    </div>
    {#if meta.categories.length}
      <div class="border rounded-lg p-4 sm:col-span-2">
        <h2 class="text-sm font-medium mb-2">Categories</h2>
        <div class="flex flex-wrap gap-1">
          {#each meta.categories as c}<Badge variant="outline">{c}</Badge>{/each}
        </div>
      </div>
    {/if}
  </section>

  <section class="border rounded-lg p-4">
    <h2 class="text-sm font-medium mb-3">Files</h2>
    <ul class="grid gap-2">
      {#each files as f}
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate">{f.originalFilename}</span>
          <a href={`/api/downloads/${f.id}`}>
            <Button size="sm">Download</Button>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</article>
```

- [ ] **Step 3: Failing test for downloads — `src/routes/api/downloads/[fileId]/server.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const incrementMock = vi.fn(async () => {});
vi.mock('$lib/db', () => ({ db: {} as any }));
vi.mock('$lib/server/listings', () => ({ incrementDownloads: incrementMock }));
vi.mock('$lib/storage/r2', () => ({
  presignGet: vi.fn(async (k: string) => `https://get.example/${k}`),
  presignPut: vi.fn(),
  headObject: vi.fn()
}));

const fileRow = { id: 'F', versionId: 'V', r2Key: 'a/b/c', filename: 'c', originalFilename: 'c', size: 1, hash: null };
const versionRow = { id: 'V', listingId: 'L' };

vi.mock('drizzle-orm/libsql', () => ({}));
vi.mock('drizzle-orm', () => ({ eq: () => ({}), and: () => ({}) }));
vi.mock('$lib/db/schema', () => ({
  listingFile: {} as any,
  listingVersion: {} as any,
  listing: {} as any
}));

beforeEach(() => vi.clearAllMocks());

const event = (id: string) => ({ params: { fileId: id } }) as any;

describe('GET /api/downloads/[fileId]', () => {
  it('404s when file missing', async () => {
    vi.doMock('drizzle-orm/libsql', () => ({}));
    vi.doMock('$lib/db', () => ({
      db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) }
    }));
    const { GET } = await import('./+server');
    await expect(GET(event('missing'))).rejects.toMatchObject({ status: 404 });
  });
});
```

> The test above is intentionally minimal — exercising the 404 branch is enough to verify the wiring; the happy-path query mock for two joined tables is over the line vs. value. Plan 4 adds an integration test against an in-memory DB.

- [ ] **Step 4: Implement — `src/routes/api/downloads/[fileId]/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { presignGet } from '$lib/storage/r2';
import { incrementDownloads } from '$lib/server/listings';

export const GET: RequestHandler = async ({ params }) => {
  const fileRows = await db
    .select()
    .from(schema.listingFile)
    .where(eq(schema.listingFile.id, params.fileId))
    .limit(1);
  const file = fileRows[0];
  if (!file) throw error(404, 'File not found');

  const verRows = await db
    .select()
    .from(schema.listingVersion)
    .where(eq(schema.listingVersion.id, file.versionId))
    .limit(1);
  const ver = verRows[0];
  if (!ver) throw error(404, 'File not found');

  await incrementDownloads(db, ver.listingId);
  const url = await presignGet(file.r2Key);
  throw redirect(303, url);
};
```

- [ ] **Step 5: Smoke + commit**

Pass tests, run `bun run check`, then commit:

```bash
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(romhacks): detail page + GET /api/downloads/[fileId] with counter"
```

---

### Task 9: Upload page (`/upload/romhack`)

**Files:** Create `src/routes/upload/romhack/+page.server.ts`, `src/routes/upload/romhack/+page.svelte`, `src/lib/components/forms/FileDropzone.svelte`, `src/lib/components/forms/RomhackForm.svelte`.

- [ ] **Step 1: Auth-guard server load — `src/routes/upload/romhack/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth-utils';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  return {};
};
```

- [ ] **Step 2: FileDropzone — `src/lib/components/forms/FileDropzone.svelte`**

```svelte
<script lang="ts">
  let { files = $bindable<File[]>([]), accept = '' }: {
    files: File[];
    accept?: string;
  } = $props();

  let dragOver = $state(false);

  function add(list: FileList | null) {
    if (!list) return;
    files = [...files, ...Array.from(list)];
  }
  function remove(i: number) {
    files = files.filter((_, idx) => idx !== i);
  }
</script>

<div class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
     class:border-primary={dragOver}
     ondragover={(e) => { e.preventDefault(); dragOver = true; }}
     ondragleave={() => (dragOver = false)}
     ondrop={(e) => { e.preventDefault(); dragOver = false; add(e.dataTransfer?.files ?? null); }}
     role="presentation">
  <p class="text-sm text-muted-foreground mb-3">Drop files here, or</p>
  <label class="inline-flex items-center px-3 py-1.5 border rounded-md cursor-pointer text-sm bg-background hover:bg-accent">
    Browse
    <input type="file" multiple {accept} class="hidden"
           onchange={(e) => add(e.currentTarget.files)} />
  </label>
</div>

{#if files.length}
  <ul class="mt-3 grid gap-1 text-sm">
    {#each files as f, i}
      <li class="flex items-center justify-between border rounded px-2 py-1">
        <span class="truncate">{f.name} <span class="text-muted-foreground">({f.size}B)</span></span>
        <button type="button" class="text-xs text-muted-foreground hover:underline"
                onclick={() => remove(i)}>remove</button>
      </li>
    {/each}
  </ul>
{/if}
```

- [ ] **Step 3: RomhackForm — `src/lib/components/forms/RomhackForm.svelte`**

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    SUPPORTED_BASE_ROM,
    SUPPORTED_BASE_ROM_VERSION,
    SUPPORTED_BASE_ROM_REGION,
    ASSET_PERMISSION
  } from '$lib/schemas/zod-helpers';

  let { value = $bindable<{
    title: string;
    description: string;
    permissions: string[];
    baseRom: string;
    baseRomVersion: string;
    baseRomRegion: string;
    release: string;
    categoriesText: string;
    statesText: string;
    tagsText: string;
  }> } = $props();
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
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="baseRom">Base ROM</Label>
      <select id="baseRom" bind:value={value.baseRom}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM as r}<option value={r}>{r}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="baseRomVersion">Version</Label>
      <select id="baseRomVersion" bind:value={value.baseRomVersion}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM_VERSION as v}<option value={v}>{v}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="baseRomRegion">Region</Label>
      <select id="baseRomRegion" bind:value={value.baseRomRegion}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM_REGION as r}<option value={r}>{r}</option>{/each}
      </select>
    </div>
  </div>
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="grid gap-1.5">
      <Label for="release">Release</Label>
      <Input id="release" bind:value={value.release} placeholder="1.0.0" required />
    </div>
    <div class="grid gap-1.5">
      <Label>Permissions</Label>
      <div class="flex flex-wrap gap-3">
        {#each ASSET_PERMISSION as p}
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox"
                   checked={value.permissions.includes(p)}
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
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="categoriesText">Categories (comma)</Label>
      <Input id="categoriesText" bind:value={value.categoriesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="statesText">States (comma)</Label>
      <Input id="statesText" bind:value={value.statesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="tagsText">Tags (comma)</Label>
      <Input id="tagsText" bind:value={value.tagsText} />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Upload page — `src/routes/upload/romhack/+page.svelte`**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import RomhackForm from '$lib/components/forms/RomhackForm.svelte';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';

  let form = $state({
    title: '',
    description: '',
    permissions: ['Credit'] as string[],
    baseRom: 'Emerald',
    baseRomVersion: 'v1.0',
    baseRomRegion: 'English',
    release: '1.0.0',
    categoriesText: '',
    statesText: '',
    tagsText: ''
  });
  let files = $state<File[]>([]);
  let busy = $state(false);
  let err = $state<string | null>(null);

  function splitList(s: string) { return s.split(',').map((x) => x.trim()).filter(Boolean); }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    err = null;
    if (!files.length) { err = 'Pick at least one file'; return; }

    busy = true;
    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'romhack',
          input: {
            title: form.title,
            description: form.description,
            permissions: form.permissions,
            baseRom: form.baseRom,
            baseRomVersion: form.baseRomVersion,
            baseRomRegion: form.baseRomRegion,
            release: form.release,
            categories: splitList(form.categoriesText),
            states: splitList(form.statesText),
            tags: splitList(form.tagsText)
          },
          files: files.map((f) => ({
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            size: f.size
          }))
        })
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { listingId, versionId, slug, uploads } = await presignRes.json();

      // PUT each file directly to R2
      await Promise.all(uploads.map((u: any, i: number) =>
        fetch(u.url, {
          method: 'PUT',
          headers: { 'content-type': files[i].type || 'application/octet-stream' },
          body: files[i]
        }).then((r) => { if (!r.ok) throw new Error(`R2 PUT failed for ${u.originalFilename}`); })
      ));

      const finalizeRes = await fetch('/api/uploads/finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId, versionId,
          files: uploads.map((u: any) => ({
            r2Key: u.r2Key,
            filename: u.filename,
            originalFilename: u.originalFilename,
            size: u.size
          }))
        })
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());

      await goto(`/romhacks/${slug}`);
    } catch (e: any) {
      err = e?.message ?? 'Upload failed';
    } finally {
      busy = false;
    }
  }
</script>

<section class="mx-auto max-w-2xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Upload a Romhack</h1>
  <form onsubmit={submit} class="grid gap-6">
    <RomhackForm bind:value={form} />
    <div>
      <label class="text-sm font-medium block mb-2">Patch files</label>
      <FileDropzone bind:files accept=".ips,.ups,.bps,.zip,.7z" />
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Publish'}</Button>
  </form>
</section>
```

- [ ] **Step 5: Smoke check (auth-redirect path)**

The page is auth-guarded; without a session we expect a redirect to `/login`.

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -sI http://localhost:5173/upload/romhack | head -3
pkill -f 'vite dev'
```

Expected: `HTTP/1.1 303` and `location: /login?next=...`.

- [ ] **Step 6: `bun run check` and `bun run test`. Commit.**

```bash
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(romhacks): upload page with presign → PUT → finalize flow"
```

---

### Task 10: End-to-end happy path test (server-side)

**File:** Create `src/routes/upload/romhack/e2e.test.ts`.

This stitches the foundation pieces together server-side using mocked R2: presign → ("PUT" — i.e. nothing happens, mocked HEAD will succeed) → finalize → list → detail. No browser involved.

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
  const c = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Author', email: 'a@x.com' });
});

describe('romhack upload happy path', () => {
  it('drafts, finalizes, lists, fetches detail', async () => {
    const presign = (await import('../../api/uploads/presign/+server')).POST;
    const finalize = (await import('../../api/uploads/finalize/+server')).POST;
    const { listRomhacks, getRomhackBySlug } = await import('$lib/server/listings');

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
      type: 'romhack',
      input: {
        title: 'E2E', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English',
        release: '1.0.0'
      },
      files: [{ filename: 'p.ips', contentType: 'application/octet-stream', size: 100 }]
    }));
    const presignJson = await presignRes.json();

    const finalizeRes = await finalize(evt({
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

    const list = await listRomhacks(db, {});
    expect(list.some((r) => r.title === 'E2E')).toBe(true);

    const detail = await getRomhackBySlug(db, presignJson.slug);
    expect(detail).not.toBeNull();
    expect(detail!.files).toHaveLength(1);
    expect(detail!.listing.status).toBe('published');
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
bun run test
bun run check
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "test(romhacks): server-side happy-path: presign → finalize → list → detail"
```

---

### Task 11: Wire home page recents, final wrap

**Files:** Modify `src/routes/+page.server.ts` (create if missing), `src/routes/+page.svelte`.

- [ ] **Step 1: Server load — `src/routes/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { listRomhacks } from '$lib/server/listings';

export const load: PageServerLoad = async () => {
  const recent = await listRomhacks(db, { limit: 6 });
  return { recent };
};
```

- [ ] **Step 2: Append a "Recent romhacks" section to `src/routes/+page.svelte`**

Below the existing hero/empty-state, before the closing of the file:

```svelte
<section class="mx-auto max-w-6xl px-4 pb-16">
  <div class="flex items-end justify-between mb-4">
    <h2 class="font-display text-xl">Recent romhacks</h2>
    <a href="/romhacks" class="text-sm underline">Browse all</a>
  </div>
  {#if data.recent.length === 0}
    <p class="text-sm text-muted-foreground">No listings yet. Sign in and upload the first one.</p>
  {:else}
    {#await import('$lib/components/listings/RomhackCard.svelte') then mod}
      {@const RomhackCard = mod.default}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.recent as item}
          <RomhackCard {item} />
        {/each}
      </div>
    {/await}
  {/if}
</section>
```

(If you'd rather avoid the `await import` pattern, put the static import at the top of the script.)

Replace the existing static "No listings yet…" paragraph with the section above (delete the old empty-state to avoid duplication).

- [ ] **Step 3: Add `data` prop to `<script>`**

Top of `+page.svelte`:

```svelte
<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  let { data } = $props();
</script>
```

- [ ] **Step 4: Final check + tag + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=jmynes@local -c user.name=jmynes commit -m "feat(home): show recent romhacks on landing page"
git tag romhacks-vertical-complete
```

---

## Self-review

**Spec coverage:**

- Romhack list with filters → Tasks 4, 7 ✓
- Romhack detail → Tasks 4, 8 ✓
- Authenticated upload via presigned PUT → Tasks 3, 5, 6, 9 ✓
- Download counter wired through `/api/downloads/[fileId]` → Task 8 ✓
- Server-side happy-path test → Task 10 ✓
- Home page recents → Task 11 ✓
- Sprite/Sound/Script verticals — **deferred to Plan 3** (intentional)
- Profiles, versioning UI, search/FTS, moderation — **deferred to Plan 4**

**Placeholders:** none. The Plan 3 / Plan 4 deferrals are explicit.

**Type consistency:** `RomhackCreateInput`, `PresignedFile`, `RomhackListItem`, `RomhackDetail`, `PersistedFile` are defined once in `src/lib/server/listings.ts` and `src/lib/server/uploads.ts` and reused. `listingType` enum reused from schema. `ASSET_PERMISSION`, `SUPPORTED_BASE_ROM` enums reused from `zod-helpers`.

**Sequencing:** Tasks 1–4 build pure logic with tests. Tasks 5–6 wire endpoints. Tasks 7–9 build UI. Task 10 verifies the seam. Task 11 polishes the home page. Each task is committable on its own.

---

## What this plan does NOT cover (intentional)

- Sprites/Sounds/Scripts upload + browse (Plan 3, which also replaces the simplified Sprite schema with the full SpriteVariant union).
- User profiles (`/u/[username]`, `/me`), versioning UI (re-upload + changelog timeline), faceted/FTS search, moderation flag form + admin queue (Plan 4).
- Per-user upload quota enforcement beyond the per-listing size cap. (Add when needed.)
- OG metadata, sitemap, structured data.

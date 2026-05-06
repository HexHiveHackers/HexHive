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

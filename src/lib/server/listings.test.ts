import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import {
  createListingDraft,
  createRomhackDraft,
  finalizeListing,
  finalizeRomhack,
  getAssetHiveBySlug,
  getRomhackBySlug,
  listAssetHives,
  listRomhacks,
  type RomhackCreateInput,
} from './listings';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Author', email: 'a@x.com', isPlaceholder: true });
  await db.insert(schema.profile).values({
    userId: 'u1',
    username: 'alice',
    homepageUrl: 'https://example.com/me',
  });
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
  trailer: [],
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
      files: [{ r2Key: 'k', filename: 'k.ips', originalFilename: 'patch.ips', size: 100, hash: null }],
    });

    const got = await getRomhackBySlug(db, 'kaizo-emerald');
    expect(got).not.toBeNull();
    expect(got?.listing.status).toBe('published');
    expect(got?.files).toHaveLength(1);
    expect(got?.meta.baseRom).toBe('Emerald');
    expect(got?.authorUsername).toBe('alice');
    expect(got?.authorIsPlaceholder).toBe(true);
    expect(got?.authorHomepageUrl).toBe('https://example.com/me');
  });

  it('lists only published romhacks', async () => {
    const a = await createRomhackDraft(db, { authorId: 'u1', input: { ...sampleInput(), title: 'Pub' } });
    await finalizeRomhack(db, {
      listingId: a.listingId,
      versionId: a.versionId,
      files: [{ r2Key: 'k2', filename: 'k.ips', originalFilename: 'a.ips', size: 1, hash: null }],
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
      input: { ...sampleInput(), title: 'FR Hack', baseRom: 'Fire Red' },
    });
    await finalizeRomhack(db, {
      listingId: a.listingId,
      versionId: a.versionId,
      files: [{ r2Key: 'k3', filename: 'k.ips', originalFilename: 'a.ips', size: 1, hash: null }],
    });

    const fr = await listRomhacks(db, { baseRom: 'Fire Red' });
    expect(fr.every((r) => r.baseRom === 'Fire Red')).toBe(true);
    expect(fr.some((r) => r.title === 'FR Hack')).toBe(true);
  });
});

describe('createListingDraft for asset-hive types', () => {
  it('drafts a sprite with category', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sprite',
        input: {
          title: 'Sprite Pack',
          description: '',
          permissions: ['Free'],
          targetedRoms: ['Emerald'],
          category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
        },
      },
    });
    expect(draft.slug).toBe('sprite-pack');
  });

  it('drafts a sound', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sound',
        input: {
          title: 'Cry Pack',
          description: '',
          permissions: ['Free'],
          targetedRoms: ['Emerald'],
          category: 'Cry',
        },
      },
    });
    expect(draft.slug).toBe('cry-pack');
  });

  it('drafts a script', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'script',
        input: {
          title: 'Engine Mod',
          description: '',
          permissions: ['Credit'],
          targetedRoms: ['Fire Red'],
          categories: ['Feature'],
          features: ['Engine'],
          prerequisites: [],
          targetedVersions: ['v1.0'],
          tools: ['HMA Script'],
        },
      },
    });
    expect(draft.slug).toBe('engine-mod');
  });
});

describe('asset-hive list/detail', () => {
  it('lists and fetches a sound', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sound',
        input: {
          title: 'Snd',
          description: '',
          permissions: ['Free'],
          targetedRoms: ['Emerald'],
          category: 'SFX',
        },
      },
    });
    await finalizeListing(db, {
      type: 'sound',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'sk', filename: 'a.wav', originalFilename: 'a.wav', size: 42, hash: null }],
    });
    const list = await listAssetHives(db, 'sound', {});
    expect(list.some((r) => r.slug === draft.slug && r.fileCount === 1 && r.totalSize === 42)).toBe(true);

    const detail = await getAssetHiveBySlug(db, 'sound', draft.slug);
    expect(detail?.meta.kind).toBe('sound');
    if (detail?.meta.kind === 'sound') expect(detail.meta.data.category).toBe('SFX');
    expect(detail?.authorUsername).toBe('alice');
    expect(detail?.authorIsPlaceholder).toBe(true);
    expect(detail?.authorHomepageUrl).toBe('https://example.com/me');
  });
});

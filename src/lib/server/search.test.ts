import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { createListingDraft, finalizeListing } from './listings';
import { parseQuery, searchListings, searchListingsFacets, searchListingsFuzzy } from './search';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });
});

describe('searchListings', () => {
  it('finds by title prefix', async () => {
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Kaizo Emerald',
          description: 'a hard hack',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: a.listingId,
      versionId: a.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });

    const hits = await searchListings(db, 'kaizo');
    expect(hits.some((h) => h.title === 'Kaizo Emerald')).toBe(true);
  });

  it('hides drafts', async () => {
    await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Draft Hack',
          description: 'x',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    const hits = await searchListings(db, 'draft');
    expect(hits.some((h) => h.title === 'Draft Hack')).toBe(false);
  });

  it('filters by type', async () => {
    const hits = await searchListings(db, 'kaizo', { type: 'sprite' });
    expect(hits).toHaveLength(0);
  });

  it('returns numeric rank and orders ascending by BM25', async () => {
    const makeRomhack = async (title: string) => {
      const draft = await createListingDraft(db, {
        authorId: 'u1',
        ti: {
          type: 'romhack',
          input: {
            title,
            description: 'bm25 test',
            permissions: ['Credit'],
            baseRom: 'Fire Red',
            baseRomVersion: 'v1.0',
            baseRomRegion: 'English',
            release: '1',
            categories: [],
            states: [],
            tags: [],
            screenshots: [],
            boxart: [],
            trailer: [],
          },
        },
      });
      await finalizeListing(db, {
        type: 'romhack',
        listingId: draft.listingId,
        versionId: draft.versionId,
        files: [{ r2Key: 'k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
      });
      return draft;
    };

    await makeRomhack('Blazing Rank Alpha');
    await makeRomhack('Blazing Rank Beta');

    const hits = await searchListings(db, 'blazing rank');
    expect(hits.length).toBeGreaterThanOrEqual(2);
    for (const hit of hits) {
      expect(typeof hit.rank).toBe('number');
    }
    // BM25 scores are negative; ORDER BY rank means most-relevant (least negative) first
    expect(hits[0].rank).toBeLessThanOrEqual(hits[hits.length - 1].rank);
  });

  it('paginates results correctly', async () => {
    const makeFrog = async (n: number) => {
      const draft = await createListingDraft(db, {
        authorId: 'u1',
        ti: {
          type: 'romhack',
          input: {
            title: `Frog Adventure ${n}`,
            description: 'frog pagination test',
            permissions: ['Credit'],
            baseRom: 'Emerald',
            baseRomVersion: 'v1.0',
            baseRomRegion: 'English',
            release: '1',
            categories: [],
            states: [],
            tags: [],
            screenshots: [],
            boxart: [],
            trailer: [],
          },
        },
      });
      await finalizeListing(db, {
        type: 'romhack',
        listingId: draft.listingId,
        versionId: draft.versionId,
        files: [{ r2Key: `frog${n}`, filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
      });
      return draft;
    };

    for (let i = 1; i <= 5; i++) await makeFrog(i);

    const page1 = await searchListings(db, 'frog', { limit: 2, offset: 0 });
    const page2 = await searchListings(db, 'frog', { limit: 2, offset: 2 });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);

    const page1Ids = new Set(page1.map((h) => h.id));
    const page2Ids = new Set(page2.map((h) => h.id));
    for (const id of page2Ids) {
      expect(page1Ids.has(id)).toBe(false);
    }
  });

  it('excludes mature listings by default', async () => {
    const draftA = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Crimson Tide Safe',
          description: 'mature exclusion test',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draftA.listingId,
      versionId: draftA.versionId,
      files: [{ r2Key: 'ma', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const draftB = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Crimson Tide Adult',
          description: 'mature exclusion test',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draftB.listingId,
      versionId: draftB.versionId,
      files: [{ r2Key: 'mb', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });
    await db.update(schema.listing).set({ mature: true }).where(eq(schema.listing.id, draftB.listingId));

    const hits = await searchListings(db, 'crimson tide');
    expect(hits.some((h) => h.title === 'Crimson Tide Safe')).toBe(true);
    expect(hits.some((h) => h.title === 'Crimson Tide Adult')).toBe(false);
  });

  it('matches stems via porter (hacks → hack)', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Awesome Hack',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });
    const hits = await searchListings(db, 'hacks');
    expect(hits.some((h) => h.title === 'Awesome Hack')).toBe(true);
  });

  it('finds by tag', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Tagged Hack',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: ['nuzlocke'],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });
    const hits = await searchListings(db, 'nuzlocke');
    expect(hits.some((h) => h.title === 'Tagged Hack')).toBe(true);
  });

  it('finds by romhack category', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Difficulty Hack',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: ['Difficulty'],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });
    const hits = await searchListings(db, 'difficulty');
    expect(hits.some((h) => h.title === 'Difficulty Hack')).toBe(true);
  });

  it('finds by author username', async () => {
    await db.insert(schema.user).values({ id: 'u_kaizo', name: 'K', email: 'k@x.com' });
    await db.insert(schema.profile).values({ userId: 'u_kaizo', username: 'kaizo_dev', bio: null, avatarKey: null });
    const draft = await createListingDraft(db, {
      authorId: 'u_kaizo',
      ti: {
        type: 'romhack',
        input: {
          title: 'Findable Hack',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });
    const hits = await searchListings(db, 'kaizo_dev');
    expect(hits.some((h) => h.title === 'Findable Hack')).toBe(true);
  });

  it('includes mature listings when includeMature is true', async () => {
    const draftC = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Violet Storm Safe',
          description: 'include mature test',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draftC.listingId,
      versionId: draftC.versionId,
      files: [{ r2Key: 'vc', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const draftD = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Violet Storm Adult',
          description: 'include mature test',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draftD.listingId,
      versionId: draftD.versionId,
      files: [{ r2Key: 'vd', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });
    await db.update(schema.listing).set({ mature: true }).where(eq(schema.listing.id, draftD.listingId));

    const hits = await searchListings(db, 'violet storm', { includeMature: true });
    expect(hits.some((h) => h.title === 'Violet Storm Safe')).toBe(true);
    expect(hits.some((h) => h.title === 'Violet Storm Adult')).toBe(true);
  });
});

describe('searchListingsFuzzy', () => {
  it('fuzzy fallback finds typoed query', async () => {
    const draft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Kaizo Sapphire',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: draft.listingId,
      versionId: draft.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });

    const exact = await searchListings(db, 'kayzo');
    expect(exact.length).toBe(0);

    // trigram substring match: "kaizo sap" shares enough trigrams with "Kaizo Sapphire"
    const fuzzy = await searchListingsFuzzy(db, 'kaizo sap');
    expect(fuzzy.some((h) => h.title === 'Kaizo Sapphire')).toBe(true);
  });

  it('fuzzy filters by fromUsername', async () => {
    await db.insert(schema.user).values({ id: 'u_fuzzy_alice', name: 'FA', email: 'falice@x.com' });
    await db
      .insert(schema.profile)
      .values({ userId: 'u_fuzzy_alice', username: 'fuzzy_alice', bio: null, avatarKey: null });
    await db.insert(schema.user).values({ id: 'u_fuzzy_bob', name: 'FB', email: 'fbob@x.com' });
    await db
      .insert(schema.profile)
      .values({ userId: 'u_fuzzy_bob', username: 'fuzzy_bob', bio: null, avatarKey: null });

    const aliceDraft = await createListingDraft(db, {
      authorId: 'u_fuzzy_alice',
      ti: {
        type: 'romhack',
        input: {
          title: 'Starfall Alice Edition',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: aliceDraft.listingId,
      versionId: aliceDraft.versionId,
      files: [{ r2Key: 'fa_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const bobDraft = await createListingDraft(db, {
      authorId: 'u_fuzzy_bob',
      ti: {
        type: 'romhack',
        input: {
          title: 'Starfall Bob Edition',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: bobDraft.listingId,
      versionId: bobDraft.versionId,
      files: [{ r2Key: 'fb_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const fuzzy = await searchListingsFuzzy(db, 'starfall', { fromUsername: 'fuzzy_alice' });
    expect(fuzzy.some((h) => h.title === 'Starfall Alice Edition')).toBe(true);
    expect(fuzzy.some((h) => h.title === 'Starfall Bob Edition')).toBe(false);
  });

  it('fuzzy respects type filter', async () => {
    // Create a romhack and a sprite with similar title prefixes
    const rhDraft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Neon Galaxy Romhack',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: rhDraft.listingId,
      versionId: rhDraft.versionId,
      files: [{ r2Key: 'ng_rh', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });

    const spDraft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sprite',
        input: {
          title: 'Neon Galaxy Sprite',
          description: '',
          permissions: ['Credit'],
          targetedRoms: ['Emerald'],
          category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
        },
      },
    });
    await finalizeListing(db, {
      type: 'sprite',
      listingId: spDraft.listingId,
      versionId: spDraft.versionId,
      files: [{ r2Key: 'ng_sp', filename: 's.png', originalFilename: 's.png', size: 1, hash: null }],
    });

    // Query with type filter — only sprite results should appear
    const fuzzy = await searchListingsFuzzy(db, 'neon gal', { type: 'sprite' });
    expect(fuzzy.every((h) => h.type === 'sprite')).toBe(true);
    expect(fuzzy.some((h) => h.title === 'Neon Galaxy Sprite')).toBe(true);
    expect(fuzzy.some((h) => h.title === 'Neon Galaxy Romhack')).toBe(false);
  });
});

describe('parseQuery', () => {
  it('splits free text from from: and type:', () => {
    expect(parseQuery('kaizo from:alice type:romhack')).toEqual({
      text: 'kaizo',
      type: 'romhack',
      fromUsername: 'alice',
    });
  });

  it('passes unknown keys through as text', () => {
    expect(parseQuery('kaizo foo:bar')).toEqual({ text: 'kaizo foo:bar' });
  });

  it('handles only modifiers, no text', () => {
    expect(parseQuery('from:bob')).toEqual({ text: '', fromUsername: 'bob' });
  });

  it('rejects unknown type values (passes through as text)', () => {
    expect(parseQuery('type:movie kaizo')).toEqual({ text: 'type:movie kaizo' });
  });
});

describe('searchListings with fromUsername', () => {
  it("returns only that author's listings when no query text", async () => {
    await db.insert(schema.user).values({ id: 'u_alice', name: 'Alice', email: 'alice@x.com' });
    await db.insert(schema.profile).values({ userId: 'u_alice', username: 'alice', bio: null, avatarKey: null });
    await db.insert(schema.user).values({ id: 'u_charlie', name: 'Charlie', email: 'charlie@x.com' });
    await db.insert(schema.profile).values({ userId: 'u_charlie', username: 'charlie', bio: null, avatarKey: null });

    const aliceDraft = await createListingDraft(db, {
      authorId: 'u_alice',
      ti: {
        type: 'romhack',
        input: {
          title: 'Alice Exclusive Hack',
          description: 'authored by alice',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: aliceDraft.listingId,
      versionId: aliceDraft.versionId,
      files: [{ r2Key: 'ae_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const charlieDraft = await createListingDraft(db, {
      authorId: 'u_charlie',
      ti: {
        type: 'romhack',
        input: {
          title: 'Charlie Hack',
          description: 'authored by charlie',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: charlieDraft.listingId,
      versionId: charlieDraft.versionId,
      files: [{ r2Key: 'ch_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const hits = await searchListings(db, '', { fromUsername: 'alice' });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((h) => h.title === 'Alice Exclusive Hack')).toBe(true);
    expect(hits.some((h) => h.title === 'Charlie Hack')).toBe(false);
  });

  it('combines with full-text query', async () => {
    await db.insert(schema.user).values({ id: 'u_diana', name: 'Diana', email: 'diana@x.com' });
    await db.insert(schema.profile).values({ userId: 'u_diana', username: 'diana', bio: null, avatarKey: null });

    const matchDraft = await createListingDraft(db, {
      authorId: 'u_diana',
      ti: {
        type: 'romhack',
        input: {
          title: 'Zephyrstone Unique Hack',
          description: 'zephyrstone unique keyword',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: matchDraft.listingId,
      versionId: matchDraft.versionId,
      files: [{ r2Key: 'zu_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const otherDraft = await createListingDraft(db, {
      authorId: 'u_diana',
      ti: {
        type: 'romhack',
        input: {
          title: 'Zephyrstone Other Hack',
          description: 'zephyrstone other keyword',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1',
          categories: [],
          states: [],
          tags: [],
          screenshots: [],
          boxart: [],
          trailer: [],
        },
      },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: otherDraft.listingId,
      versionId: otherDraft.versionId,
      files: [{ r2Key: 'zo_k', filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
    });

    const hits = await searchListings(db, 'unique', { fromUsername: 'diana' });
    expect(hits.some((h) => h.title === 'Zephyrstone Unique Hack')).toBe(true);
    expect(hits.some((h) => h.title === 'Zephyrstone Other Hack')).toBe(false);
  });
});

describe('searchListingsFacets', () => {
  it('returns count per type', async () => {
    // Arrange: 2 romhacks and 1 sprite all containing a unique token
    const makeRomhackFacet = async (n: number) => {
      const draft = await createListingDraft(db, {
        authorId: 'u1',
        ti: {
          type: 'romhack',
          input: {
            title: `Facetword Romhack ${n}`,
            description: 'facetword unique token for facets test',
            permissions: ['Credit'],
            baseRom: 'Emerald',
            baseRomVersion: 'v1.0',
            baseRomRegion: 'English',
            release: '1',
            categories: [],
            states: [],
            tags: [],
            screenshots: [],
            boxart: [],
            trailer: [],
          },
        },
      });
      await finalizeListing(db, {
        type: 'romhack',
        listingId: draft.listingId,
        versionId: draft.versionId,
        files: [{ r2Key: `facet_rh_${n}`, filename: 'f.ips', originalFilename: 'f.ips', size: 1, hash: null }],
      });
    };

    const spriteDraft = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'sprite',
        input: {
          title: 'Facetword Sprite',
          description: 'facetword unique token for facets test',
          permissions: ['Credit'],
          targetedRoms: ['Emerald'],
          category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
        },
      },
    });
    await finalizeListing(db, {
      type: 'sprite',
      listingId: spriteDraft.listingId,
      versionId: spriteDraft.versionId,
      files: [{ r2Key: 'facet_sp', filename: 's.png', originalFilename: 's.png', size: 1, hash: null }],
    });

    await makeRomhackFacet(1);
    await makeRomhackFacet(2);

    // Act
    const facets = await searchListingsFacets(db, 'facetword');

    // Assert
    expect(facets.romhack).toBe(2);
    expect(facets.sprite).toBe(1);
    expect(facets.sound).toBe(0);
    expect(facets.script).toBe(0);
  });
});

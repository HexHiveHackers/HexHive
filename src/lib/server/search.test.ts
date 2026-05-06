import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { createListingDraft, finalizeListing } from './listings';
import { searchListings } from './search';

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
});

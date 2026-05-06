import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { createListingDraft, finalizeListing } from './listings';
import { createNextVersion, listVersionsForListing } from './versions';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });
});

describe('versions', () => {
  it('creates a new version and flips is_current', async () => {
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: {
        type: 'romhack',
        input: {
          title: 'Vh',
          description: '',
          permissions: ['Credit'],
          baseRom: 'Emerald',
          baseRomVersion: 'v1.0',
          baseRomRegion: 'English',
          release: '1.0.0',
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
      files: [{ r2Key: 'k1', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }],
    });

    const next = await createNextVersion(db, {
      listingId: a.listingId,
      version: '1.1.0',
      changelog: 'fixed two bugs',
    });
    expect(next.id).toBeTruthy();

    const versions = await listVersionsForListing(db, a.listingId);
    expect(versions).toHaveLength(2);
    expect(versions.find((v) => v.version === '1.1.0')?.isCurrent).toBe(true);
    expect(versions.find((v) => v.version === '1.0.0')?.isCurrent).toBe(false);
  });
});

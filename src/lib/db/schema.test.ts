import { describe, expect, it, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
});

describe('schema roundtrip', () => {
  it('inserts and reads a romhack listing with version + file', async () => {
    await db.insert(schema.user).values({
      id: 'u1', name: 'Tester', email: 't@example.com'
    });
    await db.insert(schema.listing).values({
      id: 'l1', type: 'romhack', slug: 'kaizo-emerald',
      authorId: 'u1', title: 'Kaizo Emerald', description: '', status: 'published'
    });
    await db.insert(schema.romhackMeta).values({
      listingId: 'l1', baseRom: 'Emerald', baseRomVersion: 'v1.0',
      baseRomRegion: 'English', release: '1.0.0'
    });
    await db.insert(schema.listingVersion).values({
      id: 'v1', listingId: 'l1', version: '1.0.0', isCurrent: true
    });
    await db.insert(schema.listingFile).values({
      id: 'f1', versionId: 'v1', r2Key: 'a/b.ips',
      filename: 'b.ips', originalFilename: 'kaizo.ips', size: 1234
    });

    const rows = await db.select().from(schema.listing).where(eq(schema.listing.id, 'l1'));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('romhack');
  });

  it('rejects duplicate (type, slug)', async () => {
    await db.insert(schema.user).values({ id: 'u2', name: 'B', email: 'b@x.com' });
    await db.insert(schema.listing).values({
      id: 'l2', type: 'sprite', slug: 'shared', authorId: 'u2', title: 'a'
    });
    await expect(
      db.insert(schema.listing).values({
        id: 'l3', type: 'sprite', slug: 'shared', authorId: 'u2', title: 'b'
      })
    ).rejects.toThrow();
  });
});

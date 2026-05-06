import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '$lib/db/schema';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(),
  presignGet: vi.fn(async (k: string) => `https://get.example/${k}`),
  headObject: vi.fn(),
}));

let db: ReturnType<typeof drizzle<typeof schema>>;
vi.mock('$lib/db', () => ({
  get db() {
    return db;
  },
}));

beforeAll(async () => {
  const c = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });
  await db.insert(schema.listing).values({
    id: 'L1',
    type: 'romhack',
    slug: 's',
    authorId: 'u1',
    title: 't',
    status: 'published',
  });
  await db.insert(schema.listingVersion).values({
    id: 'V1',
    listingId: 'L1',
    version: '1.0',
    isCurrent: true,
  });
  await db.insert(schema.listingFile).values({
    id: 'F1',
    versionId: 'V1',
    r2Key: 'k1',
    filename: 'a.ips',
    originalFilename: 'a.ips',
    size: 1,
  });
});

describe('GET /api/downloads/[fileId]', () => {
  it('404s when file not found', async () => {
    const { GET } = await import('./+server');
    await expect(GET({ params: { fileId: 'nope' } } as any)).rejects.toMatchObject({ status: 404 });
  });

  it('redirects to signed R2 URL and increments counter', async () => {
    const { GET } = await import('./+server');
    await expect(GET({ params: { fileId: 'F1' } } as any)).rejects.toMatchObject({
      status: 303,
      location: 'https://get.example/k1',
    });

    const { eq } = await import('drizzle-orm');
    const rows = await db.select().from(schema.listing).where(eq(schema.listing.id, 'L1'));
    expect(rows[0].downloads).toBe(1);
  });
});

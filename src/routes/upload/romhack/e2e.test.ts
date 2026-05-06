import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '$lib/db/schema';
import { buildEvent } from '../../../../tests/event';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (k: string) => `https://put.example/${k}`),
  presignGet: vi.fn(async (k: string) => `https://get.example/${k}`),
  headObject: vi.fn(async () => ({})),
}));

let db: ReturnType<typeof drizzle<typeof schema>>;
vi.mock('$lib/db', () => ({
  get db() {
    return db;
  },
}));

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Author', email: 'a@x.com' });
});

describe('romhack upload happy path', () => {
  it('drafts, finalizes, lists, fetches detail', async () => {
    const { _handlePresign } = await import('../../api/uploads/presign/+server');
    const { _handleFinalize } = await import('../../api/uploads/finalize/+server');
    const { listRomhacks, getRomhackBySlug } = await import('$lib/server/listings');

    const presignRes = await _handlePresign(
      buildEvent({
        body: {
          type: 'romhack',
          input: {
            title: 'E2E',
            permissions: ['Credit'],
            baseRom: 'Emerald',
            baseRomVersion: 'v1.0',
            baseRomRegion: 'English',
            release: '1.0.0',
          },
          files: [{ filename: 'p.ips', contentType: 'application/octet-stream', size: 100 }],
        },
      }),
    );
    const presignJson = await presignRes.json();

    const finalizeRes = await _handleFinalize(
      buildEvent({
        body: {
          listingId: presignJson.listingId,
          versionId: presignJson.versionId,
          files: [
            {
              r2Key: presignJson.uploads[0].r2Key,
              filename: presignJson.uploads[0].filename,
              originalFilename: presignJson.uploads[0].originalFilename,
              size: presignJson.uploads[0].size,
            },
          ],
        },
      }),
    );
    expect(finalizeRes.status).toBe(200);

    const list = await listRomhacks(db, {});
    expect(list.some((r) => r.title === 'E2E')).toBe(true);

    const detail = await getRomhackBySlug(db, presignJson.slug);
    if (!detail) throw new Error('detail missing');
    expect(detail.files).toHaveLength(1);
    expect(detail.listing.status).toBe('published');
  });
});

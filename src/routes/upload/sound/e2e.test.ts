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
        title: 'E2E Sound', description: '', permissions: ['Free'],
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

import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '$lib/db/schema';

const deleted: string[] = [];
vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async () => 'https://put.example/x'),
  presignGet: vi.fn(async () => 'https://get.example/x'),
  headObject: vi.fn(async () => ({})),
  deleteObject: vi.fn(async (key: string) => {
    deleted.push(key);
  }),
}));

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
});

describe('deleteAccount', () => {
  it('removes the user, their listings, files, and avatar; calls deleteObject for each R2 key', async () => {
    // arrange: a user with a profile (avatar), a published romhack with one file
    await db.insert(schema.user).values({ id: 'doomed', name: 'D', email: 'd@x.com' });
    await db.insert(schema.profile).values({
      userId: 'doomed',
      username: 'doomed_dev',
      bio: null,
      avatarKey: 'avatars/doomed/abc.png',
    });
    const { createListingDraft, finalizeListing } = await import('./listings');
    const draft = await createListingDraft(db, {
      authorId: 'doomed',
      ti: {
        type: 'romhack',
        input: {
          title: 'Doomed Hack',
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
      files: [
        {
          r2Key: 'doomed/v1/file.ips',
          filename: 'file.ips',
          originalFilename: 'patch.ips',
          size: 1,
          hash: null,
        },
      ],
    });

    // act
    const { deleteAccount } = await import('./account');
    const result = await deleteAccount(db, 'doomed');

    // assert
    expect(result.filesDeleted).toBe(2);
    expect(deleted).toEqual(expect.arrayContaining(['avatars/doomed/abc.png', 'doomed/v1/file.ips']));

    const userRows = await db.select().from(schema.user).where(eq(schema.user.id, 'doomed'));
    expect(userRows).toHaveLength(0);

    const profileRows = await db.select().from(schema.profile).where(eq(schema.profile.userId, 'doomed'));
    expect(profileRows).toHaveLength(0);

    const listingRows = await db.select().from(schema.listing).where(eq(schema.listing.id, draft.listingId));
    expect(listingRows).toHaveLength(0);

    const fileRowsAfter = await db
      .select()
      .from(schema.listingFile)
      .where(eq(schema.listingFile.versionId, draft.versionId));
    expect(fileRowsAfter).toHaveLength(0);
  });
});

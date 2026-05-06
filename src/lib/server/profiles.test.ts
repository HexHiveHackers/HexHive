import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { getOrCreateProfile, getProfileByUsername, listingsByUser, setBio, setUsername } from './profiles';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Alice', email: 'a@x.com' });
  await db.insert(schema.user).values({ id: 'u2', name: 'Bob', email: 'b@x.com' });
});

describe('profiles', () => {
  it('creates a profile with no username if missing', async () => {
    const p = await getOrCreateProfile(db, 'u1');
    expect(p.userId).toBe('u1');
    expect(p.username).toBe('');
  });

  it('setUsername enforces case-insensitive uniqueness', async () => {
    await setUsername(db, 'u1', 'Alice');
    await expect(setUsername(db, 'u2', 'alice')).rejects.toThrow(/taken/i);
  });

  it('setUsername updates the row', async () => {
    await setUsername(db, 'u2', 'bob_42');
    const p = await getProfileByUsername(db, 'bob_42');
    expect(p?.userId).toBe('u2');
  });

  it('setBio persists', async () => {
    await setBio(db, 'u1', 'hello world');
    const p = await getOrCreateProfile(db, 'u1');
    expect(p.bio).toBe('hello world');
  });

  it('listingsByUser includes drafts only when self=true', async () => {
    const { createListingDraft, finalizeListing } = await import('./listings');
    const baseRomhack = {
      description: '',
      permissions: ['Credit' as const],
      baseRom: 'Emerald' as const,
      baseRomVersion: 'v1.0' as const,
      baseRomRegion: 'English' as const,
      release: '1',
      categories: [],
      states: [],
      tags: [],
      screenshots: [],
      boxart: [],
      trailer: [],
    };
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: { title: 'Pub', ...baseRomhack } },
    });
    await finalizeListing(db, {
      type: 'romhack',
      listingId: a.listingId,
      versionId: a.versionId,
      files: [{ r2Key: 'x', filename: 'a.ips', originalFilename: 'a.ips', size: 1, hash: null }],
    });
    await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: { title: 'Draft', ...baseRomhack } },
    });

    const publicView = await listingsByUser(db, 'u1', { self: false });
    expect(publicView.map((l) => l.title).sort()).toEqual(['Pub']);

    const selfView = await listingsByUser(db, 'u1', { self: true });
    expect(selfView.map((l) => l.title).sort()).toEqual(['Draft', 'Pub']);
  });
});

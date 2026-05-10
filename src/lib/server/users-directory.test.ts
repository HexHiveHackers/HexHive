import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { enrichDirectoryUsers } from './users-directory';

const client = createClient({ url: ':memory:' });
const db = drizzle(client, { schema });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values([
    { id: 'u1', name: 'Alex', email: 'a@x', emailVerified: true },
    { id: 'u2', name: 'Bea', email: 'b@x', emailVerified: true, isAdmin: true },
  ]);
  await db.insert(schema.profile).values([
    { userId: 'u1', username: 'alex', alias: 'Alex', bio: 'spriter', avatarKey: 'avatars/u1.png' },
    { userId: 'u2', username: 'bea', alias: null, bio: null },
  ]);
  await db.insert(schema.affiliation).values([{ id: 'aff1', name: 'Team Aqua' }]);
  await db.insert(schema.profileAffiliation).values([{ userId: 'u1', affiliationId: 'aff1', role: 'lead spriter' }]);
  await db.insert(schema.aliasEntry).values([{ id: 'ak1', userId: 'u1', value: 'skeetendo' }]);
  await db.insert(schema.profileLink).values([{ id: 'pl1', userId: 'u1', url: 'https://example.com', sortOrder: 0 }]);
  await db.insert(schema.listing).values([
    { id: 'l1', type: 'sprite', slug: 's1', authorId: 'u1', title: 'A', downloads: 100, status: 'published' },
    { id: 'l2', type: 'sprite', slug: 's2', authorId: 'u1', title: 'B', downloads: 50, status: 'published' },
    { id: 'l3', type: 'romhack', slug: 'r1', authorId: 'u1', title: 'C', downloads: 5, status: 'published' },
  ]);
});

describe('enrichDirectoryUsers', () => {
  it('returns one row per profile with derived counts and flags', async () => {
    const rows = await enrichDirectoryUsers(db);
    const alex = rows.find((r) => r.username === 'alex');
    if (!alex) throw new Error('alex not found');
    const bea = rows.find((r) => r.username === 'bea');
    if (!bea) throw new Error('bea not found');

    expect(alex.listingsByType).toEqual({ romhack: 1, sprite: 2, sound: 0, script: 0 });
    expect(alex.totalDownloads).toBe(155);
    expect(alex.hasBio).toBe(true);
    expect(alex.hasAlias).toBe(true);
    expect(alex.hasAvatar).toBe(true);
    expect(alex.hasLinks).toBe(true);
    expect(alex.hasAffiliations).toBe(true);
    expect(alex.affiliations).toEqual([{ name: 'Team Aqua', role: 'lead spriter' }]);
    expect(alex.akas).toEqual(['skeetendo']);
    expect(alex.isAdmin).toBe(false);

    expect(bea.listingsByType).toEqual({ romhack: 0, sprite: 0, sound: 0, script: 0 });
    expect(bea.totalDownloads).toBe(0);
    expect(bea.hasBio).toBe(false);
    expect(bea.hasAlias).toBe(false);
    expect(bea.hasLinks).toBe(false);
    expect(bea.hasAffiliations).toBe(false);
    expect(bea.isAdmin).toBe(true);
  });
});

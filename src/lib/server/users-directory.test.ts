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
    { id: 'u2', name: 'Bea', email: 'b@x', emailVerified: true, isPlaceholder: true, placeholderKind: 'user' },
    { id: 'u3', name: 'Cal', email: 'c@x', emailVerified: true, isAdmin: true },
    {
      id: 'u4',
      name: 'Dan',
      email: 'd@x',
      emailVerified: true,
      isPlaceholder: true,
      placeholderKind: 'contributor',
    },
  ]);
  await db.insert(schema.profile).values([
    {
      userId: 'u1',
      username: 'alex',
      alias: 'Alex',
      bio: 'spriter',
      avatarKey: 'avatars/u1.png',
      pronouns: 'they/them',
    },
    { userId: 'u2', username: 'bea', alias: null, bio: null },
    { userId: 'u3', username: 'cal', alias: null, bio: null },
    { userId: 'u4', username: 'dan', alias: null, bio: null },
  ]);
  await db.insert(schema.affiliation).values([
    { id: 'aff1', name: 'Team Aqua' },
    { id: 'aff2', name: 'Team Aquas Asset Repo' },
  ]);
  await db.insert(schema.profileAffiliation).values([
    { userId: 'u1', affiliationId: 'aff1', role: 'lead spriter' },
    { userId: 'u4', affiliationId: 'aff2', role: null },
  ]);
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
    const cal = rows.find((r) => r.username === 'cal');
    if (!cal) throw new Error('cal not found');

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
    expect(alex.name).toBe('Alex');
    expect(alex.avatarKey).toBe('avatars/u1.png');
    expect(alex.pronouns).toBe('they/them');
    expect(alex.placeholderKind).toBe('contributor');

    expect(bea.listingsByType).toEqual({ romhack: 0, sprite: 0, sound: 0, script: 0 });
    expect(bea.totalDownloads).toBe(0);
    expect(bea.hasBio).toBe(false);
    expect(bea.hasAlias).toBe(false);
    expect(bea.hasLinks).toBe(false);
    expect(bea.hasAffiliations).toBe(false);
    expect(bea.isAdmin).toBe(false);
    expect(bea.isPlaceholder).toBe(true);
    expect(bea.placeholderKind).toBe('user');

    expect(cal.isAdmin).toBe(true);
  });

  it('sets fromTeamAquaRepo correctly based on affiliation membership', async () => {
    const rows = await enrichDirectoryUsers(db);
    const alex = rows.find((r) => r.username === 'alex');
    if (!alex) throw new Error('alex not found');
    const bea = rows.find((r) => r.username === 'bea');
    if (!bea) throw new Error('bea not found');
    const cal = rows.find((r) => r.username === 'cal');
    if (!cal) throw new Error('cal not found');
    const dan = rows.find((r) => r.username === 'dan');
    if (!dan) throw new Error('dan not found');

    expect(dan.fromTeamAquaRepo).toBe(true);
    expect(alex.fromTeamAquaRepo).toBe(false);
    expect(bea.fromTeamAquaRepo).toBe(false);
    expect(cal.fromTeamAquaRepo).toBe(false);
  });
});

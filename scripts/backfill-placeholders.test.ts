import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../src/lib/db/schema';
import { extractCreatorUrl, runPhaseA, slugifyContributor } from './backfill-placeholders';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(async () => {
  const client = createClient({ url: ':memory:' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
});

describe('runPhaseA', () => {
  it('flags seed-aqua-* and seed-contrib-* users as placeholder', async () => {
    await db.insert(schema.user).values([
      { id: 'seed-aqua-archie', name: 'Archie', email: 'archie@team-aqua.seed' },
      { id: 'seed-contrib-coffee_cup', name: 'Coffee Cup', email: 'coffee_cup@team-aqua.seed' },
      { id: 'real-user-1', name: 'Real', email: 'real@example.com' },
    ]);

    await runPhaseA(db);

    const archie = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-aqua-archie'));
    const cc = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-contrib-coffee_cup'));
    const real = await db.select().from(schema.user).where(eq(schema.user.id, 'real-user-1'));

    expect(archie[0].isPlaceholder).toBe(true);
    expect(cc[0].isPlaceholder).toBe(true);
    expect(real[0].isPlaceholder).toBe(false);
  });

  it('is idempotent', async () => {
    await db
      .insert(schema.user)
      .values([{ id: 'seed-aqua-archie', name: 'Archie', email: 'archie@team-aqua.seed', isPlaceholder: true }]);
    await runPhaseA(db);
    const archie = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-aqua-archie'));
    expect(archie[0].isPlaceholder).toBe(true);
  });
});

describe('extractCreatorUrl', () => {
  it('returns the first allowlisted URL from a README', async () => {
    const md = await readFile('scripts/fixtures/contributor-readme-with-link.md', 'utf8');
    expect(extractCreatorUrl(md)).toBe('https://www.pokecommunity.com/members/coffeecup.42');
  });

  it('returns null when only junk URLs are present (Discord invites, image hosts)', async () => {
    const md = await readFile('scripts/fixtures/contributor-readme-junk-only.md', 'utf8');
    expect(extractCreatorUrl(md)).toBeNull();
  });
});

describe('slugifyContributor', () => {
  it('matches the seed-contrib- slug for known folders', () => {
    expect(slugifyContributor('Coffee Cup')).toBe('coffee_cup');
    expect(slugifyContributor('Francis III')).toBe('francis_iii');
    expect(slugifyContributor('Black Fragrant')).toBe('black_fragrant');
  });
});

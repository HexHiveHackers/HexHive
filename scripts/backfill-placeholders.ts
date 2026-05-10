/**
 * Idempotent backfill: marks existing synthetic seed users as placeholder
 * accounts, harvests homepage URLs from a Team-Aqua repo clone, and ensures a
 * placeholder user exists per unique tool author in src/lib/data/tools.ts.
 *
 * Run locally:        bun scripts/backfill-placeholders.ts
 * Against Turso:      DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bun scripts/backfill-placeholders.ts
 * Custom repo path:   REPO=/path/to/Team-Aquas-Asset-Repo bun scripts/backfill-placeholders.ts
 */

import { createClient } from '@libsql/client';
import { like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export async function runPhaseA(db: DB): Promise<{ flagged: number }> {
  const result = await db
    .update(schema.user)
    .set({ isPlaceholder: true })
    .where(or(like(schema.user.id, 'seed-aqua-%'), like(schema.user.id, 'seed-contrib-%')))
    .returning({ id: schema.user.id });
  return { flagged: result.length };
}

async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./local.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  const a = await runPhaseA(db);
  console.log(`Phase A: flagged ${a.flagged} seed users as placeholder.`);
}

if (import.meta.main) {
  await main();
}

import { and, asc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface AliasEntry {
  id: string;
  value: string;
}

export async function listAliasesForUser(db: DB, userId: string): Promise<AliasEntry[]> {
  const rows = await db
    .select({ id: schema.aliasEntry.id, value: schema.aliasEntry.value })
    .from(schema.aliasEntry)
    .where(eq(schema.aliasEntry.userId, userId))
    .orderBy(asc(schema.aliasEntry.createdAt));
  return rows;
}

// Add an AKA. No-op (returns existing row) if the same value already
// exists for this user, case-insensitively.
export async function addAlias(db: DB, userId: string, value: string): Promise<AliasEntry> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Alias is required');
  const existing = await db
    .select({ id: schema.aliasEntry.id, value: schema.aliasEntry.value })
    .from(schema.aliasEntry)
    .where(and(eq(schema.aliasEntry.userId, userId), sql`lower(${schema.aliasEntry.value}) = lower(${trimmed})`))
    .limit(1);
  if (existing[0]) return existing[0];
  const id = newId();
  await db.insert(schema.aliasEntry).values({ id, userId, value: trimmed });
  return { id, value: trimmed };
}

export async function removeAlias(db: DB, userId: string, id: string): Promise<void> {
  await db.delete(schema.aliasEntry).where(and(eq(schema.aliasEntry.userId, userId), eq(schema.aliasEntry.id, id)));
}

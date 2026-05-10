import { and, asc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface UserAffiliation {
  id: string;
  name: string;
  url: string | null;
  role: string | null;
}

export async function listAffiliationsForUser(db: DB, userId: string): Promise<UserAffiliation[]> {
  const rows = await db
    .select({
      id: schema.affiliation.id,
      name: schema.affiliation.name,
      url: schema.affiliation.url,
      role: schema.profileAffiliation.role,
      joinedAt: schema.profileAffiliation.createdAt,
    })
    .from(schema.profileAffiliation)
    .innerJoin(schema.affiliation, eq(schema.affiliation.id, schema.profileAffiliation.affiliationId))
    .where(eq(schema.profileAffiliation.userId, userId))
    .orderBy(asc(schema.profileAffiliation.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, url: r.url, role: r.role }));
}

// Find-or-create the affiliation by case-insensitive name, then attach
// the user with the given role. No-op if the user is already a member;
// updates the role if it changed.
export async function attachAffiliation(
  db: DB,
  userId: string,
  input: { name: string; role: string | null; url: string | null },
): Promise<UserAffiliation> {
  const name = input.name.trim();
  if (!name) throw new Error('Affiliation name is required');
  const role = input.role?.trim() ?? null;
  const url = input.url?.trim() ?? null;

  const existing = await db
    .select()
    .from(schema.affiliation)
    .where(sql`lower(${schema.affiliation.name}) = lower(${name})`)
    .limit(1);

  let affiliationId: string;
  let resolvedName: string;
  let resolvedUrl: string | null;
  if (existing[0]) {
    affiliationId = existing[0].id;
    resolvedName = existing[0].name;
    resolvedUrl = existing[0].url;
    // Backfill URL if we have one and the row didn't.
    if (url && !resolvedUrl) {
      await db.update(schema.affiliation).set({ url }).where(eq(schema.affiliation.id, affiliationId));
      resolvedUrl = url;
    }
  } else {
    affiliationId = newId();
    await db.insert(schema.affiliation).values({ id: affiliationId, name, url: url || null });
    resolvedName = name;
    resolvedUrl = url || null;
  }

  const link = await db
    .select()
    .from(schema.profileAffiliation)
    .where(
      and(eq(schema.profileAffiliation.userId, userId), eq(schema.profileAffiliation.affiliationId, affiliationId)),
    )
    .limit(1);
  if (link[0]) {
    if (link[0].role !== role) {
      await db
        .update(schema.profileAffiliation)
        .set({ role: role || null })
        .where(
          and(eq(schema.profileAffiliation.userId, userId), eq(schema.profileAffiliation.affiliationId, affiliationId)),
        );
    }
  } else {
    await db.insert(schema.profileAffiliation).values({ userId, affiliationId, role: role || null });
  }
  return { id: affiliationId, name: resolvedName, url: resolvedUrl, role: role || null };
}

export async function detachAffiliation(db: DB, userId: string, affiliationId: string): Promise<void> {
  await db
    .delete(schema.profileAffiliation)
    .where(
      and(eq(schema.profileAffiliation.userId, userId), eq(schema.profileAffiliation.affiliationId, affiliationId)),
    );
}

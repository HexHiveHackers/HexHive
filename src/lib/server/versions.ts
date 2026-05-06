import { and, desc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface NewVersionInput {
  listingId: string;
  version: string;
  changelog?: string | null;
}

export async function createNextVersion(db: DB, input: NewVersionInput) {
  await db
    .update(schema.listingVersion)
    .set({ isCurrent: false })
    .where(eq(schema.listingVersion.listingId, input.listingId));

  const id = newId();
  await db.insert(schema.listingVersion).values({
    id,
    listingId: input.listingId,
    version: input.version,
    changelog: input.changelog ?? null,
    isCurrent: true
  });
  return { id };
}

export async function listVersionsForListing(db: DB, listingId: string) {
  return db
    .select()
    .from(schema.listingVersion)
    .where(eq(schema.listingVersion.listingId, listingId))
    .orderBy(desc(schema.listingVersion.createdAt));
}

export async function getListingForAuthor(db: DB, listingId: string, authorId: string) {
  const rows = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.id, listingId), eq(schema.listing.authorId, authorId)))
    .limit(1);
  return rows[0] ?? null;
}

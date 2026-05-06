import { desc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type FlagKind = 'mature' | 'spam' | 'illegal' | 'other';

export async function createFlag(
  db: DB,
  args: { listingId: string; reporterId: string | null; kind: FlagKind; reason?: string | null },
) {
  const id = newId();
  await db.insert(schema.flag).values({
    id,
    listingId: args.listingId,
    reporterId: args.reporterId,
    kind: args.kind,
    reason: args.reason ?? null,
    status: 'open',
  });
  return { id };
}

export async function listOpenFlags(db: DB) {
  return db
    .select({
      id: schema.flag.id,
      kind: schema.flag.kind,
      reason: schema.flag.reason,
      createdAt: schema.flag.createdAt,
      listingId: schema.listing.id,
      listingTitle: schema.listing.title,
      listingType: schema.listing.type,
      listingSlug: schema.listing.slug,
    })
    .from(schema.flag)
    .innerJoin(schema.listing, eq(schema.listing.id, schema.flag.listingId))
    .where(eq(schema.flag.status, 'open'))
    .orderBy(desc(schema.flag.createdAt));
}

export async function dismissFlag(db: DB, flagId: string) {
  await db.update(schema.flag).set({ status: 'dismissed' }).where(eq(schema.flag.id, flagId));
}

export async function actOnFlag(db: DB, args: { flagId: string; action: 'hide' | 'mature' }) {
  const f = (await db.select().from(schema.flag).where(eq(schema.flag.id, args.flagId)).limit(1))[0];
  if (!f) return;
  if (args.action === 'hide') {
    await db.update(schema.listing).set({ status: 'hidden' }).where(eq(schema.listing.id, f.listingId));
  } else {
    await db.update(schema.listing).set({ mature: true }).where(eq(schema.listing.id, f.listingId));
  }
  await db.update(schema.flag).set({ status: 'reviewed' }).where(eq(schema.flag.id, args.flagId));
}

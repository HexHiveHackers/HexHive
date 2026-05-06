import { and, desc, eq, like, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import type { ListingType } from '$lib/db/schema';
import { newId, slugify, uniqueSlug } from '$lib/utils/ids';
import type { RomhackInput } from '$lib/schemas/romhack';
import { writeMeta, type ListingTypedInput } from './meta-writers';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type RomhackCreateInput = RomhackInput;

export interface ListingDraft {
  listingId: string;
  versionId: string;
  slug: string;
}

/** @deprecated Use ListingDraft */
export type RomhackDraft = ListingDraft;

async function nextSlug(db: DB, type: ListingType, candidate: string): Promise<string> {
  return uniqueSlug(candidate, async (s) => {
    const rows = await db
      .select({ id: schema.listing.id })
      .from(schema.listing)
      .where(and(eq(schema.listing.type, type), eq(schema.listing.slug, s)))
      .limit(1);
    return rows.length > 0;
  });
}

export async function createListingDraft(
  db: DB,
  args: { authorId: string; ti: ListingTypedInput }
): Promise<ListingDraft> {
  const { ti } = args;
  const titleSlug = ti.input.slug ?? slugify(ti.input.title);
  const slug = await nextSlug(db, ti.type, titleSlug);

  const listingId = newId();
  const versionId = newId();

  await db.insert(schema.listing).values({
    id: listingId,
    type: ti.type,
    slug,
    authorId: args.authorId,
    title: ti.input.title,
    description: ti.input.description ?? '',
    permissions: ti.input.permissions,
    status: 'draft'
  });
  await writeMeta(db, listingId, ti);

  const versionLabel = ti.type === 'romhack' ? ti.input.release : '1.0';
  await db.insert(schema.listingVersion).values({
    id: versionId,
    listingId,
    version: versionLabel,
    isCurrent: true,
    changelog: null
  });

  return { listingId, versionId, slug };
}

export async function createRomhackDraft(
  db: DB,
  args: { authorId: string; input: RomhackCreateInput }
): Promise<ListingDraft> {
  return createListingDraft(db, { authorId: args.authorId, ti: { type: 'romhack', input: args.input } });
}

export interface PersistedFile {
  r2Key: string;
  filename: string;
  originalFilename: string;
  size: number;
  hash: string | null;
}

export async function finalizeListing(
  db: DB,
  args: {
    type: ListingType;
    listingId: string;
    versionId: string;
    files: PersistedFile[];
  }
): Promise<void> {
  for (const f of args.files) {
    await db.insert(schema.listingFile).values({
      id: newId(),
      versionId: args.versionId,
      r2Key: f.r2Key,
      filename: f.filename,
      originalFilename: f.originalFilename,
      size: f.size,
      hash: f.hash
    });
  }

  if (args.type !== 'romhack') {
    const total = args.files.reduce((s, f) => s + f.size, 0);
    await db
      .update(schema.assetHiveMeta)
      .set({ fileCount: args.files.length, totalSize: total })
      .where(eq(schema.assetHiveMeta.listingId, args.listingId));
  }

  await db
    .update(schema.listing)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(schema.listing.id, args.listingId));
}

export async function finalizeRomhack(
  db: DB,
  args: { listingId: string; versionId: string; files: PersistedFile[] }
): Promise<void> {
  return finalizeListing(db, { type: 'romhack', ...args });
}

export interface RomhackListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  baseRom: string;
  baseRomVersion: string;
  release: string;
  categories: string[];
  downloads: number;
  authorName: string;
  createdAt: Date;
}

export async function listRomhacks(
  db: DB,
  filters: { baseRom?: string; q?: string; limit?: number; offset?: number }
): Promise<RomhackListItem[]> {
  const where = [eq(schema.listing.type, 'romhack'), eq(schema.listing.status, 'published')];
  if (filters.baseRom) where.push(eq(schema.romhackMeta.baseRom, filters.baseRom));
  if (filters.q) where.push(like(schema.listing.title, `%${filters.q}%`));

  const rows = await db
    .select({
      id: schema.listing.id,
      slug: schema.listing.slug,
      title: schema.listing.title,
      description: schema.listing.description,
      baseRom: schema.romhackMeta.baseRom,
      baseRomVersion: schema.romhackMeta.baseRomVersion,
      release: schema.romhackMeta.release,
      categories: schema.romhackMeta.categories,
      downloads: schema.listing.downloads,
      authorName: schema.user.name,
      createdAt: schema.listing.createdAt
    })
    .from(schema.listing)
    .innerJoin(schema.romhackMeta, eq(schema.romhackMeta.listingId, schema.listing.id))
    .innerJoin(schema.user, eq(schema.user.id, schema.listing.authorId))
    .where(and(...where))
    .orderBy(desc(schema.listing.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return rows;
}

export interface RomhackDetail {
  listing: typeof schema.listing.$inferSelect;
  meta: typeof schema.romhackMeta.$inferSelect;
  version: typeof schema.listingVersion.$inferSelect;
  files: (typeof schema.listingFile.$inferSelect)[];
  authorName: string;
}

export async function getRomhackBySlug(db: DB, slug: string): Promise<RomhackDetail | null> {
  const listingRows = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.type, 'romhack'), eq(schema.listing.slug, slug)))
    .limit(1);
  const listing = listingRows[0];
  if (!listing) return null;

  const metaRows = await db
    .select()
    .from(schema.romhackMeta)
    .where(eq(schema.romhackMeta.listingId, listing.id))
    .limit(1);
  const versionRows = await db
    .select()
    .from(schema.listingVersion)
    .where(and(eq(schema.listingVersion.listingId, listing.id), eq(schema.listingVersion.isCurrent, true)))
    .limit(1);
  if (!metaRows[0] || !versionRows[0]) return null;

  const fileRows = await db
    .select()
    .from(schema.listingFile)
    .where(eq(schema.listingFile.versionId, versionRows[0].id));
  const authorRows = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, listing.authorId))
    .limit(1);

  return {
    listing,
    meta: metaRows[0],
    version: versionRows[0],
    files: fileRows,
    authorName: authorRows[0]?.name ?? 'unknown'
  };
}

export async function incrementDownloads(db: DB, listingId: string): Promise<void> {
  await db
    .update(schema.listing)
    .set({ downloads: sql`${schema.listing.downloads} + 1` })
    .where(eq(schema.listing.id, listingId));
}

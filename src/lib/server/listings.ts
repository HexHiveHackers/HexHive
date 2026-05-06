import { and, desc, eq, like, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import type { ListingType } from '$lib/db/schema';
import * as schema from '$lib/db/schema';
import type { RomhackInput } from '$lib/schemas/romhack';
import { newId, slugify, uniqueSlug } from '$lib/utils/ids';
import { type ListingTypedInput, writeMeta } from './meta-writers';
import { listVersionsForListing } from './versions';

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
  args: { authorId: string; ti: ListingTypedInput },
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
    status: 'draft',
  });
  await writeMeta(db, listingId, ti);

  const versionLabel = ti.type === 'romhack' ? ti.input.release : '1.0';
  await db.insert(schema.listingVersion).values({
    id: versionId,
    listingId,
    version: versionLabel,
    isCurrent: true,
    changelog: null,
  });

  return { listingId, versionId, slug };
}

export async function createRomhackDraft(
  db: DB,
  args: { authorId: string; input: RomhackCreateInput },
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
  },
): Promise<void> {
  for (const f of args.files) {
    await db.insert(schema.listingFile).values({
      id: newId(),
      versionId: args.versionId,
      r2Key: f.r2Key,
      filename: f.filename,
      originalFilename: f.originalFilename,
      size: f.size,
      hash: f.hash,
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
  args: { listingId: string; versionId: string; files: PersistedFile[] },
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
  mature: boolean;
}

export async function listRomhacks(
  db: DB,
  filters: { baseRom?: string; q?: string; includeMature?: boolean; limit?: number; offset?: number },
): Promise<RomhackListItem[]> {
  const where = [eq(schema.listing.type, 'romhack'), eq(schema.listing.status, 'published')];
  if (filters.baseRom) where.push(eq(schema.romhackMeta.baseRom, filters.baseRom));
  if (filters.q) where.push(like(schema.listing.title, `%${filters.q}%`));
  if (!filters.includeMature) where.push(eq(schema.listing.mature, false));

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
      createdAt: schema.listing.createdAt,
      mature: schema.listing.mature,
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
  versions: (typeof schema.listingVersion.$inferSelect)[];
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

  const versions = await listVersionsForListing(db, listing.id);

  return {
    listing,
    meta: metaRows[0],
    version: versionRows[0],
    files: fileRows,
    versions,
    authorName: authorRows[0]?.name ?? 'unknown',
  };
}

export interface AssetHiveListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'sprite' | 'sound' | 'script';
  targetedRoms: string[];
  fileCount: number;
  totalSize: number;
  downloads: number;
  authorName: string;
  createdAt: Date;
  mature: boolean;
}

export async function listAssetHives(
  db: DB,
  type: 'sprite' | 'sound' | 'script',
  filters: { q?: string; includeMature?: boolean; limit?: number; offset?: number },
): Promise<AssetHiveListItem[]> {
  const where = [eq(schema.listing.type, type), eq(schema.listing.status, 'published')];
  if (filters.q) where.push(like(schema.listing.title, `%${filters.q}%`));
  if (!filters.includeMature) where.push(eq(schema.listing.mature, false));

  const rows = await db
    .select({
      id: schema.listing.id,
      slug: schema.listing.slug,
      title: schema.listing.title,
      description: schema.listing.description,
      targetedRoms: schema.assetHiveMeta.targetedRoms,
      fileCount: schema.assetHiveMeta.fileCount,
      totalSize: schema.assetHiveMeta.totalSize,
      downloads: schema.listing.downloads,
      authorName: schema.user.name,
      createdAt: schema.listing.createdAt,
      mature: schema.listing.mature,
    })
    .from(schema.listing)
    .innerJoin(schema.assetHiveMeta, eq(schema.assetHiveMeta.listingId, schema.listing.id))
    .innerJoin(schema.user, eq(schema.user.id, schema.listing.authorId))
    .where(and(...where))
    .orderBy(desc(schema.listing.createdAt))
    .limit(filters.limit ?? 60)
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({ ...r, type }));
}

export interface AssetHiveDetail {
  listing: typeof schema.listing.$inferSelect;
  base: typeof schema.assetHiveMeta.$inferSelect;
  meta:
    | { kind: 'sprite'; data: typeof schema.spriteMeta.$inferSelect }
    | { kind: 'sound'; data: typeof schema.soundMeta.$inferSelect }
    | { kind: 'script'; data: typeof schema.scriptMeta.$inferSelect };
  version: typeof schema.listingVersion.$inferSelect;
  files: (typeof schema.listingFile.$inferSelect)[];
  versions: (typeof schema.listingVersion.$inferSelect)[];
  authorName: string;
}

export async function getAssetHiveBySlug(
  db: DB,
  type: 'sprite' | 'sound' | 'script',
  slug: string,
): Promise<AssetHiveDetail | null> {
  const lr = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.type, type), eq(schema.listing.slug, slug)))
    .limit(1);
  const listing = lr[0];
  if (!listing) return null;

  const base = (
    await db.select().from(schema.assetHiveMeta).where(eq(schema.assetHiveMeta.listingId, listing.id)).limit(1)
  )[0];
  if (!base) return null;

  let meta: AssetHiveDetail['meta'];
  if (type === 'sprite') {
    const m = (
      await db.select().from(schema.spriteMeta).where(eq(schema.spriteMeta.listingId, listing.id)).limit(1)
    )[0];
    if (!m) return null;
    meta = { kind: 'sprite', data: m };
  } else if (type === 'sound') {
    const m = (await db.select().from(schema.soundMeta).where(eq(schema.soundMeta.listingId, listing.id)).limit(1))[0];
    if (!m) return null;
    meta = { kind: 'sound', data: m };
  } else {
    const m = (
      await db.select().from(schema.scriptMeta).where(eq(schema.scriptMeta.listingId, listing.id)).limit(1)
    )[0];
    if (!m) return null;
    meta = { kind: 'script', data: m };
  }

  const version = (
    await db
      .select()
      .from(schema.listingVersion)
      .where(and(eq(schema.listingVersion.listingId, listing.id), eq(schema.listingVersion.isCurrent, true)))
      .limit(1)
  )[0];
  if (!version) return null;

  const files = await db.select().from(schema.listingFile).where(eq(schema.listingFile.versionId, version.id));
  const author = (
    await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, listing.authorId)).limit(1)
  )[0];

  const versions = await listVersionsForListing(db, listing.id);

  return { listing, base, meta, version, files, versions, authorName: author?.name ?? 'unknown' };
}

export async function incrementDownloads(db: DB, listingId: string): Promise<void> {
  await db
    .update(schema.listing)
    .set({ downloads: sql`${schema.listing.downloads} + 1` })
    .where(eq(schema.listing.id, listingId));
}

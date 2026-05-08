// Hard wipe of seed-user data on whatever DATABASE_URL is set.
import { createClient } from '@libsql/client';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';

const url = process.env.DATABASE_URL ?? 'file:./local.db';
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
const db = drizzle(client, { schema });

const allUsers = await db.select({ id: schema.user.id }).from(schema.user);
const seedIds = allUsers.map((u) => u.id).filter((id) => id.startsWith('seed-'));
console.log(`seed user ids: ${seedIds.length}`);
if (seedIds.length === 0) process.exit(0);

const listings = await db
  .select({ id: schema.listing.id })
  .from(schema.listing)
  .where(inArray(schema.listing.authorId, seedIds));
const listingIds = listings.map((l) => l.id);
console.log(`listings owned by seed users: ${listingIds.length}`);

// Wipe in dep order across ALL meta + version tables, even orphans by listing_id
const versions = await db
  .select({ id: schema.listingVersion.id })
  .from(schema.listingVersion)
  .where(inArray(schema.listingVersion.listingId, listingIds));
const versionIds = versions.map((v) => v.id);
if (versionIds.length) {
  await db.delete(schema.listingFile).where(inArray(schema.listingFile.versionId, versionIds));
  await db.delete(schema.listingVersion).where(inArray(schema.listingVersion.id, versionIds));
}
for (const t of [
  schema.assetHiveMeta,
  schema.spriteMeta,
  schema.soundMeta,
  schema.scriptMeta,
  schema.romhackMeta,
  schema.flag,
] as const) {
  await db.delete(t).where(inArray(t.listingId, listingIds));
}
await db.delete(schema.listing).where(inArray(schema.listing.id, listingIds));
console.log('wiped listings + meta + versions + files');

await db.delete(schema.profile).where(inArray(schema.profile.userId, seedIds));
await db.delete(schema.user).where(inArray(schema.user.id, seedIds));
console.log('wiped seed users + profiles');

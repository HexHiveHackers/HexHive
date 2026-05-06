import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { deleteObject } from '$lib/storage/r2';

type DB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Permanently delete a user's account and everything they own:
 *
 *   - all listings authored by the user (cascades through Drizzle FKs to
 *     listing_version, listing_file, romhack_meta, asset_hive_meta,
 *     sprite_meta, sound_meta, script_meta, and any flag rows whose
 *     listing_id matches);
 *   - the avatar object in R2 (if any);
 *   - the listing-file objects in R2;
 *   - the user row, which cascades to session, account, passkey, and profile;
 *   - flags filed BY the user remain (their reporter_id is set null per the
 *     schema's onDelete: 'set null' rule).
 *
 * R2 deletes are best-effort — a failure there leaves an orphaned object but
 * does NOT block the DB cascade. The user-facing contract is "their data is
 * gone from HexHive".
 */
export async function deleteAccount(db: DB, userId: string): Promise<{ filesDeleted: number }> {
  // 1. Collect every R2 key we'll need to delete (avatar + all listing files).
  const r2Keys: string[] = [];

  const profileRows = await db
    .select({ avatarKey: schema.profile.avatarKey })
    .from(schema.profile)
    .where(eq(schema.profile.userId, userId))
    .limit(1);
  if (profileRows[0]?.avatarKey) r2Keys.push(profileRows[0].avatarKey);

  const fileRows = await db
    .select({ r2Key: schema.listingFile.r2Key })
    .from(schema.listingFile)
    .innerJoin(schema.listingVersion, eq(schema.listingVersion.id, schema.listingFile.versionId))
    .innerJoin(schema.listing, eq(schema.listing.id, schema.listingVersion.listingId))
    .where(eq(schema.listing.authorId, userId));
  for (const row of fileRows) r2Keys.push(row.r2Key);

  // 2. Delete listings (cascades: version → file, all meta tables, any flags
  //    whose listing_id matches; flag.reporter_id with this userId stays
  //    around with reporter_id set to null per schema).
  await db.delete(schema.listing).where(eq(schema.listing.authorId, userId));

  // 3. Delete the user row. Profile + sessions + accounts + passkeys cascade.
  await db.delete(schema.user).where(eq(schema.user.id, userId));

  // 4. Best-effort R2 cleanup. Order doesn't matter; failures are swallowed.
  await Promise.all(r2Keys.map((key) => deleteObject(key)));

  return { filesDeleted: r2Keys.length };
}

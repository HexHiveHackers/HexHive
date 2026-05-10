import { and, desc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import type { ListingType } from '$lib/db/schema';
import * as schema from '$lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type Profile = typeof schema.profile.$inferSelect;

export async function getOrCreateProfile(db: DB, userId: string): Promise<Profile> {
  const rows = await db.select().from(schema.profile).where(eq(schema.profile.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(schema.profile).values({ userId, username: '', bio: null, avatarKey: null });
  const created = await db.select().from(schema.profile).where(eq(schema.profile.userId, userId)).limit(1);
  if (!created[0]) throw new Error(`Profile insert for user ${userId} did not round-trip`);
  return created[0];
}

export async function getProfileByUsername(db: DB, username: string): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(schema.profile)
    .where(sql`lower(${schema.profile.username}) = lower(${username})`)
    .limit(1);
  return rows[0] ?? null;
}

export async function setUsername(db: DB, userId: string, username: string): Promise<void> {
  await getOrCreateProfile(db, userId);
  try {
    await db.update(schema.profile).set({ username, updatedAt: new Date() }).where(eq(schema.profile.userId, userId));
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    const causeMsg = String(((e as { cause?: unknown })?.cause as Error)?.message ?? '');
    if (/unique/i.test(msg) || /unique/i.test(causeMsg)) throw new Error('Username is already taken');
    throw e;
  }
}

export async function setBio(db: DB, userId: string, bio: string): Promise<void> {
  await db.update(schema.profile).set({ bio, updatedAt: new Date() }).where(eq(schema.profile.userId, userId));
}

// Public-facing contact email the user types in. Free-form string,
// no verification, optional. Empty string clears it.
export async function setContactEmail(db: DB, userId: string, email: string): Promise<void> {
  const trimmed = email.trim();
  await db
    .update(schema.profile)
    .set({ contactEmail: trimmed === '' ? null : trimmed, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

// Free-form pronouns string, public on the profile. Empty clears it.
export async function setPronouns(db: DB, userId: string, pronouns: string): Promise<void> {
  const trimmed = pronouns.trim();
  await db
    .update(schema.profile)
    .set({ pronouns: trimmed === '' ? null : trimmed, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

// Free-form display name shown alongside the @handle. Empty string clears.
export async function setAlias(db: DB, userId: string, alias: string): Promise<void> {
  const trimmed = alias.trim();
  await db
    .update(schema.profile)
    .set({ alias: trimmed === '' ? null : trimmed, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

// When true, the user's last-active timestamp is suppressed on both the
// public users directory and their profile page. Single toggle drives both.
export async function setHideActivity(db: DB, userId: string, hide: boolean): Promise<void> {
  await db
    .update(schema.profile)
    .set({ hideActivity: hide, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

export interface DirectoryUser {
  username: string;
  alias: string | null;
  name: string;
  avatarKey: string | null;
  pronouns: string | null;
  bio: string | null;
  // null when the user has hideActivity enabled, OR when they have no
  // session row at all (placeholder accounts, fresh signups before
  // first session refresh).
  lastActive: Date | null;
  joinedAt: Date;
  // Unclaimed credit account — created by HexHive on behalf of an
  // original creator who hasn't signed in yet.
  isPlaceholder: boolean;
  // Sub-category when isPlaceholder is true. 'contributor' = has asset
  // contributions; 'user' = a person we wanted to credit/track but with
  // no assets attached yet. Ignored for non-placeholder users.
  placeholderKind: 'contributor' | 'user';
  // True when the user is attached to the "Team Aquas Asset Repo"
  // affiliation. Used by the directory card to fall back to a synthetic
  // bio when no real bio was harvested from per-folder READMEs.
  fromTeamAquaRepo: boolean;
}

// Lists every user with a username, paired with the most recent
// session.updatedAt as a "last active" signal. Better Auth touches
// session.updatedAt on each refresh, so it tracks live use rather than
// initial sign-in. Includes placeholder credit accounts as "unclaimed"
// so the directory shows everyone visible elsewhere on the site.
export async function listDirectoryUsers(db: DB): Promise<DirectoryUser[]> {
  const lastActiveSql = sql<number | null>`max(${schema.session.updatedAt})`;
  // Resolve the "Team Aquas Asset Repo" affiliation id once; the
  // directory card uses it as a synthetic-bio fallback for placeholders
  // that are members of the repo but have no harvested bio of their own.
  const repoIdRows = await db
    .select({ id: schema.affiliation.id })
    .from(schema.affiliation)
    .where(sql`lower(${schema.affiliation.name}) = lower('Team Aquas Asset Repo')`)
    .limit(1);
  const repoId = repoIdRows[0]?.id ?? null;
  const fromAquaSql = repoId
    ? sql<number>`EXISTS(SELECT 1 FROM ${schema.profileAffiliation} pa WHERE pa.user_id = ${schema.user.id} AND pa.affiliation_id = ${repoId})`
    : sql<number>`0`;
  const rows = await db
    .select({
      username: schema.profile.username,
      alias: schema.profile.alias,
      name: schema.user.name,
      avatarKey: schema.profile.avatarKey,
      pronouns: schema.profile.pronouns,
      bio: schema.profile.bio,
      hideActivity: schema.profile.hideActivity,
      isPlaceholder: schema.user.isPlaceholder,
      placeholderKind: schema.user.placeholderKind,
      joinedAt: schema.user.createdAt,
      lastActive: lastActiveSql,
      fromTeamAquaRepo: fromAquaSql,
    })
    .from(schema.profile)
    .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
    .leftJoin(schema.session, eq(schema.session.userId, schema.profile.userId))
    .where(sql`length(${schema.profile.username}) > 0`)
    .groupBy(schema.profile.userId)
    .orderBy(desc(lastActiveSql));
  return rows.map((r) => ({
    username: r.username,
    alias: r.alias,
    name: r.name,
    avatarKey: r.avatarKey,
    pronouns: r.pronouns,
    bio: r.bio,
    lastActive: r.hideActivity || r.lastActive == null ? null : new Date(Number(r.lastActive) * 1000),
    joinedAt: r.joinedAt,
    isPlaceholder: r.isPlaceholder,
    placeholderKind: r.placeholderKind,
    fromTeamAquaRepo: Number(r.fromTeamAquaRepo) > 0,
  }));
}

// Latest session.updatedAt for one user. Returns null if hidden or absent.
export async function lastActiveFor(db: DB, userId: string, opts: { respectHideFlag: boolean }): Promise<Date | null> {
  if (opts.respectHideFlag) {
    const p = await db
      .select({ hide: schema.profile.hideActivity })
      .from(schema.profile)
      .where(eq(schema.profile.userId, userId))
      .limit(1);
    if (p[0]?.hide) return null;
  }
  const rows = await db
    .select({ updatedAt: schema.session.updatedAt })
    .from(schema.session)
    .where(eq(schema.session.userId, userId))
    .orderBy(desc(schema.session.updatedAt))
    .limit(1);
  return rows[0]?.updatedAt ?? null;
}

export interface UserListingItem {
  id: string;
  type: ListingType;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'hidden';
  downloads: number;
  createdAt: Date;
}

export async function listingsByUser(db: DB, userId: string, opts: { self: boolean }): Promise<UserListingItem[]> {
  const conds = [eq(schema.listing.authorId, userId)];
  if (!opts.self) conds.push(eq(schema.listing.status, 'published'));
  const rows = await db
    .select({
      id: schema.listing.id,
      type: schema.listing.type,
      slug: schema.listing.slug,
      title: schema.listing.title,
      status: schema.listing.status,
      downloads: schema.listing.downloads,
      createdAt: schema.listing.createdAt,
    })
    .from(schema.listing)
    .where(and(...conds))
    .orderBy(desc(schema.listing.createdAt));
  return rows;
}

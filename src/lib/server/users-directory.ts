import { desc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import type { ListingType } from '$lib/db/schema';
import * as schema from '$lib/db/schema';
import type { DirectoryRow } from '$lib/hhql/fields-users';

type DB = ReturnType<typeof drizzle<typeof schema>>;

const ZERO_COUNTS: Record<ListingType, number> = { romhack: 0, sprite: 0, sound: 0, script: 0 };

export async function enrichDirectoryUsers(db: DB): Promise<DirectoryRow[]> {
  const lastActive = sql<number | null>`max(${schema.session.updatedAt})`;

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

  const baseRows = await db
    .select({
      userId: schema.profile.userId,
      username: schema.profile.username,
      alias: schema.profile.alias,
      bio: schema.profile.bio,
      avatarKey: schema.profile.avatarKey,
      pronouns: schema.profile.pronouns,
      hideActivity: schema.profile.hideActivity,
      isPlaceholder: schema.user.isPlaceholder,
      isAdmin: schema.user.isAdmin,
      placeholderKind: schema.user.placeholderKind,
      name: schema.user.name,
      joinedAt: schema.user.createdAt,
      lastActive,
      fromTeamAquaRepo: fromAquaSql,
    })
    .from(schema.profile)
    .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
    .leftJoin(schema.session, eq(schema.session.userId, schema.profile.userId))
    .where(sql`length(${schema.profile.username}) > 0`)
    .groupBy(schema.profile.userId)
    .orderBy(desc(lastActive));

  const counts = await db
    .select({
      authorId: schema.listing.authorId,
      type: schema.listing.type,
      n: sql<number>`count(*)`,
      dls: sql<number>`coalesce(sum(${schema.listing.downloads}), 0)`,
    })
    .from(schema.listing)
    .where(eq(schema.listing.status, 'published'))
    .groupBy(schema.listing.authorId, schema.listing.type);

  const affJoins = await db
    .select({
      userId: schema.profileAffiliation.userId,
      name: schema.affiliation.name,
      role: schema.profileAffiliation.role,
    })
    .from(schema.profileAffiliation)
    .innerJoin(schema.affiliation, eq(schema.affiliation.id, schema.profileAffiliation.affiliationId));

  const akas = await db
    .select({ userId: schema.aliasEntry.userId, value: schema.aliasEntry.value })
    .from(schema.aliasEntry);

  const links = await db
    .select({ userId: schema.profileLink.userId })
    .from(schema.profileLink)
    .groupBy(schema.profileLink.userId);

  const linkSet = new Set(links.map((l) => l.userId));

  const countsByUser = new Map<string, { listingsByType: Record<ListingType, number>; totalDownloads: number }>();
  for (const c of counts) {
    const cur = countsByUser.get(c.authorId) ?? { listingsByType: { ...ZERO_COUNTS }, totalDownloads: 0 };
    cur.listingsByType[c.type] = Number(c.n);
    cur.totalDownloads += Number(c.dls);
    countsByUser.set(c.authorId, cur);
  }

  const affsByUser = new Map<string, { name: string; role: string | null }[]>();
  for (const a of affJoins) {
    const list = affsByUser.get(a.userId) ?? [];
    list.push({ name: a.name, role: a.role });
    affsByUser.set(a.userId, list);
  }

  const akasByUser = new Map<string, string[]>();
  for (const a of akas) {
    const list = akasByUser.get(a.userId) ?? [];
    list.push(a.value);
    akasByUser.set(a.userId, list);
  }

  return baseRows.map((r): DirectoryRow => {
    const c = countsByUser.get(r.userId) ?? { listingsByType: { ...ZERO_COUNTS }, totalDownloads: 0 };
    const dbAffs = affsByUser.get(r.userId) ?? [];
    // Synthetic HexHive affiliation for admins. Surfaces in the
    // /users affiliation chip + the HHQL `affiliation` field without
    // requiring a DB row per admin.
    const affs = r.isAdmin ? [{ name: 'HexHive', role: 'Admin' as const }, ...dbAffs] : dbAffs;
    const ak = akasByUser.get(r.userId) ?? [];
    const lastActiveMs = r.hideActivity || r.lastActive == null ? null : Number(r.lastActive) * 1000;
    return {
      username: r.username,
      alias: r.alias,
      bio: r.bio,
      listingsByType: c.listingsByType,
      totalDownloads: c.totalDownloads,
      lastActive: lastActiveMs,
      joinedAt: r.joinedAt.getTime(),
      hasBio: !!(r.bio && r.bio.length > 0),
      hasAlias: !!(r.alias && r.alias.length > 0),
      hasAvatar: !!(r.avatarKey && r.avatarKey.length > 0),
      hasLinks: linkSet.has(r.userId),
      hasAffiliations: affs.length > 0,
      affiliations: affs,
      akas: ak,
      isPlaceholder: r.isPlaceholder,
      isAdmin: r.isAdmin,
      name: r.name,
      avatarKey: r.avatarKey,
      pronouns: r.pronouns,
      placeholderKind: r.placeholderKind,
      fromTeamAquaRepo: Number(r.fromTeamAquaRepo) > 0,
    };
  });
}

import { and, asc, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface ProfileLink {
  id: string;
  url: string;
  label: string | null;
}

export async function listLinksForUser(db: DB, userId: string): Promise<ProfileLink[]> {
  const rows = await db
    .select({ id: schema.profileLink.id, url: schema.profileLink.url, label: schema.profileLink.label })
    .from(schema.profileLink)
    .where(eq(schema.profileLink.userId, userId))
    .orderBy(asc(schema.profileLink.sortOrder), asc(schema.profileLink.createdAt));
  return rows;
}

// Add a link. Returns the existing row if the user already has this URL.
export async function addLink(
  db: DB,
  userId: string,
  input: { url: string; label: string | null },
): Promise<ProfileLink> {
  const url = input.url.trim();
  if (!url) throw new Error('URL is required');
  // Validate URL shape; reject anything that won't parse so we don't
  // store junk that later breaks the host detector.
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }
  const label = input.label?.trim() || null;

  const existing = await db
    .select({ id: schema.profileLink.id, url: schema.profileLink.url, label: schema.profileLink.label })
    .from(schema.profileLink)
    .where(and(eq(schema.profileLink.userId, userId), sql`lower(${schema.profileLink.url}) = lower(${url})`))
    .limit(1);
  if (existing[0]) {
    if (existing[0].label !== label) {
      await db.update(schema.profileLink).set({ label }).where(eq(schema.profileLink.id, existing[0].id));
      return { ...existing[0], label };
    }
    return existing[0];
  }
  const id = newId();
  await db.insert(schema.profileLink).values({ id, userId, url, label });
  return { id, url, label };
}

export async function removeLink(db: DB, userId: string, id: string): Promise<void> {
  await db.delete(schema.profileLink).where(and(eq(schema.profileLink.userId, userId), eq(schema.profileLink.id, id)));
}

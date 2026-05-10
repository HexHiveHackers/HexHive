/**
 * Idempotent backfill: marks existing synthetic seed users as placeholder
 * accounts, harvests homepage URLs from a Team-Aqua repo clone, and ensures a
 * placeholder user exists per unique tool author in src/lib/data/tools.ts.
 *
 * Run locally:        bun scripts/backfill-placeholders.ts
 * Against Turso:      DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bun scripts/backfill-placeholders.ts
 * Custom repo path:   REPO=/path/to/Team-Aquas-Asset-Repo bun scripts/backfill-placeholders.ts
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { listTools } from '../src/lib/data/tools';
import * as schema from '../src/lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export function slugifyContributor(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'unknown'
  );
}

const ALLOWED_HOSTS = [
  'github.com',
  'pokecommunity.com',
  'twitter.com',
  'x.com',
  'bsky.app',
  'mastodon.social',
  'youtube.com',
  'soundcloud.com',
  'bandcamp.com',
];

export function extractCreatorUrl(markdown: string): string | null {
  const urlRe = /https?:\/\/[^\s)\]]+/g;
  const candidates = markdown.match(urlRe) ?? [];
  for (const raw of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    const host = parsed.host.replace(/^www\./, '');
    if (host === 'discord.gg' || host === 'discord.com') continue;
    if (/^i\.|imgur\.com$/.test(host)) continue;
    if (/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg)$/i.test(parsed.pathname)) continue;
    if (ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return raw;
    }
  }
  return null;
}

const ASSET_TYPE_DIRS = [
  'Audio',
  'Battle Backgrounds',
  'Battle effects',
  'Field Effects',
  'Items',
  'Maps',
  'Official Pokemon Assets',
  'Other',
  'Overworld Other Sprites',
  'Overworld Pokemon Sprites',
  'Overworld Trainer Sprites',
  'Pokemon',
  'Pokemon Essentials Packs',
  'Projects',
  'Tilesets',
  'Trainer Back Sprites',
  'Trainer Front Sprites',
  'User Interface',
];

export async function runPhaseA(db: DB): Promise<{ flagged: number }> {
  const result = await db
    .update(schema.user)
    .set({ isPlaceholder: true })
    .where(or(like(schema.user.id, 'seed-aqua-%'), like(schema.user.id, 'seed-contrib-%')))
    .returning({ id: schema.user.id });
  return { flagged: result.length };
}

export async function runPhaseB(db: DB, repoRoot: string): Promise<{ updated: number }> {
  let updated = 0;
  for (const assetType of ASSET_TYPE_DIRS) {
    const dir = path.join(repoRoot, assetType);
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const subdir = path.join(dir, entry);
      try {
        const s = await stat(subdir);
        if (!s.isDirectory()) continue;
      } catch {
        continue;
      }
      const readmePath = path.join(subdir, 'README.md');
      let md: string;
      try {
        md = await readFile(readmePath, 'utf8');
      } catch {
        continue;
      }
      const url = extractCreatorUrl(md);
      if (!url) continue;
      const slug = slugifyContributor(entry);
      const userId = `seed-contrib-${slug}`;
      const profileRows = await db.select().from(schema.profile).where(eq(schema.profile.userId, userId)).limit(1);
      if (!profileRows[0]) continue;
      if (profileRows[0].homepageUrl) continue;
      await db.update(schema.profile).set({ homepageUrl: url }).where(eq(schema.profile.userId, userId));
      updated += 1;
    }
  }
  return { updated };
}

export interface ToolAuthorInput {
  author: string;
  authorUrl: string | undefined;
}

export async function runPhaseC(db: DB, tools: ToolAuthorInput[]): Promise<{ created: number }> {
  const seen = new Set<string>();
  let created = 0;
  for (const t of tools) {
    const slug = slugifyContributor(t.author);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const id = `seed-tool-${slug}`;

    const existingUser = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
    if (!existingUser[0]) {
      await db.insert(schema.user).values({
        id,
        name: t.author,
        email: `${slug}@tools.seed`,
        emailVerified: true,
        isPlaceholder: true,
      });
      created += 1;
    } else if (!existingUser[0].isPlaceholder) {
      await db.update(schema.user).set({ isPlaceholder: true }).where(eq(schema.user.id, id));
    }

    const existingProfile = await db.select().from(schema.profile).where(eq(schema.profile.userId, id)).limit(1);
    if (!existingProfile[0]) {
      await db.insert(schema.profile).values({
        userId: id,
        username: slug,
        homepageUrl: t.authorUrl ?? null,
      });
    } else if (!existingProfile[0].homepageUrl && t.authorUrl) {
      await db.update(schema.profile).set({ homepageUrl: t.authorUrl }).where(eq(schema.profile.userId, id));
    }
  }
  return { created };
}

async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./local.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const repoRoot = process.env.REPO ?? '/home/user/Team-Aquas-Asset-Repo';
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  const a = await runPhaseA(db);
  console.log(`Phase A: flagged ${a.flagged} seed users as placeholder.`);
  const b = await runPhaseB(db, repoRoot);
  console.log(`Phase B: harvested ${b.updated} homepage URLs from ${repoRoot}.`);
  const tools = listTools().map((t) => ({ author: t.author, authorUrl: t.authorUrl }));
  const c = await runPhaseC(db, tools);
  console.log(`Phase C: created ${c.created} placeholder users for tool authors.`);
}

if (import.meta.main) {
  await main();
}

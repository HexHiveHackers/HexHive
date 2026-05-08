/**
 * Idempotent seed: ingests up to ~50 listings from a local clone of the
 * Team-Aquas-Asset-Repo into HexHive, with one synthetic user per unique
 * contributor folder in the repo (so author attribution mirrors the on-disk
 * structure).
 *
 * Run with:  REPO=/tmp/Team-Aquas-Asset-Repo bun scripts/seed-team-aqua.ts
 *   --reset                wipe seed users' listings + storage and reseed
 *   --max-listings <n>     override the listing count (default 50)
 *
 * Storage: when R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET
 * are set in env, files are PUT directly to R2 via the S3 API. Otherwise they
 * are copied into .dev-storage/<r2Key> for local development. DB rows are
 * persisted via createListingDraft + finalizeListing so the same code paths
 * used by the API are exercised end-to-end (sans HTTP/auth).
 *
 * To target a remote DB: set DATABASE_URL (libsql://...) and DATABASE_AUTH_TOKEN.
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@libsql/client';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import { createListingDraft, finalizeListing } from '../src/lib/server/listings';
import type { ListingTypedInput } from '../src/lib/server/meta-writers';
import { setUsername } from '../src/lib/server/profiles';
import { newId } from '../src/lib/utils/ids';

const REPO = process.env.REPO ?? '/tmp/Team-Aquas-Asset-Repo';
const STORAGE = '.dev-storage';
const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const maxIdx = process.argv.indexOf('--max-listings');
const MAX = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : 50;

// R2 upload (used when R2 env is configured; otherwise falls back to copying
// into .dev-storage/). The seeder is a Node script and can't import the
// SvelteKit-bound src/lib/storage/r2.ts (it depends on $env/dynamic/private),
// so we instantiate the S3 client directly here.
const R2_CONFIGURED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET
);
const r2 = R2_CONFIGURED
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    })
  : null;
const R2_BUCKET = process.env.R2_BUCKET;

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.mid': 'audio/midi',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.zip': 'application/zip',
};
function contentTypeFor(name: string): string {
  return CONTENT_TYPE_BY_EXT[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
}

// ────────────────────────────────────────────────────────────────────────────
// Per-type allowlists (mirror src/lib/utils/file-types.ts)
// ────────────────────────────────────────────────────────────────────────────

const LIMITS = {
  sprite: { perFile: 5 * 1024 * 1024, total: 50 * 1024 * 1024, max: 200, exts: ['.png', '.gif', '.bmp', '.zip'] },
  sound: {
    perFile: 20 * 1024 * 1024,
    total: 50 * 1024 * 1024,
    max: 50,
    exts: ['.wav', '.ogg', '.mp3', '.flac', '.m4a', '.opus', '.mid', '.midi', '.s', '.zip'],
  },
  script: {
    perFile: 10 * 1024 * 1024,
    total: 30 * 1024 * 1024,
    max: 100,
    exts: ['.s', '.txt', '.md', '.py', '.c', '.h', '.json', '.zip'],
  },
} as const;

type ListingType = keyof typeof LIMITS;

interface FilePick {
  abs: string;
  rel: string;
  size: number;
}

async function zipDirToTemp(srcDir: string, perFileCap: number): Promise<FilePick | null> {
  const out = path.join(tmpdir(), `seed-${newId(8)}.zip`);
  // Exclude humongous per-file outliers via -x with size, but `zip` doesn't
  // do size filters directly; instead let zip include everything and check
  // the resulting size after.
  const code = await new Promise<number>((resolve, reject) => {
    const p = spawn('zip', ['-rq', out, '.'], { cwd: srcDir, stdio: 'ignore' });
    p.on('error', reject);
    p.on('exit', (c) => resolve(c ?? 1));
  });
  if (code !== 0) {
    await rm(out, { force: true });
    return null;
  }
  const st = await stat(out);
  if (st.size <= 0 || st.size > perFileCap) {
    await rm(out, { force: true });
    return null;
  }
  return { abs: out, rel: `${path.basename(srcDir)}.zip`, size: st.size };
}

async function pickFiles(dir: string, type: ListingType): Promise<FilePick[]> {
  const lim = LIMITS[type];
  const out: FilePick[] = [];
  let total = 0;
  // Recursive walk, sorted for determinism, stop once we'd exceed limits.
  const walk = async (d: string, prefix: string): Promise<boolean> => {
    let entries: { name: string; isDirectory: () => boolean; isFile: () => boolean }[];
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return true;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = path.join(d, e.name);
      const rel = path.posix.join(prefix, e.name);
      if (e.isDirectory()) {
        const ok = await walk(abs, rel);
        if (!ok) return false;
        continue;
      }
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!lim.exts.includes(ext as (typeof lim.exts)[number])) continue;
      const st = await stat(abs);
      if (st.size <= 0 || st.size > lim.perFile) continue;
      if (total + st.size > lim.total) return false;
      out.push({ abs, rel, size: st.size });
      total += st.size;
      if (out.length >= lim.max) return false;
    }
    return true;
  };
  await walk(dir, '');
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Bundle catalogue: produce a generator of candidate bundles, then pick MAX
// ────────────────────────────────────────────────────────────────────────────

interface Bundle {
  type: ListingType;
  source: string; // absolute path on disk
  title: string;
  description: string;
  contributor: string; // folder name; used as a hint for a seed user
  // Type-specific category metadata
  category: unknown;
  // sound
  soundCategory?: 'Attack' | 'Cry' | 'Jingle' | 'SFX' | 'Song';
  // script
  scriptCategories?: string[];
  scriptFeatures?: string[];
  scriptTools?: string[];
  scriptTargetedVersions?: ('v1.0' | 'v1.1')[];
  mature?: boolean;
}

const SPRITE_CATEGORY_BY_DIR: Record<string, { type: string; subtype: string; variant?: string }> = {
  'Trainer Front Sprites': { type: 'Battle', subtype: 'Trainer', variant: 'Front' },
  'Trainer Back Sprites': { type: 'Battle', subtype: 'Trainer', variant: 'Back' },
  Pokemon: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
  'Overworld Pokemon Sprites': { type: 'Overworld', subtype: 'Pokemon', variant: 'Land' },
  'Overworld Trainer Sprites': { type: 'Overworld', subtype: 'Player', variant: 'Walking' },
  'Overworld Other Sprites': { type: 'Overworld', subtype: 'Other', variant: 'misc' },
  Items: { type: 'Menu', subtype: 'Item' },
  Tilesets: { type: 'Environment', subtype: 'Tiles', variant: 'pack' },
  'User Interface': { type: 'UI', subtype: 'Menu', variant: 'pack' },
  'Battle Backgrounds': { type: 'Battle', subtype: 'Background', variant: 'pack' },
  'Battle effects': { type: 'Battle', subtype: 'Other', variant: 'pack' },
  'Field Effects': { type: 'Environment', subtype: 'Other', variant: 'pack' },
};

async function listContributors(absDir: string): Promise<string[]> {
  try {
    const entries = await readdir(absDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function buildBundles(): Promise<Bundle[]> {
  const bundles: Bundle[] = [];

  // Sprites: walk each sprite-category dir and create one bundle per contributor.
  for (const [dir, cat] of Object.entries(SPRITE_CATEGORY_BY_DIR)) {
    const absDir = path.join(REPO, dir);
    const contributors = await listContributors(absDir);
    for (const c of contributors.slice(0, 4)) {
      bundles.push({
        type: 'sprite',
        source: path.join(absDir, c),
        contributor: c,
        title: `${dir} — ${c}`,
        description: `Sprite pack from ${c} (${dir}). Imported from Team Aqua's asset repo as a HexHive seed.`,
        category: cat,
      });
    }
  }

  // Sounds: each Audio/<contributor> becomes a bundle. Most folders contain
  // .mid/.inc music data rather than .wav/.ogg, so seedBundle falls back to
  // packaging them as a single .zip per the sound allowlist.
  const audioContribs = await listContributors(path.join(REPO, 'Audio'));
  const SOUND_CATEGORIES = ['Song', 'Cry', 'SFX', 'Jingle', 'Attack'] as const;
  for (const [i, c] of audioContribs.slice(0, 14).entries()) {
    bundles.push({
      type: 'sound',
      source: path.join(REPO, 'Audio', c),
      contributor: c,
      title: `Audio pack — ${c}`,
      description: `Audio pack from ${c}. Imported from Team Aqua's asset repo as a HexHive seed.`,
      category: undefined,
      soundCategory: SOUND_CATEGORIES[i % SOUND_CATEGORIES.length],
    });
  }

  // Scripts: each Projects/<X> as a script pack (zipped on the fly). Pokemon
  // Essentials zips are intentionally skipped — they're too big for the
  // per-file script cap (10 MB).
  const projectsContribs = await listContributors(path.join(REPO, 'Projects'));
  for (const c of projectsContribs.slice(0, 6)) {
    bundles.push({
      type: 'script',
      source: path.join(REPO, 'Projects', c),
      contributor: c,
      title: `Project — ${c}`,
      description: `Project assets from ${c}. Imported from Team Aqua's asset repo as a HexHive seed.`,
      category: undefined,
      scriptCategories: ['Feature'],
      scriptFeatures: ['Battle Engine'],
      scriptTools: ['HexManiacAdvance'],
      scriptTargetedVersions: ['v1.0'],
    });
  }

  // Trim/pad to the MAX, marking the last sound listing as mature so the
  // mature-filter behavior gets exercised.
  const out = bundles.slice(0, MAX);
  const lastSoundIdx = [...out].reverse().findIndex((b) => b.type === 'sound');
  if (lastSoundIdx >= 0) out[out.length - 1 - lastSoundIdx].mature = true;
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Per-bundle seeding
// ────────────────────────────────────────────────────────────────────────────

async function copyToStorage(src: string, r2Key: string): Promise<void> {
  if (r2 && R2_BUCKET) {
    const body = await readFile(src);
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: body,
        ContentType: contentTypeFor(src),
      }),
    );
    return;
  }
  const dest = path.join(STORAGE, r2Key);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

// Slugify a contributor folder name into a HexHive-safe username/id segment.
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'unknown'
  );
}

// Look up or create a per-contributor seed user. Used to attribute every
// bundle to the folder author it came from rather than round-robin across a
// fixed cast. Inserts the profile row directly with a non-empty username so
// the profile_username_unique index never sees two `''` values colliding
// (which is what would happen if we went through getOrCreateProfile, since
// it inserts with username='' before the caller can rename it).
async function ensureContributorUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  displayName: string,
): Promise<string> {
  const slug = slugify(displayName);
  const id = `seed-contrib-${slug}`;
  const existing = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  if (!existing[0]) {
    await db.insert(schema.user).values({
      id,
      name: displayName,
      email: `${slug}@team-aqua.seed`,
      emailVerified: true,
    });
  }
  const existingProfile = await db.select().from(schema.profile).where(eq(schema.profile.userId, id)).limit(1);
  if (!existingProfile[0]) {
    await db.insert(schema.profile).values({
      userId: id,
      username: slug,
      bio: `Contributor on Team Aqua's asset repo. Imported as a HexHive seed.`,
    });
  } else {
    await setUsername(db, id, slug);
    await db
      .update(schema.profile)
      .set({ bio: `Contributor on Team Aqua's asset repo. Imported as a HexHive seed.` })
      .where(eq(schema.profile.userId, id));
  }
  return id;
}

async function seedBundle(
  db: ReturnType<typeof drizzle<typeof schema>>,
  authorId: string,
  b: Bundle,
): Promise<{ ok: boolean; reason?: string; slug?: string }> {
  // Special-case: Pokemon Essentials zip(s) — match the bundle title (which is
  // the filename without extension) to a single .zip file in the source dir.
  let files: FilePick[];
  if (b.type === 'script' && b.contributor === 'Pokemon Essentials') {
    const expected = `${b.title}.zip`;
    try {
      const st = await stat(path.join(b.source, expected));
      if (st.size <= 0 || st.size > LIMITS.script.perFile) return { ok: false, reason: `oversize: ${expected}` };
      files = [{ abs: path.join(b.source, expected), rel: expected, size: st.size }];
    } catch {
      return { ok: false, reason: `missing: ${expected}` };
    }
  } else {
    files = await pickFiles(b.source, b.type);
    // For asset hives, when there are no allow-listed individual files, try
    // zipping the whole source dir into a single .zip (which is allowed for
    // sprite/sound/script). Lets us ingest .mid/.inc music packs and .rb
    // project trees that wouldn't otherwise pass the per-file allowlist.
    if (!files.length && (b.type === 'sound' || b.type === 'script' || b.type === 'sprite')) {
      const zipped = await zipDirToTemp(b.source, LIMITS[b.type].perFile);
      if (zipped) files = [zipped];
    }
  }
  if (!files.length) return { ok: false, reason: 'no eligible files (zip fallback also failed)' };

  // Build typed listing input.
  let ti: ListingTypedInput;
  if (b.type === 'sprite') {
    ti = {
      type: 'sprite',
      input: {
        title: b.title,
        description: b.description,
        permissions: ['Credit'],
        targetedRoms: ['Emerald'],
        category: b.category as { type: string; subtype: string; variant?: string },
      },
    };
  } else if (b.type === 'sound') {
    if (!b.soundCategory) return { ok: false, reason: 'no sound category' };
    ti = {
      type: 'sound',
      input: {
        title: b.title,
        description: b.description,
        permissions: ['Credit'],
        targetedRoms: ['Emerald'],
        category: b.soundCategory,
      },
    };
  } else {
    ti = {
      type: 'script',
      input: {
        title: b.title,
        description: b.description,
        permissions: ['Credit'],
        targetedRoms: ['Emerald'],
        categories: b.scriptCategories ?? ['Feature'],
        features: b.scriptFeatures ?? ['Battle Engine'],
        prerequisites: [],
        targetedVersions: b.scriptTargetedVersions ?? ['v1.0'],
        tools: b.scriptTools ?? ['HexManiacAdvance'],
      },
    };
  }

  const draft = await createListingDraft(db, { authorId, ti });

  // Copy each file to dev-storage and collect persisted-file rows.
  const persisted: { r2Key: string; filename: string; originalFilename: string; size: number; hash: string | null }[] =
    [];
  for (const f of files) {
    const safe = f.rel.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stored = `${newId(8)}-${safe}`;
    const r2Key = `${draft.listingId}/${draft.versionId}/${stored}`;
    await copyToStorage(f.abs, r2Key);
    persisted.push({ r2Key, filename: stored, originalFilename: f.rel, size: f.size, hash: null });
  }
  await finalizeListing(db, {
    type: b.type,
    listingId: draft.listingId,
    versionId: draft.versionId,
    files: persisted,
  });
  if (b.mature) {
    await db.update(schema.listing).set({ mature: true }).where(eq(schema.listing.id, draft.listingId));
  }
  return { ok: true, slug: draft.slug };
}

// ────────────────────────────────────────────────────────────────────────────
// Reset path: wipe seed-users' listings + their files in dev-storage, leave
// jmynes alone (since their listings come from real OAuth interaction).
// ────────────────────────────────────────────────────────────────────────────

async function reset(db: ReturnType<typeof drizzle<typeof schema>>) {
  // Match all synthetic seed users: the legacy fictional cast plus any
  // path-derived `seed-contrib-*` users created by recent runs.
  const allUsers = await db.select({ id: schema.user.id }).from(schema.user);
  const seedIds = allUsers
    .map((u) => u.id)
    .filter((id) => id.startsWith('seed-aqua-') || id.startsWith('seed-contrib-'));
  if (!seedIds.length) {
    console.log('reset: no seed users in DB');
    return;
  }
  const listings = await db
    .select({ id: schema.listing.id })
    .from(schema.listing)
    .where(inArray(schema.listing.authorId, seedIds));
  if (!listings.length) {
    console.log('reset: no seed-user listings to remove');
    return;
  }
  const ids = listings.map((l) => l.id);
  console.log(`reset: removing ${ids.length} listings owned by ${seedIds.length} seed users`);
  // Best-effort delete of dev-storage files (no-op when running against R2).
  for (const id of ids) {
    await rm(path.join(STORAGE, id), { recursive: true, force: true });
  }
  // DB cascades aren't defined for every relation, so delete in dependency order.
  const versions = await db
    .select({ id: schema.listingVersion.id })
    .from(schema.listingVersion)
    .where(inArray(schema.listingVersion.listingId, ids));
  const versionIds = versions.map((v) => v.id);
  if (versionIds.length) {
    await db.delete(schema.listingFile).where(inArray(schema.listingFile.versionId, versionIds));
    await db.delete(schema.listingVersion).where(inArray(schema.listingVersion.id, versionIds));
  }
  await db.delete(schema.assetHiveMeta).where(inArray(schema.assetHiveMeta.listingId, ids));
  await db.delete(schema.spriteMeta).where(inArray(schema.spriteMeta.listingId, ids));
  await db.delete(schema.soundMeta).where(inArray(schema.soundMeta.listingId, ids));
  await db.delete(schema.scriptMeta).where(inArray(schema.scriptMeta.listingId, ids));
  await db.delete(schema.romhackMeta).where(inArray(schema.romhackMeta.listingId, ids));
  await db.delete(schema.flag).where(inArray(schema.flag.listingId, ids));
  await db.delete(schema.listing).where(inArray(schema.listing.id, ids));
}

// ────────────────────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./local.db';
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  const db = drizzle(client, { schema });

  if (RESET) await reset(db);

  // Idempotency: skip if any path-derived seed contributor already has listings
  // (unless --reset).
  if (!RESET) {
    const allUsers = await db.select({ id: schema.user.id }).from(schema.user);
    const existingSeedIds = allUsers.map((u) => u.id).filter((id) => id.startsWith('seed-contrib-'));
    if (existingSeedIds.length) {
      const existing = await db
        .select({ id: schema.listing.id })
        .from(schema.listing)
        .where(inArray(schema.listing.authorId, existingSeedIds))
        .limit(1);
      if (existing.length) {
        console.log('path-derived seed contributors already have listings; pass --reset to wipe + re-seed');
        return;
      }
    }
  }

  if (!R2_CONFIGURED) await mkdir(STORAGE, { recursive: true });
  const bundles = await buildBundles();
  console.log(
    `prepared ${bundles.length} bundles (max ${MAX}); storage=${R2_CONFIGURED ? `R2:${R2_BUCKET}` : STORAGE}`,
  );

  // Author from path: each bundle attributes to a synthetic user derived from
  // the contributor folder it was sourced from (slugified).
  let okCount = 0;
  for (const b of bundles) {
    const authorId = await ensureContributorUser(db, b.contributor);
    const r = await seedBundle(db, authorId, b);
    if (r.ok) {
      okCount++;
      console.log(`  ✓ [${b.type}] ${b.title}  /${b.type}s/${r.slug}`);
    } else {
      console.log(`  ✗ [${b.type}] ${b.title} — ${r.reason}`);
    }
  }
  console.log(`\nseeded ${okCount}/${bundles.length} listings`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

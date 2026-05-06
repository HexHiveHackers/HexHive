# HexHive Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a SvelteKit + Bun project with Drizzle/Turso, Cloudflare R2, Better Auth (OAuth + passkeys), shadcn-svelte UI with retro accents, and ported Zod schemas — so subsequent plans can build the Romhacks vertical on top.

**Architecture:** SvelteKit app served by Bun (`adapter-bun`). Turso (libSQL) holds metadata via Drizzle. R2 holds files; the server only signs URLs. Better Auth owns sessions and writes its tables into the same Turso DB via the Drizzle adapter. Zod v4 schemas (ported from the original Nuxt repo) validate every server boundary.

**Tech Stack:** Bun, SvelteKit, TypeScript, Tailwind v4, shadcn-svelte, Drizzle ORM, Turso (libSQL), Cloudflare R2 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), Better Auth (+ passkey plugin), Zod v4, Vitest.

**Working dir:** `/home/user/Projects/hexhive` (already `git init`-ed; spec on `main`).

---

## File Structure (created by this plan)

```
hexhive/
  package.json  bun.lockb  bunfig.toml
  svelte.config.js  vite.config.ts  tsconfig.json
  drizzle.config.ts
  components.json                    # shadcn-svelte
  vitest.config.ts
  .env.example  .env                 # gitignored
  .gitignore
  src/
    app.html  app.css  app.d.ts
    hooks.server.ts                  # Better Auth handle + locals
    lib/
      index.ts
      utils.ts                       # cn() etc.
      auth.ts                        # Better Auth instance
      auth-client.ts                 # Better Auth client (browser)
      db/
        index.ts                     # Drizzle client
        schema.ts                    # all tables
      storage/
        r2.ts                        # presign PUT/GET, HEAD
      schemas/
        zod-helpers.ts
        listing.ts  romhack.ts  asset-hive.ts
        sprite.ts   sound.ts     script.ts
      server/
        auth-utils.ts                # requireUser()
      components/
        ui/                          # shadcn-svelte components
        layout/Header.svelte  Footer.svelte
        listings/TypeBadge.svelte
    routes/
      +layout.svelte  +layout.server.ts  +page.svelte
      (auth)/+layout.svelte
      (auth)/login/+page.svelte
      (auth)/signup/+page.svelte
      api/auth/[...all]/+server.ts   # Better Auth handler
  drizzle/                           # generated migrations
  tests/
    setup.ts
```

---

## Conventions for every task

- After every task: run `bun run lint` and `bun test` — both must pass before commit.
- Commits use conventional commits: `feat:`, `chore:`, `test:`, `docs:`.
- The agent uses `git -c user.email=jmynes@local -c user.name=jmynes commit ...` (no GitHub push, per spec).
- Never add `--no-verify` or skip hooks.

---

### Task 1: Scaffold SvelteKit + Bun

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `.gitignore`, `bunfig.toml`

- [ ] **Step 1: Scaffold the SvelteKit project**

```bash
cd /home/user/Projects/hexhive
bun x sv create . --template minimal --types ts --no-add-ons --install bun
```

Accept overwrite prompts only for the spec-free files. The existing `docs/` and `.git/` must remain.

- [ ] **Step 2: Replace the default Node adapter with adapter-bun**

```bash
bun remove @sveltejs/adapter-auto
bun add -D svelte-adapter-bun
```

Edit `svelte.config.js`:

```js
import adapter from 'svelte-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

- [ ] **Step 3: Verify the dev server boots**

```bash
bun run dev
```

Expected: server prints `VITE  ready` and `Local: http://localhost:5173/`. Kill with Ctrl-C.

- [ ] **Step 4: Add `.gitignore`**

```
node_modules
.svelte-kit
build
.env
.env.local
*.log
.DS_Store
/local.db
/local.db-journal
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit + Bun project"
```

---

### Task 2: Tailwind v4 + shadcn-svelte init

**Files:**
- Create: `src/app.css`, `components.json`, `src/lib/utils.ts`
- Modify: `vite.config.ts`, `src/routes/+layout.svelte`

- [ ] **Step 1: Install Tailwind v4 and shadcn deps**

```bash
bun add -D tailwindcss @tailwindcss/vite
bun add tailwind-variants clsx tailwind-merge
```

- [ ] **Step 2: Wire Tailwind v4 into Vite**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

- [ ] **Step 3: Create `src/app.css` with Tailwind import + retro font faces**

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-display: '"Press Start 2P"', ui-monospace, monospace;
}

@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-display: swap;
  src: local('Geist'), url('https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-400-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Press Start 2P';
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/press-start-2p@latest/latin-400-normal.woff2') format('woff2');
}

html { font-family: var(--font-sans); }
.font-display { font-family: var(--font-display); letter-spacing: 0.02em; }
```

- [ ] **Step 4: Import the stylesheet in `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 5: Run shadcn-svelte init**

```bash
bun x shadcn-svelte@latest init
```

When prompted: TypeScript yes, base color `slate`, css `src/app.css`, components alias `$lib/components`, utils alias `$lib/utils`.

- [ ] **Step 6: Add starter components**

```bash
bun x shadcn-svelte@latest add button card input label badge separator
```

- [ ] **Step 7: Sanity check**

```bash
bun run dev
```

Expected: dev server still serves a blank page with no console errors. Kill with Ctrl-C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind v4 + shadcn-svelte with retro display font"
```

---

### Task 3: Vitest setup + first utility test

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `src/lib/utils.test.ts`
- Modify: `package.json` (scripts), `src/lib/utils.ts` (already created by shadcn)

- [ ] **Step 1: Install Vitest and Svelte testing libs**

```bash
bun add -D vitest @testing-library/svelte @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.ts']
  }
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test/lint scripts in `package.json`**

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  }
}
```

- [ ] **Step 5: Write the failing test**

Create `src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('drops falsy values', () => {
    expect(cn('a', false && 'skip', undefined, 'b')).toBe('a b');
  });
  it('merges conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

- [ ] **Step 6: Run tests**

```bash
bun test
```

Expected: 3 passing (`cn` was created by shadcn-svelte init in Task 2).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Vitest with utils test as smoke harness"
```

---

### Task 4: Environment + Drizzle config + Turso connection

**Files:**
- Create: `.env.example`, `.env`, `drizzle.config.ts`, `src/lib/db/index.ts`

- [ ] **Step 1: Install DB deps**

```bash
bun add drizzle-orm @libsql/client
bun add -D drizzle-kit
```

- [ ] **Step 2: Create `.env.example` (committed)**

```
# Local dev: file: URL pointing at sqlite file. Production: turso libsql://...
DATABASE_URL="file:./local.db"
DATABASE_AUTH_TOKEN=""

# Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="hexhive-dev"
R2_PUBLIC_BASE_URL=""

# Better Auth
BETTER_AUTH_SECRET="dev-only-change-me-please-32-bytes"
BETTER_AUTH_URL="http://localhost:5173"

# OAuth (leave empty in dev to disable a provider)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
```

- [ ] **Step 3: Copy to `.env` for local dev**

```bash
cp .env.example .env
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined
  }
});
```

- [ ] **Step 5: Create `src/lib/db/index.ts`**

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN || undefined
});

export const db = drizzle(client, { schema });
export { schema };
```

- [ ] **Step 6: Add db scripts to `package.json`**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure Drizzle + Turso/libSQL connection and env"
```

---

### Task 5: Drizzle schema (all tables)

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/schema.test.ts`

- [ ] **Step 1: Write the schema**

Create `src/lib/db/schema.ts`:

```ts
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

const ts = (name: string) =>
  integer(name, { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull();

/* -------- Better Auth core (matches Better Auth's expected schema) -------- */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false)
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at')
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at')
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at')
});

export const passkey = sqliteTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type').notNull(),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
  transports: text('transports'),
  createdAt: ts('created_at')
});

/* -------- Application -------- */

export const profile = sqliteTable(
  'profile',
  {
    userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    bio: text('bio'),
    avatarKey: text('avatar_key'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at')
  },
  (t) => ({
    usernameIdx: uniqueIndex('profile_username_unique').on(sql`lower(${t.username})`)
  })
);

export const listingType = ['romhack', 'sprite', 'sound', 'script'] as const;
export type ListingType = (typeof listingType)[number];

export const listing = sqliteTable(
  'listing',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: listingType }).notNull(),
    slug: text('slug').notNull(),
    authorId: text('author_id').notNull().references(() => user.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    downloads: integer('downloads').notNull().default(0),
    mature: integer('mature', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: ['draft', 'published', 'hidden'] }).notNull().default('draft'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at')
  },
  (t) => ({
    typeSlugUnique: uniqueIndex('listing_type_slug_unique').on(t.type, t.slug),
    authorIdx: index('listing_author_idx').on(t.authorId),
    typeStatusIdx: index('listing_type_status_idx').on(t.type, t.status)
  })
);

export const listingVersion = sqliteTable(
  'listing_version',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull().references(() => listing.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    changelog: text('changelog'),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
    createdAt: ts('created_at')
  },
  (t) => ({
    listingIdx: index('listing_version_listing_idx').on(t.listingId)
  })
);

export const listingFile = sqliteTable(
  'listing_file',
  {
    id: text('id').primaryKey(),
    versionId: text('version_id').notNull().references(() => listingVersion.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    size: integer('size').notNull(),
    hash: text('hash')
  },
  (t) => ({
    versionIdx: index('listing_file_version_idx').on(t.versionId)
  })
);

export const romhackMeta = sqliteTable('romhack_meta', {
  listingId: text('listing_id').primaryKey().references(() => listing.id, { onDelete: 'cascade' }),
  baseRom: text('base_rom').notNull(),
  baseRomVersion: text('base_rom_version').notNull(),
  baseRomRegion: text('base_rom_region').notNull(),
  release: text('release').notNull(),
  categories: text('categories', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  states: text('states', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  screenshots: text('screenshots', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  boxart: text('boxart', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  trailer: text('trailer', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`)
});

export const assetHiveMeta = sqliteTable('asset_hive_meta', {
  listingId: text('listing_id').primaryKey().references(() => listing.id, { onDelete: 'cascade' }),
  targetedRoms: text('targeted_roms', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  fileCount: integer('file_count').notNull().default(0),
  totalSize: integer('total_size').notNull().default(0)
});

export const spriteMeta = sqliteTable('sprite_meta', {
  listingId: text('listing_id').primaryKey().references(() => listing.id, { onDelete: 'cascade' }),
  category: text('category', { mode: 'json' }).notNull(),
  fileMap: text('file_map', { mode: 'json' })
});

export const soundMeta = sqliteTable('sound_meta', {
  listingId: text('listing_id').primaryKey().references(() => listing.id, { onDelete: 'cascade' }),
  category: text('category', { enum: ['Attack', 'Cry', 'Jingle', 'SFX', 'Song'] }).notNull()
});

export const scriptMeta = sqliteTable('script_meta', {
  listingId: text('listing_id').primaryKey().references(() => listing.id, { onDelete: 'cascade' }),
  categories: text('categories', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  features: text('features', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  prerequisites: text('prerequisites', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  targetedVersions: text('targeted_versions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  tools: text('tools', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`)
});

export const flag = sqliteTable(
  'flag',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull().references(() => listing.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['mature', 'spam', 'illegal', 'other'] }).notNull(),
    reason: text('reason'),
    status: text('status', { enum: ['open', 'reviewed', 'dismissed'] }).notNull().default('open'),
    createdAt: ts('created_at')
  },
  (t) => ({
    listingIdx: index('flag_listing_idx').on(t.listingId),
    statusIdx: index('flag_status_idx').on(t.status)
  })
);
```

- [ ] **Step 2: Generate the first migration**

```bash
bun run db:generate
```

Expected: `drizzle/0000_<name>.sql` produced.

- [ ] **Step 3: Apply to local DB**

```bash
bun run db:migrate
```

Expected: `local.db` created at repo root.

- [ ] **Step 4: Write a roundtrip test**

Create `src/lib/db/schema.test.ts`:

```ts
import { describe, expect, it, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = createClient({ url: 'file::memory:?cache=shared' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
});

describe('schema roundtrip', () => {
  it('inserts and reads a romhack listing with version + file', async () => {
    await db.insert(schema.user).values({
      id: 'u1', name: 'Tester', email: 't@example.com'
    });
    await db.insert(schema.listing).values({
      id: 'l1', type: 'romhack', slug: 'kaizo-emerald',
      authorId: 'u1', title: 'Kaizo Emerald', description: '', status: 'published'
    });
    await db.insert(schema.romhackMeta).values({
      listingId: 'l1', baseRom: 'Emerald', baseRomVersion: 'v1.0',
      baseRomRegion: 'English', release: '1.0.0'
    });
    await db.insert(schema.listingVersion).values({
      id: 'v1', listingId: 'l1', version: '1.0.0', isCurrent: true
    });
    await db.insert(schema.listingFile).values({
      id: 'f1', versionId: 'v1', r2Key: 'a/b.ips',
      filename: 'b.ips', originalFilename: 'kaizo.ips', size: 1234
    });

    const rows = await db.select().from(schema.listing).where(eq(schema.listing.id, 'l1'));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('romhack');
  });

  it('rejects duplicate (type, slug)', async () => {
    await db.insert(schema.user).values({ id: 'u2', name: 'B', email: 'b@x.com' });
    await db.insert(schema.listing).values({
      id: 'l2', type: 'sprite', slug: 'shared', authorId: 'u2', title: 'a'
    });
    await expect(
      db.insert(schema.listing).values({
        id: 'l3', type: 'sprite', slug: 'shared', authorId: 'u2', title: 'b'
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
bun test src/lib/db/schema.test.ts
```

Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): add Drizzle schema for users, listings, versions, files, meta, flags"
```

---

### Task 6: R2 storage helper

**Files:**
- Create: `src/lib/storage/r2.ts`, `src/lib/storage/r2.test.ts`

- [ ] **Step 1: Install S3 client**

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/storage/r2.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: {
    R2_ACCOUNT_ID: 'acc', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's',
    R2_BUCKET: 'b'
  }
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example/url')
}));

beforeEach(() => vi.clearAllMocks());

describe('r2', () => {
  it('signs a PUT URL with the right bucket and key', async () => {
    const { presignPut } = await import('./r2');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const url = await presignPut('uploads/abc.bin', 'application/octet-stream', 1024);
    expect(url).toBe('https://signed.example/url');
    const cmd = (getSignedUrl as any).mock.calls[0][1];
    expect(cmd.input.Bucket).toBe('b');
    expect(cmd.input.Key).toBe('uploads/abc.bin');
    expect(cmd.input.ContentType).toBe('application/octet-stream');
    expect(cmd.input.ContentLength).toBe(1024);
  });

  it('signs a GET URL', async () => {
    const { presignGet } = await import('./r2');
    const url = await presignGet('uploads/abc.bin');
    expect(url).toBe('https://signed.example/url');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test src/lib/storage/r2.test.ts
```

Expected: FAIL — `./r2` module not found.

- [ ] **Step 4: Implement `src/lib/storage/r2.ts`**

```ts
import { env } from '$env/dynamic/private';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

const bucket = env.R2_BUCKET;

export async function presignPut(key: string, contentType: string, contentLength: number, expiresIn = 600) {
  const cmd = new PutObjectCommand({
    Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength
  });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function presignGet(key: string, expiresIn = 600) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function headObject(key: string) {
  return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
```

- [ ] **Step 5: Run tests**

```bash
bun test src/lib/storage/r2.test.ts
```

Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(storage): add R2 presign PUT/GET + HEAD helpers"
```

---

### Task 7: Better Auth instance

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/routes/api/auth/[...all]/+server.ts`, `src/hooks.server.ts`, `src/app.d.ts` (modify)

- [ ] **Step 1: Install Better Auth**

```bash
bun add better-auth
```

- [ ] **Step 2: Create `src/lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { passkey } from 'better-auth/plugins/passkey';
import { env } from '$env/dynamic/private';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: { enabled: false },

  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
    ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
      ? { discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET } }
      : {})
  },

  plugins: [passkey()]
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 3: Mount the handler at `/api/auth/[...all]`**

Create `src/routes/api/auth/[...all]/+server.ts`:

```ts
import { auth } from '$lib/auth';
import type { RequestHandler } from './$types';

const handle: RequestHandler = ({ request }) => auth.handler(request);
export const GET = handle;
export const POST = handle;
```

- [ ] **Step 4: Create `src/hooks.server.ts`**

```ts
import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;
  return resolve(event);
};
```

- [ ] **Step 5: Update `src/app.d.ts`**

```ts
import type { Session } from '$lib/auth';

declare global {
  namespace App {
    interface Locals {
      user: Session['user'] | null;
      session: Session['session'] | null;
    }
  }
}

export {};
```

- [ ] **Step 6: Create the browser client**

Create `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [passkeyClient()]
});
```

- [ ] **Step 7: Regenerate migrations (Better Auth tables already in schema, but confirm parity)**

```bash
bun run db:generate
```

Expected: "no schema changes detected" — schema in Task 5 already matches Better Auth.

- [ ] **Step 8: Smoke check**

```bash
bun run dev
```

Hit `http://localhost:5173/api/auth/get-session` in another shell:

```bash
curl -s http://localhost:5173/api/auth/get-session
```

Expected: `null` or empty session. No 500. Kill `dev`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): wire Better Auth (OAuth + passkeys) with Drizzle adapter"
```

---

### Task 8: `requireUser` helper + protected layout pattern

**Files:**
- Create: `src/lib/server/auth-utils.ts`, `src/lib/server/auth-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/auth-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { requireUser } from './auth-utils';

const fakeEvent = (user: any) => ({ locals: { user } }) as any;

describe('requireUser', () => {
  it('returns the user when present', () => {
    const u = { id: 'u1', email: 'a@b.com' };
    expect(requireUser(fakeEvent(u))).toBe(u);
  });

  it('throws a 401 redirect equivalent when missing', () => {
    expect(() => requireUser(fakeEvent(null))).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
bun test src/lib/server/auth-utils.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/server/auth-utils.ts`**

```ts
import { redirect } from '@sveltejs/kit';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';

type AnyEvent = Pick<RequestEvent | ServerLoadEvent, 'locals' | 'url'> | { locals: App.Locals; url?: URL };

export function requireUser(event: AnyEvent) {
  const u = event.locals.user;
  if (!u) {
    const next = 'url' in event && event.url ? `?next=${encodeURIComponent(event.url.pathname + event.url.search)}` : '';
    throw redirect(303, `/login${next}`);
  }
  return u;
}
```

- [ ] **Step 4: Verify pass**

```bash
bun test src/lib/server/auth-utils.test.ts
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): add requireUser auth-guard helper"
```

---

### Task 9: Login + Signup pages

**Files:**
- Create: `src/routes/(auth)/+layout.svelte`, `src/routes/(auth)/login/+page.svelte`, `src/routes/(auth)/signup/+page.svelte`, `src/routes/(auth)/+page.server.ts`

- [ ] **Step 1: Group layout**

Create `src/routes/(auth)/+layout.svelte`:

```svelte
<script lang="ts">
  let { children } = $props();
</script>

<main class="min-h-svh grid place-items-center px-4 py-16 bg-background">
  <div class="w-full max-w-sm">
    {@render children()}
  </div>
</main>
```

- [ ] **Step 2: Login page**

Create `src/routes/(auth)/login/+page.svelte`:

```svelte
<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  let loading = $state<string | null>(null);

  async function oauth(provider: 'google' | 'github' | 'discord') {
    loading = provider;
    await authClient.signIn.social({ provider, callbackURL: '/' });
  }

  async function passkey() {
    loading = 'passkey';
    await authClient.signIn.passkey();
    loading = null;
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Sign in</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('github')}>
      {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
    </Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('google')}>
      Continue with Google
    </Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('discord')}>
      Continue with Discord
    </Button>
    <Separator />
    <Button disabled={!!loading} onclick={passkey}>
      {loading === 'passkey' ? 'Authenticating…' : 'Sign in with passkey'}
    </Button>
    <p class="text-sm text-muted-foreground text-center">
      No account? <a class="underline" href="/signup">Sign up</a>
    </p>
  </CardContent>
</Card>
```

- [ ] **Step 3: Signup page (same shape, different copy + passkey register)**

Create `src/routes/(auth)/signup/+page.svelte`:

```svelte
<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  let loading = $state<string | null>(null);

  async function oauth(provider: 'google' | 'github' | 'discord') {
    loading = provider;
    await authClient.signIn.social({ provider, callbackURL: '/' });
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Create account</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <p class="text-sm text-muted-foreground">Sign up with an OAuth provider. You can add a passkey afterward in your account settings.</p>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('github')}>Continue with GitHub</Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('google')}>Continue with Google</Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('discord')}>Continue with Discord</Button>
    <Separator />
    <p class="text-sm text-muted-foreground text-center">
      Already have an account? <a class="underline" href="/login">Sign in</a>
    </p>
  </CardContent>
</Card>
```

- [ ] **Step 4: If already signed in, redirect away from auth pages**

Create `src/routes/(auth)/+page.server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
  return {};
};
```

- [ ] **Step 5: Smoke check**

```bash
bun run dev
```

Visit `http://localhost:5173/login`. Expected: card with three OAuth buttons + a passkey button. Buttons error gracefully (no provider configured) but the page renders. Kill `dev`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): add login + signup pages with OAuth and passkey buttons"
```

---

### Task 10: Port Zod helpers + listing/romhack/asset-hive schemas

**Files:**
- Create: `src/lib/schemas/zod-helpers.ts`, `src/lib/schemas/listing.ts`, `src/lib/schemas/romhack.ts`, `src/lib/schemas/asset-hive.ts`, plus `*.test.ts` for each

Reference: original `shared/zod-helpers.ts`, `shared/zod.ts`, `types/listing.d.ts` from `/tmp/HexHive`.

- [ ] **Step 1: Install Zod**

```bash
bun add zod
```

- [ ] **Step 2: Helpers module**

Create `src/lib/schemas/zod-helpers.ts`:

```ts
import { z } from 'zod';

export const ASSET_PERMISSION = ['Credit', 'Free', 'No-Donations', 'No-Profit'] as const;
export type AssetPermission = (typeof ASSET_PERMISSION)[number];

export const SUPPORTED_BASE_ROM = ['Emerald', 'Fire Red'] as const;
export const SUPPORTED_BASE_ROM_VERSION = ['v1.0', 'v1.1'] as const;
export const SUPPORTED_BASE_ROM_REGION = ['English', 'French', 'German', 'Italian', 'Japanese', 'Spanish'] as const;

export const baseRom = z.enum(SUPPORTED_BASE_ROM);
export const baseRomVersion = z.enum(SUPPORTED_BASE_ROM_VERSION);
export const baseRomRegion = z.enum(SUPPORTED_BASE_ROM_REGION);

export const username = z
  .string()
  .min(3, 'Username is required')
  .regex(/^[a-zA-Z0-9._\-+]+$/, 'Username can only contain letters, numbers, dots, dashes, underscores, and pluses');

export const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase kebab-case')
  .refine((s) => !/^\d+$/.test(s), 'Slug cannot be only numbers');
```

- [ ] **Step 3: Test helpers**

Create `src/lib/schemas/zod-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slug, username, baseRom } from './zod-helpers';

describe('slug', () => {
  it('accepts kebab-case', () => expect(slug.safeParse('kaizo-emerald').success).toBe(true));
  it('rejects digits-only', () => expect(slug.safeParse('1234').success).toBe(false));
  it('rejects uppercase', () => expect(slug.safeParse('Kaizo').success).toBe(false));
});

describe('username', () => {
  it('accepts allowed chars', () => expect(username.safeParse('user.name_1+').success).toBe(true));
  it('rejects spaces', () => expect(username.safeParse('a b').success).toBe(false));
  it('rejects @', () => expect(username.safeParse('a@b').success).toBe(false));
});

describe('baseRom', () => {
  it('accepts known roms', () => expect(baseRom.safeParse('Emerald').success).toBe(true));
  it('rejects unknown', () => expect(baseRom.safeParse('Crystal').success).toBe(false));
});
```

- [ ] **Step 4: Listing base schema**

Create `src/lib/schemas/listing.ts`:

```ts
import { z } from 'zod';
import { ASSET_PERMISSION, slug } from './zod-helpers';

export const ListingBase = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(10_000).default(''),
  permissions: z.array(z.enum(ASSET_PERMISSION)),
  slug: slug.optional()
});

export type ListingBaseInput = z.infer<typeof ListingBase>;
```

- [ ] **Step 5: Test listing base**

Create `src/lib/schemas/listing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ListingBase } from './listing';

describe('ListingBase', () => {
  it('accepts a minimal listing', () => {
    const r = ListingBase.safeParse({ title: 'Hi', description: '', permissions: ['Credit'] });
    expect(r.success).toBe(true);
  });
  it('requires a title', () => {
    expect(ListingBase.safeParse({ title: '', description: '', permissions: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 6: Romhack schema**

Create `src/lib/schemas/romhack.ts`:

```ts
import { z } from 'zod';
import { ListingBase } from './listing';
import { baseRom, baseRomVersion, baseRomRegion } from './zod-helpers';

export const RomhackInput = ListingBase.extend({
  baseRom,
  baseRomVersion,
  baseRomRegion,
  release: z.string().min(1).max(40),
  categories: z.array(z.string().min(1).max(60)).default([]),
  states: z.array(z.string().min(1).max(60)).default([]),
  tags: z.array(z.string().min(1).max(40)).default([]),
  screenshots: z.array(z.string().url()).default([]),
  boxart: z.array(z.string().url()).default([]),
  trailer: z.array(z.string().url()).default([])
});

export type RomhackInput = z.infer<typeof RomhackInput>;
```

- [ ] **Step 7: Test romhack**

Create `src/lib/schemas/romhack.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RomhackInput } from './romhack';

const ok = {
  title: 'Kaizo', permissions: ['Credit'] as const,
  baseRom: 'Emerald' as const, baseRomVersion: 'v1.0' as const, baseRomRegion: 'English' as const,
  release: '1.0.0'
};

describe('RomhackInput', () => {
  it('accepts a valid romhack', () => {
    expect(RomhackInput.safeParse(ok).success).toBe(true);
  });
  it('defaults arrays', () => {
    const r = RomhackInput.parse(ok);
    expect(r.categories).toEqual([]);
    expect(r.tags).toEqual([]);
  });
  it('rejects unknown base ROM', () => {
    expect(RomhackInput.safeParse({ ...ok, baseRom: 'Crystal' }).success).toBe(false);
  });
});
```

- [ ] **Step 8: Asset Hive base + Sound + Script + Sprite schemas**

Create `src/lib/schemas/asset-hive.ts`:

```ts
import { z } from 'zod';
import { ListingBase } from './listing';
import { SUPPORTED_BASE_ROM } from './zod-helpers';

export const AssetHiveInput = ListingBase.extend({
  targetedRoms: z.array(z.enum(SUPPORTED_BASE_ROM)).min(1)
});

export type AssetHiveInput = z.infer<typeof AssetHiveInput>;
```

Create `src/lib/schemas/sound.ts`:

```ts
import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';

export const SOUND_CATEGORY = ['Attack', 'Cry', 'Jingle', 'SFX', 'Song'] as const;

export const SoundInput = AssetHiveInput.extend({
  category: z.enum(SOUND_CATEGORY)
});
export type SoundInput = z.infer<typeof SoundInput>;
```

Create `src/lib/schemas/script.ts`:

```ts
import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';
import { SUPPORTED_BASE_ROM_VERSION } from './zod-helpers';

export const ScriptInput = AssetHiveInput.extend({
  categories: z.array(z.string().min(1)).min(1, 'At least one category must be selected'),
  features: z.array(z.string().min(1)).min(1, 'At least one feature must be selected'),
  prerequisites: z.array(z.string()).default([]),
  targetedVersions: z
    .array(z.enum(SUPPORTED_BASE_ROM_VERSION))
    .min(1)
    .refine((arr) => new Set(arr).size === arr.length, { message: 'Each version can only be selected once' }),
  tools: z.array(z.string().min(1)).min(1, 'At least one tool must be selected')
});
export type ScriptInput = z.infer<typeof ScriptInput>;
```

Create `src/lib/schemas/sprite.ts` (simplified — full SpriteVariant typing is deferred to the Sprites vertical plan):

```ts
import { z } from 'zod';
import { AssetHiveInput } from './asset-hive';

const SpriteEntry = z.object({
  type: z.string().min(1),
  subtype: z.string().min(1),
  variant: z
    .union([z.string(), z.array(z.string()), z.record(z.string(), z.union([z.string(), z.array(z.string())]))])
    .optional()
});

export const SpriteInput = AssetHiveInput.extend({
  category: z.union([SpriteEntry, z.array(SpriteEntry), z.record(z.string(), SpriteEntry)]),
  fileMap: z.record(z.string(), SpriteEntry).optional()
});
export type SpriteInput = z.infer<typeof SpriteInput>;
```

> The Sprites vertical plan will replace this with the full discriminated-union SpriteVariant typing ported from the original `zod-helpers.ts`.

- [ ] **Step 9: Tests for sound + script + sprite**

Create `src/lib/schemas/asset-hive.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SoundInput } from './sound';
import { ScriptInput } from './script';
import { SpriteInput } from './sprite';

const base = { title: 't', permissions: ['Free' as const], targetedRoms: ['Emerald' as const] };

describe('SoundInput', () => {
  it('accepts a valid sound', () => {
    expect(SoundInput.safeParse({ ...base, category: 'Cry' }).success).toBe(true);
  });
  it('rejects unknown category', () => {
    expect(SoundInput.safeParse({ ...base, category: 'Boom' }).success).toBe(false);
  });
});

describe('ScriptInput', () => {
  it('rejects duplicate targetedVersions', () => {
    expect(
      ScriptInput.safeParse({
        ...base, categories: ['Feature'], features: ['Engine'],
        targetedVersions: ['v1.0', 'v1.0'], tools: ['Python']
      }).success
    ).toBe(false);
  });
  it('accepts a valid script', () => {
    expect(
      ScriptInput.safeParse({
        ...base, categories: ['Feature'], features: ['Engine'],
        targetedVersions: ['v1.0'], tools: ['Python']
      }).success
    ).toBe(true);
  });
});

describe('SpriteInput', () => {
  it('accepts a single category entry', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' } }).success
    ).toBe(true);
  });
});
```

- [ ] **Step 10: Run all tests**

```bash
bun test
```

Expected: all pre-existing tests + the new schema tests passing.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(schemas): port Zod helpers + listing/romhack/asset-hive/sprite/sound/script schemas"
```

---

### Task 11: Layout shell — Header, Footer, TypeBadge, retro accents

**Files:**
- Create: `src/lib/components/layout/Header.svelte`, `src/lib/components/layout/Footer.svelte`, `src/lib/components/listings/TypeBadge.svelte`, `src/routes/+layout.server.ts`
- Modify: `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/app.css`

- [ ] **Step 1: Layout server load — pass user to client**

Create `src/routes/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
  user: locals.user
});
```

- [ ] **Step 2: TypeBadge component**

Create `src/lib/components/listings/TypeBadge.svelte`:

```svelte
<script lang="ts">
  type Type = 'romhack' | 'sprite' | 'sound' | 'script';
  let { type }: { type: Type } = $props();

  const styles: Record<Type, string> = {
    romhack: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    sprite: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40',
    sound: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    script: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40'
  };
</script>

<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-display uppercase tracking-wider border rounded {styles[type]}">
  {type}
</span>
```

- [ ] **Step 3: Header**

Create `src/lib/components/layout/Header.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { authClient } from '$lib/auth-client';

  let { user }: { user: { name: string; image?: string | null } | null } = $props();

  async function signOut() {
    await authClient.signOut();
    location.href = '/';
  }
</script>

<header class="border-b bg-background sticky top-0 z-10">
  <div class="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
    <a href="/" class="font-display text-lg tracking-wider">HEXHIVE</a>
    <nav class="flex items-center gap-1 text-sm">
      <a class="px-3 py-1 hover:underline" href="/romhacks">Romhacks</a>
      <a class="px-3 py-1 hover:underline" href="/sprites">Sprites</a>
      <a class="px-3 py-1 hover:underline" href="/sounds">Sounds</a>
      <a class="px-3 py-1 hover:underline" href="/scripts">Scripts</a>
      <span class="mx-2 h-5 w-px bg-border"></span>
      {#if user}
        <a class="px-3 py-1 hover:underline" href="/me">{user.name}</a>
        <Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
      {:else}
        <a class="px-3 py-1" href="/login">
          <Button variant="default" size="sm">Sign in</Button>
        </a>
      {/if}
    </nav>
  </div>
</header>
```

- [ ] **Step 4: Footer**

Create `src/lib/components/layout/Footer.svelte`:

```svelte
<footer class="border-t mt-16">
  <div class="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground flex justify-between">
    <span class="font-display tracking-wider">HEXHIVE</span>
    <span>Pokemon ROM hack assets · respect creators</span>
  </div>
</footer>
```

- [ ] **Step 5: Wire layout**

Replace `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-svh flex flex-col">
  <Header user={data.user} />
  <div class="flex-1">{@render children()}</div>
  <Footer />
</div>
```

- [ ] **Step 6: Home page placeholder with CRT-flavored hero**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
</script>

<section class="relative overflow-hidden border-b">
  <div class="absolute inset-0 pointer-events-none opacity-[0.06]"
       style="background-image: repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 3px);"></div>
  <div class="mx-auto max-w-6xl px-4 py-20 relative">
    <h1 class="font-display text-3xl md:text-5xl leading-tight">HEXHIVE</h1>
    <p class="mt-4 max-w-xl text-muted-foreground">
      Share and discover Pokemon ROM hack assets — full hacks, sprites, sounds, and scripts.
    </p>
    <div class="mt-6 flex gap-2">
      <TypeBadge type="romhack" />
      <TypeBadge type="sprite" />
      <TypeBadge type="sound" />
      <TypeBadge type="script" />
    </div>
  </div>
</section>

<section class="mx-auto max-w-6xl px-4 py-12">
  <p class="text-sm text-muted-foreground">No listings yet. Sign in and upload the first one.</p>
</section>
```

- [ ] **Step 7: Smoke check**

```bash
bun run dev
```

Visit `/`, `/login`, `/signup`. Header is sticky, retro display font on the wordmark and headline, badges visible, footer at bottom. Kill `dev`.

- [ ] **Step 8: Component test for TypeBadge**

Create `src/lib/components/listings/TypeBadge.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TypeBadge from './TypeBadge.svelte';

describe('TypeBadge', () => {
  it('renders the type', () => {
    render(TypeBadge, { type: 'romhack' });
    expect(screen.getByText('romhack')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run tests**

```bash
bun test
```

Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(ui): add header/footer/type-badge layout shell with retro accents"
```

---

### Task 12: Wrap-up — `bun run check` and tag

- [ ] **Step 1: Make sure svelte-check is clean**

```bash
bun run check
```

Expected: zero errors. Fix any TypeScript / a11y warnings before continuing.

- [ ] **Step 2: Make sure tests pass**

```bash
bun test
```

Expected: all green.

- [ ] **Step 3: Tag the foundation milestone**

```bash
git tag foundation-complete
git log --oneline
```

- [ ] **Step 4: Final commit (if `check` revealed fixes)**

```bash
# only if there are pending changes
git add -A
git commit -m "chore: clean up svelte-check warnings"
```

---

## Self-review

**Spec coverage:**
- Bun + SvelteKit + adapter-bun → Task 1 ✓
- Tailwind + shadcn-svelte + retro accents → Task 2, 11 ✓
- Drizzle + Turso + full schema → Tasks 4, 5 ✓
- R2 presigned URLs → Task 6 ✓
- Better Auth (OAuth + passkeys) → Tasks 7, 9 ✓
- `requireUser` helper → Task 8 ✓
- Zod helpers + per-type schemas → Task 10 ✓
- Layout shell, fonts, type-badge → Task 11 ✓
- Vitest harness → Task 3 ✓
- Routes for upload/listings/profiles/admin → **deferred to Plans 2–4** (intentional, see top of plan).

**Placeholders:** none. The Sprite schema is intentionally simplified with an explicit callout that Plan 3 (Sprites vertical) replaces it; all other schemas are complete.

**Type consistency:** `listingType` enum, `ASSET_PERMISSION`, base-ROM constants, and Better Auth table names line up across schema, helpers, and auth config.

---

## What this plan does NOT cover (intentional)

These are the next plans, in order:

- **Plan 2 — Romhacks vertical:** `/romhacks` list + filters, `/romhacks/[slug]` detail, `/upload/romhack`, presign+upload flow, download counter, server load functions, Romhack form components.
- **Plan 3 — Sprites / Sounds / Scripts verticals:** repeat the Romhacks pattern; replace `sprite.ts` with the full SpriteVariant discriminated union.
- **Plan 4 — Profiles, versioning UI, search/filter UX, moderation flags + admin queue.**

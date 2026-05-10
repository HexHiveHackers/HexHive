# Placeholder Accounts + Credit Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark synthetic seed users as placeholder accounts, capture an optional external creator URL on their profile, and render listing/tool credits in a unified `<CreditLine />` shape that links to the external creator when set.

**Architecture:** Add two columns (`user.is_placeholder`, `profile.homepage_url`). Extend the listing detail loaders to surface the author's username, placeholder flag, and homepage URL. Replace the inline `by {authorName}` markup on every listing detail page (romhack/sprite/sound/script) and the tool detail page with a shared `CreditLine` component. Backfill via an idempotent `scripts/backfill-placeholders.ts` that runs against local SQLite or Turso, flips the flag on existing `seed-aqua-*`/`seed-contrib-*` users, harvests homepage URLs from a clone of the Team-Aqua repo, and creates one placeholder user per unique tool author.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Drizzle ORM (libSQL/SQLite), Bun runtime, Vitest + @testing-library/svelte, Tailwind v4, shadcn-svelte.

**Spec:** `docs/superpowers/specs/2026-05-09-placeholder-accounts-design.md`.

---

## File map

**Schema:**
- Modify: `src/lib/db/schema.ts` — add `user.isPlaceholder`, `profile.homepageUrl`.
- Create: `drizzle/0008_placeholder_accounts.sql` — generated migration.

**Server data layer:**
- Modify: `src/lib/server/listings.ts` — extend `RomhackDetail`, `AssetHiveDetail`, `getRomhackBySlug`, `getAssetHiveBySlug` to surface `authorUsername`, `authorIsPlaceholder`, `authorHomepageUrl`.

**Shared UI:**
- Create: `src/lib/components/credit-line.svelte` — the unified `by …` line.
- Create: `src/lib/components/credit-line.test.ts` — four-state component test.

**Listing detail pages (each replaces inline `by {authorName}`):**
- Modify: `src/routes/romhacks/[slug]/+page.svelte`
- Modify: `src/routes/sprites/[slug]/+page.svelte`
- Modify: `src/routes/sounds/[slug]/+page.svelte`
- Modify: `src/routes/scripts/[slug]/+page.svelte`

**Tool detail page:**
- Modify: `src/routes/tools/[slug]/+page.server.ts` — look up `seed-tool-<slug>` user.
- Modify: `src/routes/tools/[slug]/+page.svelte` — render `CreditLine` when matched.

**Profile page:**
- Modify: `src/routes/u/[username]/+page.server.ts` — surface `isPlaceholder` + `homepageUrl`.
- Modify: `src/routes/u/[username]/+page.svelte` — placeholder banner.

**Backfill:**
- Create: `scripts/backfill-placeholders.ts`
- Create: `scripts/backfill-placeholders.test.ts`
- Create: `scripts/fixtures/contributor-readme-with-link.md` (test fixture)
- Create: `scripts/fixtures/contributor-readme-junk-only.md` (test fixture)

---

## Task 1: Schema additions + migration

**Files:**
- Modify: `src/lib/db/schema.ts:9-18` (user table) and `:75-95` (profile table)
- Create: `drizzle/0008_placeholder_accounts.sql` (generated)

- [ ] **Step 1: Add `isPlaceholder` to the `user` table**

In `src/lib/db/schema.ts`, locate the `user` table definition (it currently ends with `isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),`). Add a sibling column directly after `isAdmin`:

```ts
isPlaceholder: integer('is_placeholder', { mode: 'boolean' }).notNull().default(false),
```

- [ ] **Step 2: Add `homepageUrl` to the `profile` table**

In the same file, locate the `profile` table. After the existing `contactEmail: text('contact_email'),` line, add:

```ts
homepageUrl: text('homepage_url'),
```

- [ ] **Step 3: Generate the migration**

Run: `bun run db:generate`

Expected: a new file `drizzle/0008_<adjective>_<noun>.sql` is created. Open it and confirm it contains exactly two `ALTER TABLE` statements:

```sql
ALTER TABLE `user` ADD `is_placeholder` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `profile` ADD `homepage_url` text;
```

If Drizzle generates anything else (renames, drops), STOP and investigate — do not proceed.

- [ ] **Step 4: Rename the migration to a stable name**

Rename the generated file to `drizzle/0008_placeholder_accounts.sql`. Update `drizzle/meta/_journal.json` so the entry's `tag` field matches the new filename's stem (`0008_placeholder_accounts`).

Run: `bun run db:migrate`
Expected: "applied 1 migration" (or equivalent), no errors.

- [ ] **Step 5: Verify the columns exist**

Run: `sqlite3 local.db ".schema user"`
Expected: output contains `is_placeholder integer DEFAULT false NOT NULL`.

Run: `sqlite3 local.db ".schema profile"`
Expected: output contains `homepage_url text`.

- [ ] **Step 6: Type-check**

Run: `bun run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts drizzle/0008_placeholder_accounts.sql drizzle/meta/
git commit -m "$(cat <<'EOF'
feat(schema): add user.is_placeholder + profile.homepage_url

Lays the groundwork for placeholder accounts (synthetic users we create
on someone else's behalf for credit) and an optional external creator
URL on the profile.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extend listing detail loaders

The existing detail loaders return `authorName` only. To render `<CreditLine />` we need `authorUsername` (for the local `/u/<username>` link), `authorIsPlaceholder`, and `authorHomepageUrl`.

**Files:**
- Modify: `src/lib/server/listings.ts` (the `RomhackDetail` interface near line 175, `getRomhackBySlug` near line 185, the `AssetHiveDetail` interface near line 315, and `getAssetHiveBySlug` near line 329)
- Modify: `src/lib/server/listings.test.ts` (existing test file)

- [ ] **Step 1: Write failing tests for the new fields**

Open `src/lib/server/listings.test.ts`. There is an existing `getRomhackBySlug` test and an existing `getAssetHiveBySlug` test. Inside each, after the existing assertions, add assertions for the three new fields.

For the romhack test (find the block where it inserts a fixture user + listing and calls `getRomhackBySlug`), update fixture insertion to write `isPlaceholder: true` on the user and `homepageUrl: 'https://example.com/me'` on the profile, then assert:

```ts
expect(detail?.authorUsername).toBe('alice');
expect(detail?.authorIsPlaceholder).toBe(true);
expect(detail?.authorHomepageUrl).toBe('https://example.com/me');
```

If the existing test does not already create a profile row for the author, add a profile insert with `username: 'alice'` first (`getProfileByUsername` won't be involved — we insert directly).

Mirror the same change in the `getAssetHiveBySlug` test.

- [ ] **Step 2: Run the tests and verify failure**

Run: `bun run test src/lib/server/listings.test.ts`
Expected: FAIL with "expected undefined to be 'alice'" (or similar) because the fields don't yet exist on the return type.

- [ ] **Step 3: Extend the `RomhackDetail` interface**

In `src/lib/server/listings.ts`, locate the `RomhackDetail` interface (around line 175). Add three fields after `authorName`:

```ts
authorUsername: string | null;
authorIsPlaceholder: boolean;
authorHomepageUrl: string | null;
```

- [ ] **Step 4: Populate those fields in `getRomhackBySlug`**

In the same file, locate `getRomhackBySlug`. Replace the existing `authorRows` block (the `db.select({ name: schema.user.name }).from(schema.user)…` query) with a join that pulls profile + user fields:

```ts
const authorRows = await db
  .select({
    name: schema.user.name,
    isPlaceholder: schema.user.isPlaceholder,
    username: schema.profile.username,
    homepageUrl: schema.profile.homepageUrl,
  })
  .from(schema.user)
  .leftJoin(schema.profile, eq(schema.profile.userId, schema.user.id))
  .where(eq(schema.user.id, listing.authorId))
  .limit(1);
```

Then update the return object:

```ts
return {
  listing,
  meta: metaRows[0],
  version: versionRows[0],
  files: fileRows,
  versions,
  authorName: authorRows[0]?.name ?? 'unknown',
  authorUsername: authorRows[0]?.username ?? null,
  authorIsPlaceholder: authorRows[0]?.isPlaceholder ?? false,
  authorHomepageUrl: authorRows[0]?.homepageUrl ?? null,
};
```

- [ ] **Step 5: Mirror the same change in `AssetHiveDetail` + `getAssetHiveBySlug`**

Add the same three fields to `AssetHiveDetail` (around line 320). In `getAssetHiveBySlug`, replace the existing `author` query block with the same joined select shape, and update the return object to include the three new fields.

- [ ] **Step 6: Run the tests and verify pass**

Run: `bun run test src/lib/server/listings.test.ts`
Expected: PASS for both updated tests.

- [ ] **Step 7: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings on both.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/listings.ts src/lib/server/listings.test.ts
git commit -m "$(cat <<'EOF'
feat(listings): expose author username + placeholder + homepage URL

Detail loaders now join through profile so listing pages can render the
unified credit line: link to /u/<username> by default, or out to the
real creator's homepage when the placeholder profile has one.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `<CreditLine />` component + tests

**Files:**
- Create: `src/lib/components/credit-line.svelte`
- Create: `src/lib/components/credit-line.test.ts`

- [ ] **Step 1: Write the failing component test**

Create `src/lib/components/credit-line.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CreditLine from './credit-line.svelte';

describe('CreditLine', () => {
  it('links to /u/<username> when no homepage URL', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: null,
      isPlaceholder: false,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', '/u/alice');
    expect(link).not.toHaveAttribute('target');
    expect(screen.queryByText(/placeholder credit/i)).toBeNull();
  });

  it('links to the homepage URL when set, opens new tab', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: 'https://example.com/me',
      isPlaceholder: false,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', 'https://example.com/me');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders the placeholder badge when isPlaceholder is true', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: null,
      isPlaceholder: true,
    });
    expect(screen.getByText(/placeholder credit/i)).toBeTruthy();
  });

  it('renders both badge and external link when placeholder + homepage', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: 'https://example.com/me',
      isPlaceholder: true,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', 'https://example.com/me');
    expect(screen.getByText(/placeholder credit/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `bun run test src/lib/components/credit-line.test.ts`
Expected: FAIL with "Cannot find module './credit-line.svelte'".

- [ ] **Step 3: Implement the component**

Create `src/lib/components/credit-line.svelte`:

```svelte
<script lang="ts">
  type Props = {
    displayName: string;
    username: string;
    homepageUrl: string | null;
    isPlaceholder: boolean;
  };
  let { displayName, username, homepageUrl, isPlaceholder }: Props = $props();
  const href = homepageUrl ?? `/u/${username}`;
  const external = homepageUrl !== null;
</script>

<span class="inline-flex items-center gap-2 text-sm text-zinc-300">
  <span>by</span>
  <a
    {href}
    class="text-foreground hover:text-sky-300 underline-offset-2 hover:underline"
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {displayName}
  </a>
  {#if isPlaceholder}
    <span
      class="font-display rounded-sm border border-zinc-700/70 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-zinc-400"
    >
      Placeholder credit
    </span>
  {/if}
</span>
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `bun run test src/lib/components/credit-line.test.ts`
Expected: 4/4 PASS.

- [ ] **Step 5: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/credit-line.svelte src/lib/components/credit-line.test.ts
git commit -m "$(cat <<'EOF'
feat(ui): add <CreditLine /> shared component

Renders the standard \`by <name>\` line with optional external homepage
link and a placeholder-credit badge. Used by every listing detail page
and the tool detail page.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire `<CreditLine />` into the four listing detail pages

The four listing detail pages each currently render `<span>by {authorName}</span>`. Swap that span for `<CreditLine />`. The data is already present on `data.detail` after Task 2.

**Files:**
- Modify: `src/routes/sprites/[slug]/+page.svelte:51`
- Modify: `src/routes/romhacks/[slug]/+page.svelte:34`
- Modify: `src/routes/sounds/[slug]/+page.svelte:36`
- Modify: `src/routes/scripts/[slug]/+page.svelte:35`

- [ ] **Step 1: Update the sprites detail page**

In `src/routes/sprites/[slug]/+page.svelte`, add to the existing `<script lang="ts">` block (alongside the other imports):

```ts
import CreditLine from '$lib/components/credit-line.svelte';
```

Replace the line `<span>by {authorName}</span><span>·</span>` with:

```svelte
<CreditLine
  displayName={data.detail.authorName}
  username={data.detail.authorUsername ?? ''}
  homepageUrl={data.detail.authorHomepageUrl}
  isPlaceholder={data.detail.authorIsPlaceholder}
/>
<span>·</span>
```

The `authorName` `$derived` near the top of the file becomes unused for this purpose; leave it in place (it may be referenced elsewhere on the page).

- [ ] **Step 2: Repeat for romhacks**

In `src/routes/romhacks/[slug]/+page.svelte`, add the same import. Replace `<span>by {authorName}</span>` with:

```svelte
<CreditLine
  displayName={data.detail.authorName}
  username={data.detail.authorUsername ?? ''}
  homepageUrl={data.detail.authorHomepageUrl}
  isPlaceholder={data.detail.authorIsPlaceholder}
/>
```

- [ ] **Step 3: Repeat for sounds**

In `src/routes/sounds/[slug]/+page.svelte`, add the import. Replace `<span>by {authorName}</span><span>·</span>` with:

```svelte
<CreditLine
  displayName={data.detail.authorName}
  username={data.detail.authorUsername ?? ''}
  homepageUrl={data.detail.authorHomepageUrl}
  isPlaceholder={data.detail.authorIsPlaceholder}
/>
<span>·</span>
```

- [ ] **Step 4: Repeat for scripts**

In `src/routes/scripts/[slug]/+page.svelte`, add the import. Replace `<span>by {authorName}</span><span>·</span>` with:

```svelte
<CreditLine
  displayName={data.detail.authorName}
  username={data.detail.authorUsername ?? ''}
  homepageUrl={data.detail.authorHomepageUrl}
  isPlaceholder={data.detail.authorIsPlaceholder}
/>
<span>·</span>
```

- [ ] **Step 5: Type-check, lint, run tests**

Run: `bun run check && bun run lint && bun run test`
Expected: 0 errors, 0 warnings; all tests pass.

- [ ] **Step 6: Manual smoke test**

Run: `bun run dev`

Visit `http://localhost:5173/sprites` and click into any sprite listing. Expected: the credit line renders `by <Name>` linking to the local profile (no homepage set yet). No placeholder badge yet (flag isn't set yet either). Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/routes/sprites src/routes/romhacks src/routes/sounds src/routes/scripts
git commit -m "$(cat <<'EOF'
feat(listings): render unified credit line on all detail pages

Replaces the inline 'by {authorName}' span with the shared CreditLine
component so romhack/sprite/sound/script pages all use the same shape
and pick up homepage links + placeholder badges automatically.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Profile page placeholder banner

**Files:**
- Modify: `src/routes/u/[username]/+page.server.ts`
- Modify: `src/routes/u/[username]/+page.svelte`

- [ ] **Step 1: Surface the new fields from the loader**

In `src/routes/u/[username]/+page.server.ts`, change the `userRows` select to include `isPlaceholder`:

```ts
const userRows = await db
  .select({ name: schema.user.name, isPlaceholder: schema.user.isPlaceholder })
  .from(schema.user)
  .where(eq(schema.user.id, profile.userId))
  .limit(1);
```

In the returned `profile` object, add two fields:

```ts
homepageUrl: profile.homepageUrl,
isPlaceholder: userRows[0]?.isPlaceholder ?? false,
```

- [ ] **Step 2: Render the banner in the page**

Open `src/routes/u/[username]/+page.svelte`. Near the top of the page content (above the bio/listings, below any header/avatar block), add:

```svelte
{#if data.profile.isPlaceholder}
  <div class="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
    <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-amber-300">Placeholder credit</span>
    <p class="mt-1 leading-relaxed">
      This account was created by HexHive on behalf of the original creator.
      {#if data.profile.homepageUrl}
        <a
          href={data.profile.homepageUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="text-amber-200 underline-offset-2 hover:underline"
        >
          Visit creator
        </a>.
      {/if}
    </p>
  </div>
{/if}
```

If the existing page already has a top-of-content `<section>` wrapper, place the snippet inside it before the bio block. Inspect the existing markup before pasting — keep the snippet at the same indentation level as siblings.

- [ ] **Step 3: Get profile loader to surface homepageUrl**

`getProfileByUsername` already returns the full row from `profile`, so `profile.homepageUrl` should be present. Verify by reading `src/lib/server/profiles.ts` — if the function is `db.select().from(profile)` (no field whitelist), no change is needed. If it has an explicit field whitelist, add `homepageUrl: schema.profile.homepageUrl` to the select.

- [ ] **Step 4: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/routes/u src/lib/server/profiles.ts
git commit -m "$(cat <<'EOF'
feat(profile): show banner on placeholder accounts

When a profile belongs to a placeholder user, show an amber banner
explaining the account was created for credit, with an outbound link
to the original creator's homepage if known.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Backfill script — Phase A (flag existing seed users)

**Files:**
- Create: `scripts/backfill-placeholders.ts`
- Create: `scripts/backfill-placeholders.test.ts`

- [ ] **Step 1: Write the failing Phase A test**

Create `scripts/backfill-placeholders.test.ts`:

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../src/lib/db/schema';
import { runPhaseA, runPhaseC } from './backfill-placeholders';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(async () => {
  const client = createClient({ url: ':memory:' });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
});

describe('runPhaseA', () => {
  it('flags seed-aqua-* and seed-contrib-* users as placeholder', async () => {
    await db.insert(schema.user).values([
      { id: 'seed-aqua-archie', name: 'Archie', email: 'archie@team-aqua.seed' },
      { id: 'seed-contrib-coffee_cup', name: 'Coffee Cup', email: 'coffee_cup@team-aqua.seed' },
      { id: 'real-user-1', name: 'Real', email: 'real@example.com' },
    ]);

    await runPhaseA(db);

    const archie = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-aqua-archie'));
    const cc = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-contrib-coffee_cup'));
    const real = await db.select().from(schema.user).where(eq(schema.user.id, 'real-user-1'));

    expect(archie[0].isPlaceholder).toBe(true);
    expect(cc[0].isPlaceholder).toBe(true);
    expect(real[0].isPlaceholder).toBe(false);
  });

  it('is idempotent', async () => {
    await db.insert(schema.user).values([
      { id: 'seed-aqua-archie', name: 'Archie', email: 'archie@team-aqua.seed', isPlaceholder: true },
    ]);
    await runPhaseA(db);
    const archie = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-aqua-archie'));
    expect(archie[0].isPlaceholder).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify failure**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: FAIL with "Cannot find module './backfill-placeholders'" (or similar).

- [ ] **Step 3: Create the script with Phase A**

Create `scripts/backfill-placeholders.ts`:

```ts
/**
 * Idempotent backfill: marks existing synthetic seed users as placeholder
 * accounts, harvests homepage URLs from a Team-Aqua repo clone, and ensures a
 * placeholder user exists per unique tool author in src/lib/data/tools.ts.
 *
 * Run locally:        bun scripts/backfill-placeholders.ts
 * Against Turso:      DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bun scripts/backfill-placeholders.ts
 * Custom repo path:   REPO=/path/to/Team-Aquas-Asset-Repo bun scripts/backfill-placeholders.ts
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, like, or } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export async function runPhaseA(db: DB): Promise<{ flagged: number }> {
  const result = await db
    .update(schema.user)
    .set({ isPlaceholder: true })
    .where(or(like(schema.user.id, 'seed-aqua-%'), like(schema.user.id, 'seed-contrib-%')))
    .returning({ id: schema.user.id });
  return { flagged: result.length };
}

async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./local.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  const a = await runPhaseA(db);
  console.log(`Phase A: flagged ${a.flagged} seed users as placeholder.`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: 2/2 PASS.

- [ ] **Step 5: Run Phase A against local DB and verify**

Run: `bun scripts/backfill-placeholders.ts`
Expected: console output `Phase A: flagged N seed users as placeholder.` where N is the number of `seed-*` users in `local.db`.

Run: `sqlite3 local.db "SELECT id, is_placeholder FROM user WHERE id LIKE 'seed-%' LIMIT 5;"`
Expected: every row has `is_placeholder=1`.

- [ ] **Step 6: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add scripts/backfill-placeholders.ts scripts/backfill-placeholders.test.ts
git commit -m "$(cat <<'EOF'
feat(scripts): backfill placeholders Phase A

Adds an idempotent CLI that flips is_placeholder=true on every
seed-aqua-* and seed-contrib-* user. Targets local SQLite by default
or any libsql URL via DATABASE_URL/DATABASE_AUTH_TOKEN.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Backfill script — Phase B (Team-Aqua URL harvest)

**Files:**
- Modify: `scripts/backfill-placeholders.ts`
- Modify: `scripts/backfill-placeholders.test.ts`
- Create: `scripts/fixtures/contributor-readme-with-link.md`
- Create: `scripts/fixtures/contributor-readme-junk-only.md`

- [ ] **Step 1: Create fixture READMEs**

Create `scripts/fixtures/contributor-readme-with-link.md`:

```markdown
# Coffee Cup's sprites

Bunch of overworld sprites. Original work by me.

Find me on PokéCommunity: https://www.pokecommunity.com/members/coffeecup.42
Or GitHub: https://github.com/coffeecup-dev

![preview](preview.png)
```

Create `scripts/fixtures/contributor-readme-junk-only.md`:

```markdown
# Random folder

Some assets here.

Discord: https://discord.gg/abcd1234
Preview: https://i.imgur.com/abc.png
```

- [ ] **Step 2: Write failing tests for the URL extractor**

Append to `scripts/backfill-placeholders.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { extractCreatorUrl, slugifyContributor } from './backfill-placeholders';

describe('extractCreatorUrl', () => {
  it('returns the first allowlisted URL from a README', async () => {
    const md = await readFile('scripts/fixtures/contributor-readme-with-link.md', 'utf8');
    expect(extractCreatorUrl(md)).toBe('https://www.pokecommunity.com/members/coffeecup.42');
  });

  it('returns null when only junk URLs are present (Discord invites, image hosts)', async () => {
    const md = await readFile('scripts/fixtures/contributor-readme-junk-only.md', 'utf8');
    expect(extractCreatorUrl(md)).toBeNull();
  });
});

describe('slugifyContributor', () => {
  it('matches the seed-contrib- slug for known folders', () => {
    expect(slugifyContributor('Coffee Cup')).toBe('coffee_cup');
    expect(slugifyContributor('Francis III')).toBe('francis_iii');
    expect(slugifyContributor('Black Fragrant')).toBe('black_fragrant');
  });
});
```

- [ ] **Step 3: Run the tests, verify failure**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: FAIL with "extractCreatorUrl is not defined" (or similar).

- [ ] **Step 4: Implement extractor + slugifier + Phase B**

In `scripts/backfill-placeholders.ts`, add the helpers and Phase B function. Add at the top with the existing imports:

```ts
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
```

Add the following exported helpers (place above `runPhaseA`):

```ts
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
      const profileRows = await db
        .select()
        .from(schema.profile)
        .where(eq(schema.profile.userId, userId))
        .limit(1);
      if (!profileRows[0]) continue;
      if (profileRows[0].homepageUrl) continue;
      await db
        .update(schema.profile)
        .set({ homepageUrl: url })
        .where(eq(schema.profile.userId, userId));
      updated += 1;
    }
  }
  return { updated };
}
```

Update `main()` to call Phase B too:

```ts
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
}
```

- [ ] **Step 5: Run the tests, verify pass**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Run Phase B against local DB and spot-check**

Run: `REPO=/home/user/Team-Aquas-Asset-Repo bun scripts/backfill-placeholders.ts`
Expected: console output reports a non-zero `Phase B: harvested N homepage URLs` (or zero if no contributor README in the repo has an allowlisted URL — that's fine, the harvest is best-effort).

Spot check: `sqlite3 local.db "SELECT username, homepage_url FROM profile WHERE homepage_url IS NOT NULL LIMIT 5;"`

- [ ] **Step 7: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 8: Commit**

```bash
git add scripts/backfill-placeholders.ts scripts/backfill-placeholders.test.ts scripts/fixtures
git commit -m "$(cat <<'EOF'
feat(scripts): backfill placeholders Phase B

Walks a Team-Aqua repo clone and copies allowlisted creator URLs
(GitHub / PokéCommunity / Twitter etc.) from per-folder READMEs into
the matching seed-contrib-* profile.homepage_url.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Backfill script — Phase C (tool authors)

**Files:**
- Modify: `scripts/backfill-placeholders.ts`
- Modify: `scripts/backfill-placeholders.test.ts`

- [ ] **Step 1: Write the failing Phase C test**

Append to `scripts/backfill-placeholders.test.ts`:

```ts
import { runPhaseC } from './backfill-placeholders';

describe('runPhaseC', () => {
  it('creates a placeholder user + profile per unique tool author', async () => {
    const tools = [
      { author: 'Pawkkie', authorUrl: 'https://github.com/Pawkkie' },
      { author: 'Pawkkie', authorUrl: 'https://github.com/Pawkkie' }, // duplicate
      { author: 'BinaryHero', authorUrl: undefined },
    ];

    const r = await runPhaseC(db, tools);

    expect(r.created).toBe(2);
    const pawkkie = await db.select().from(schema.user).where(eq(schema.user.id, 'seed-tool-pawkkie'));
    expect(pawkkie[0].isPlaceholder).toBe(true);
    expect(pawkkie[0].name).toBe('Pawkkie');
    const pawkkieProfile = await db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, 'seed-tool-pawkkie'));
    expect(pawkkieProfile[0].username).toBe('pawkkie');
    expect(pawkkieProfile[0].homepageUrl).toBe('https://github.com/Pawkkie');
    const binProfile = await db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, 'seed-tool-binaryhero'));
    expect(binProfile[0].homepageUrl).toBeNull();
  });

  it('is idempotent and fills in homepage_url on a second pass', async () => {
    await runPhaseC(db, [{ author: 'Pawkkie', authorUrl: undefined }]);
    const r = await runPhaseC(db, [{ author: 'Pawkkie', authorUrl: 'https://github.com/Pawkkie' }]);
    expect(r.created).toBe(0);
    const profile = await db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, 'seed-tool-pawkkie'));
    expect(profile[0].homepageUrl).toBe('https://github.com/Pawkkie');
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: FAIL with "runPhaseC is not exported" (or similar).

- [ ] **Step 3: Implement Phase C**

Add to `scripts/backfill-placeholders.ts` (above `main`):

```ts
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
      await db
        .update(schema.profile)
        .set({ homepageUrl: t.authorUrl })
        .where(eq(schema.profile.userId, id));
    }
  }
  return { created };
}
```

Update `main` to import the tools list and call Phase C:

```ts
import { listTools } from '../src/lib/data/tools';
```

```ts
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
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `bun run test scripts/backfill-placeholders.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the full backfill against local DB**

Run: `bun scripts/backfill-placeholders.ts`
Expected: three lines of output (Phase A / B / C) with non-zero counts on first run, zeros on a second run.

Spot check: `sqlite3 local.db "SELECT u.id, u.name, p.homepage_url FROM user u LEFT JOIN profile p ON p.user_id=u.id WHERE u.id LIKE 'seed-tool-%';"`
Expected: one row per unique tool author with a slugified id and (where set) the authorUrl.

- [ ] **Step 6: Type-check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add scripts/backfill-placeholders.ts scripts/backfill-placeholders.test.ts
git commit -m "$(cat <<'EOF'
feat(scripts): backfill placeholders Phase C

Creates one placeholder user per unique tool author from
src/lib/data/tools.ts, mirroring authorUrl onto profile.homepage_url
so tool detail pages can render the unified credit line.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Wire `<CreditLine />` into the tool detail page

**Files:**
- Modify: `src/routes/tools/[slug]/+page.server.ts`
- Modify: `src/routes/tools/[slug]/+page.svelte`

- [ ] **Step 1: Look up the placeholder user in the loader**

Open `src/routes/tools/[slug]/+page.server.ts`. Read the existing implementation; it currently returns `{ tool }` from a seed-data lookup. Replace its body with:

```ts
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { getTool } from '$lib/data/tools';
import type { PageServerLoad } from './$types';

function slugifyAuthor(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'unknown'
  );
}

export const load: PageServerLoad = async ({ params }) => {
  const tool = getTool(params.slug);
  if (!tool) throw error(404, 'Not found');

  const userId = `seed-tool-${slugifyAuthor(tool.author)}`;
  const rows = await db
    .select({
      isPlaceholder: schema.user.isPlaceholder,
      username: schema.profile.username,
      homepageUrl: schema.profile.homepageUrl,
    })
    .from(schema.user)
    .leftJoin(schema.profile, eq(schema.profile.userId, schema.user.id))
    .where(eq(schema.user.id, userId))
    .limit(1);
  const credit = rows[0]
    ? {
        username: rows[0].username ?? '',
        isPlaceholder: rows[0].isPlaceholder,
        homepageUrl: rows[0].homepageUrl ?? tool.authorUrl ?? null,
      }
    : null;

  return { tool, credit };
};
```

If the original loader's import for `getTool` (or `listTools`) differs, adjust accordingly — the goal is: `tool` lookup unchanged, plus a new `credit` payload.

- [ ] **Step 2: Render the CreditLine in the page**

Open `src/routes/tools/[slug]/+page.svelte`. Add the import:

```ts
import CreditLine from '$lib/components/credit-line.svelte';
```

Replace the existing inline credit block (the `<span>by …</span>` with the `{#if tool.authorUrl} … {:else} … {/if}` ternary, around lines 39–48) with:

```svelte
{#if data.credit}
  <CreditLine
    displayName={tool.author}
    username={data.credit.username}
    homepageUrl={data.credit.homepageUrl}
    isPlaceholder={data.credit.isPlaceholder}
  />
{:else}
  <span class="inline-flex items-center gap-2 text-sm text-zinc-300">
    <span>by</span>
    {#if tool.authorUrl}
      <a
        href={tool.authorUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground hover:text-sky-300 underline-offset-2 hover:underline"
      >
        {tool.author}
      </a>
    {:else}
      <span class="text-foreground">{tool.author}</span>
    {/if}
  </span>
{/if}
```

The fallback (`{:else}`) keeps the page working when the backfill hasn't been run on this DB.

- [ ] **Step 3: Type-check, lint, run tests**

Run: `bun run check && bun run lint && bun run test`
Expected: 0 errors, 0 warnings; all tests pass.

- [ ] **Step 4: Manual smoke test**

Run: `bun run dev` and visit a tool page (e.g. `http://localhost:5173/tools/<some-slug>`).

Expected: the credit line renders `by <Author>` linking to either the homepage URL or `/u/<author-slug>`, with a "Placeholder credit" badge. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/routes/tools/\[slug\]
git commit -m "$(cat <<'EOF'
feat(tools): render unified credit line on tool detail page

Resolves tool.author through the seed-tool-* placeholder user when
present so the tool credit line and listing credit lines share one
component, with a graceful fallback to the prior inline rendering.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Run backfill against staging + prod, smoke-test

**Files:** none (operational task).

- [ ] **Step 1: Confirm staging credentials are available**

Run: `railway environment` and confirm staging is selectable. Run: `railway environment staging` to switch.

Run: `railway variables --kv | grep -E '^DATABASE_URL=|^DATABASE_AUTH_TOKEN=' | sed 's/=.*/=<redacted>/'`
Expected: both variables present.

- [ ] **Step 2: Run backfill against staging**

```bash
DATABASE_URL=$(railway variables --kv | sed -n 's/^DATABASE_URL=//p') \
DATABASE_AUTH_TOKEN=$(railway variables --kv | sed -n 's/^DATABASE_AUTH_TOKEN=//p') \
REPO=/home/user/Team-Aquas-Asset-Repo \
bun scripts/backfill-placeholders.ts
```

Expected: three Phase lines with non-zero counts.

But first: apply the migration to staging.

```bash
DATABASE_URL=$(railway variables --kv | sed -n 's/^DATABASE_URL=//p') \
DATABASE_AUTH_TOKEN=$(railway variables --kv | sed -n 's/^DATABASE_AUTH_TOKEN=//p') \
bun run db:migrate
```

Then re-run the backfill above.

- [ ] **Step 3: Smoke-test staging**

Visit the staging deploy and click into a sprite listing. Verify the credit line + badge render. Visit a tool page. Verify the same.

- [ ] **Step 4: Repeat for production**

```bash
railway environment production
DATABASE_URL=$(railway variables --kv | sed -n 's/^DATABASE_URL=//p') \
DATABASE_AUTH_TOKEN=$(railway variables --kv | sed -n 's/^DATABASE_AUTH_TOKEN=//p') \
bun run db:migrate

DATABASE_URL=$(railway variables --kv | sed -n 's/^DATABASE_URL=//p') \
DATABASE_AUTH_TOKEN=$(railway variables --kv | sed -n 's/^DATABASE_AUTH_TOKEN=//p') \
REPO=/home/user/Team-Aquas-Asset-Repo \
bun scripts/backfill-placeholders.ts
```

Expected: migrate applies cleanly; backfill reports counts; a second invocation reports zeros (idempotent).

- [ ] **Step 5: Smoke-test production**

Visit `https://hexhive-production.up.railway.app` (or `https://hexhive.app` if the cert flip has landed), click into any listing and tool. Verify the unified credit line renders and the placeholder badge shows on seed-authored content.

No commit for this task — operational only.

---

## Self-review notes

Cross-checked spec → plan coverage:

- Schema (`user.is_placeholder` + `profile.homepage_url`) → Task 1.
- Backfill Phase A → Task 6. Phase B → Task 7. Phase C → Task 8.
- `CreditLine` component → Task 3, wired into 4 listing pages → Task 4, tool page → Task 9.
- Profile page banner → Task 5.
- Component test (4 states) → Task 3.
- Backfill tests (URL extractor, slugify, Phase C) → Tasks 6/7/8.
- Rollout (staging + prod) → Task 10.

No placeholders or "TBDs" remain. Type names (`runPhaseA`/`runPhaseB`/`runPhaseC`, `slugifyContributor`, `extractCreatorUrl`, `ToolAuthorInput`) are consistent across tasks.

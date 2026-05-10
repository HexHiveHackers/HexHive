# Placeholder accounts + credit display

**Status:** Drafted 2026-05-09
**Owner:** jmynes

## Problem

Every listing on HexHive currently belongs to a synthetic "seed" user (e.g. `seed-contrib-coffee_cup`, `seed-aqua-archie`) that the Team-Aqua seeder created so author attribution mirrors the on-disk `<asset-type>/<creator>/` structure of the source repo. Tools (`src/lib/data/tools.ts`) credit a real human via a free-text `author` + optional `authorUrl` and have no user account at all.

Two gaps follow:

1. There is no structural way to tell that a user is a placeholder created on someone else's behalf vs. a real signed-in account. Visitors looking at `/u/coffee_cup` can't tell the page exists for credit purposes.
2. Listings render `by <username>` linking to the local profile, but the original creator's external presence (PokeCommunity / GitHub / personal site) is not captured anywhere — even when the source repo's per-folder README links it.

## Goals

- Make placeholder accounts a first-class concept (a single boolean on `user`).
- Capture an optional external "real creator" URL on a profile.
- Backfill existing seed users + create one placeholder user per unique tool author so listings and tools share one credit model.
- Render listing-page credit the same shape tools already use today: `by <name>`, with the link pointing to an external homepage when set, otherwise the local profile.

## Non-goals

- Blocking sign-in for placeholder users (they have no credentials anyway).
- A "claim this account" flow for original creators to take over a placeholder. Deferred.
- Converting tools into DB-backed listings. They remain seed data; only their `author` maps to a user.

## Schema

`src/lib/db/schema.ts`:

- Add `user.isPlaceholder` — `integer('is_placeholder', { mode: 'boolean' }).notNull().default(false)`. Sits next to `isAdmin`.
- Add `profile.homepageUrl` — `text('homepage_url')`, nullable. Populated by the backfill; otherwise set when a future "edit profile" form gains the field.

Generate + apply via `bun run db:generate && bun run db:migrate`. The migration carries default values, so no data step is required for the schema change itself.

## Backfill script

New file: `scripts/backfill-placeholders.ts`. Idempotent. Reads `DATABASE_URL` / `DATABASE_AUTH_TOKEN` from env so the same script targets local SQLite, staging Turso, or prod Turso.

### Phase A — flag existing seed users

`UPDATE user SET is_placeholder = 1 WHERE id LIKE 'seed-aqua-%' OR id LIKE 'seed-contrib-%'`.

### Phase B — harvest URLs from Team-Aqua repo

`REPO=/home/user/Team-Aquas-Asset-Repo` (configurable, must be a local clone of `https://github.com/TeamAquasHideout/Team-Aquas-Asset-Repo`).

Walk `<asset-type>/<creator>/` directories. For each `<creator>` folder:

1. Slugify the folder name with the same `slugifyContributor` helper used by the existing seeder so the username matches the corresponding `seed-contrib-<slug>` user.
2. Read `README.md` if present. Run a regex pass for `https?://(www\.)?(github\.com|pokecommunity\.com|twitter\.com|x\.com|bsky\.app|<author>.com)/<path>` style URLs. Pick the first match. Discord invite links and image URLs are filtered out.
3. If the matching `seed-contrib-<slug>` user has no `homepage_url` yet, write the harvested URL.

Many folders won't have a homepage URL. That's expected.

### Phase C — backfill tool authors

For each `Tool` in `src/lib/data/tools.ts`:

1. Compute `slug = slugifyContributor(tool.author)`.
2. Ensure a user with `id = 'seed-tool-<slug>'`, `name = tool.author`, `email = '<slug>@tools.seed'`, `is_placeholder = true`. Create on miss; leave alone on hit.
3. Ensure a profile with `username = <slug>`, `homepage_url = tool.authorUrl ?? null`. Update `homepage_url` if it's currently null and the tool has one.

After this phase, every `tool.author` resolves to a real user row, and the tool detail page can swap from rendering the seed string to rendering the same `<CreditLine />` listings use.

### Tests

- `scripts/backfill-placeholders.test.ts` covers:
  - URL-extractor regex on a small fixture README that mixes good links (GitHub profile), discarded links (Discord invite, image URL), and absent README.
  - `slugifyContributor` parity against a few real folder names from the Team-Aqua tree.
  - End-to-end Phase A + Phase C on an in-memory libSQL: seed two pretend `seed-contrib-*` users with no `is_placeholder`, run the script, assert the flag flipped and that two `seed-tool-*` users were created with their `authorUrl` carried over.

## UI: credit display

New component: `src/lib/components/credit-line.svelte`.

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
  const external = !!homepageUrl;
</script>

<span class="inline-flex items-center gap-2 text-sm text-zinc-300">
  by
  <a
    {href}
    class="text-foreground hover:text-sky-300 underline-offset-2 hover:underline"
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {displayName}
  </a>
  {#if isPlaceholder}
    <span class="font-display rounded-sm border border-zinc-700/70 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-zinc-400">
      Placeholder credit
    </span>
  {/if}
</span>
```

The badge text uses Press Start 2P (`font-display`), consistent with type badges and wizard step numbers.

### Wiring

- **Listing detail pages** (`src/routes/romhacks/[slug]/+page.svelte`, `src/routes/sprites/[slug]/+page.svelte`, `src/routes/sounds/[slug]/+page.svelte`, `src/routes/scripts/[slug]/+page.svelte`): the `+page.server.ts` loader already pulls the listing's profile. Extend the select to include `user.is_placeholder` and `profile.homepage_url`. Replace the existing `by <a href="/u/...">…</a>` line with `<CreditLine ... />`.
- **Tool detail page** (`src/routes/tools/[slug]/+page.server.ts`): after loading the tool, look up the matching `seed-tool-<slug>` user + profile. Pass `creditUser` (nullable) into the page. The `.svelte` swaps its inline `by …` block for `<CreditLine />` when `creditUser` is present, falling back to the current seed-string rendering when not (covers the case where the backfill hasn't been run, e.g. fresh `bun run dev` with no DB).
- **Profile page** `src/routes/u/[username]/+page.svelte`: when the loaded profile's user is a placeholder, render a small dismissable-looking (purely visual, no state) banner above the bio: "Placeholder account — uploaded on behalf of the original creator." with a "Visit creator" link when `homepage_url` is set.

The shared loader-extension is small enough to inline at each call site rather than refactor profile-loading helpers; we keep `src/lib/server/profiles.ts` focused on its current shape.

## Tests for UI

- `src/lib/components/credit-line.test.ts` — four cases: `{ placeholder, hasHomepage }` × `{ true, false }`. Asserts the rendered `<a>` href, target attribute, and the presence/absence of the badge.
- E2E coverage is not added here; existing detail-page e2e specs continue to pass with the new credit line because the link text is unchanged.

## Rollout

1. Land schema + migration.
2. Run backfill against local DB; spot-check `/sprites/<slug>` shows the new credit line + badge.
3. Run backfill against staging Turso; smoke-test.
4. Run backfill against prod Turso. The script is idempotent, so a second run is a no-op.

## Risks & mitigations

- **README parsing finds a junk URL.** The allowlist of host suffixes (github, pokecommunity, twitter/x, bsky, mastodon) is conservative. If we mis-parse, the value is stored on a profile row and is trivially nulled with another script pass.
- **`seed-tool-<slug>` collisions with future real users.** Reserved id prefix `seed-tool-` matches the existing `seed-contrib-` and `seed-aqua-` reserved prefixes. We do not allow real signups to choose those usernames (existing `setUsername` already rejects taken usernames; the placeholder rows occupy them).
- **Migration on a prod DB with no `is_placeholder` column.** Drizzle's generated migration adds the column with a default; no manual data step is required.

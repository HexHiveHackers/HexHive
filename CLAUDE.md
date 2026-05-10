# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

HexHive is a Pokémon ROM-hack asset hub: browse and upload romhacks, sprites, sounds, and scripts. Built with SvelteKit + Bun, Drizzle ORM on Turso (libSQL), Cloudflare R2 for files, Better Auth (OAuth + passkeys), and shadcn-svelte UI with retro display-font accents. Dark-mode only.

## Commands

```bash
bun install                # install deps (also runs svelte-kit sync)
bun run dev                # dev server (http://localhost:5173)
bun run build              # production build (svelte-adapter-bun output)
bun run preview            # preview the production build
bun run check              # svelte-check (type + a11y); 0 errors AND 0 warnings required
bun run lint               # biome check; 0 errors AND 0 warnings required
bun run lint:fix           # biome auto-fix safe issues
bun run format             # biome format in place
bun run test               # vitest run (one-shot)
bun run test:watch         # vitest watch mode
bun run test:e2e           # Playwright end-to-end (build → preview → tests)
bun run db:generate        # drizzle-kit generate (after schema changes)
bun run db:migrate         # apply pending migrations
bun run db:push            # push schema directly (skip migration files)
bun run db:studio          # drizzle-kit studio
```

Run a single test file: `bun run test src/lib/server/listings.test.ts`.

## Strict-typing & lint policy

The codebase enforces a hard zero-tolerance policy:

- `bun run check` — 0 errors, **0 warnings**
- `bun run lint` — 0 errors, **0 warnings**
- `biome.json` — `"recommended": true` and nothing else; no rule severity overrides
- **No `as any`** anywhere
- **No `as unknown`** anywhere (one comment in `tests/event.ts` mentions the strings while explaining the policy — that's the only match)
- **No suppression comments** of any kind: no `// biome-ignore`, no `// @ts-expect-error`, no `// @ts-ignore`, no `// eslint-disable*`

Pre-commit hook (husky + lint-staged) runs `biome check --write` on staged files. If a fix exists it's applied automatically; if a real error remains the commit fails.

When you encounter a typing problem, the answer is to type it correctly — not to suppress. Patterns that have already proved out:

- For libSQL row results, import `@libsql/core/api`'s `Row` type; its index signature is `[name: string]: Value` AND `[index: number]: Value`. Use `pick(row, name, index)` (in `src/lib/server/search.ts`) to read either way.
- For SvelteKit endpoint handlers that need to be exercised by tests, factor an internal `handle*` function whose parameter is a structural shape (`{ request, locals, url }` for body-reading handlers, `{ params }` for path-param-only handlers). Then `export const POST: RequestHandler = handlePost`. SvelteKit's `RequestEvent` is a subtype of the structural shape, so the assignment is contravariantly valid — no cast.
- For "wide" lookups into a value typed `as const` (e.g. `SPRITE_VARIANTS`), keep the narrow form private and re-export a widely-typed view: `export const SPRITE_VARIANTS: Record<string, Record<string, VariantSpec>> = SPRITE_VARIANTS_NARROW`.
- For Drizzle JSON columns whose inferred insert type is `unknown`, just assign — no cast required.

If a strict-typing problem genuinely needs an escape hatch, surface it in chat first; we'll find a structural fix.

## Linting (Biome)

```bash
bun run lint          # check for issues (exit 1 on errors)
bun run lint:fix      # auto-fix safe issues
bun run format        # format all files in-place
```

`biome.json` config:
- single quotes, semicolons always, 2-space indent, 120-char line width
- `html.experimentalFullSupportEnabled: true` for Svelte support (Biome 2.3+)
- `src/app.css` is excluded because Tailwind v4's `@source` / `@custom-variant` / `@theme` aren't understood by Biome's CSS parser
- A few rules are off in `**/*.svelte` overrides (`useConst`, `useImportType`, `noUnusedVariables`, `noUnusedImports`, `noUnusedFunctionParameters`, `noGlobalAssign`) to avoid false positives from Svelte's reactivity, snippets, and the experimental parser

Pre-commit hook runs `biome check --write --no-errors-on-unmatched` on staged `*.{ts,tsx,js,mjs,cjs,json,jsonc,css,svelte}` files.

## Conventions

- **Use Bun for everything.** Don't add npm/pnpm/yarn lockfiles. The runtime is Bun via `svelte-adapter-bun`.
- **TypeScript only.** See "Strict-typing & lint policy" above — `as any`, `as unknown`, and suppression comments are not used.
- **Tailwind v4 + shadcn-svelte.** Use shadcn-svelte components from `$lib/components/ui/*`. Add new ones via `bun x shadcn-svelte@latest add <name>`.
- **Retro accents only on display elements.** `font-display` (Press Start 2P) for H1, type badges, eyebrows, the upload wizard's step numbers — never on body copy.
- **Use `??` (nullish coalescing), not `||`** when `0`, `false`, or `""` are valid values.
- **Server-only code lives under `src/lib/server/`.** Anything that touches `db`, secrets, or R2 belongs there. SvelteKit will refuse to ship server-only modules to the client; rely on that.
- **Validate at boundaries with Zod.** Every API endpoint parses its body with a Zod schema from `src/lib/schemas/`. Don't trust unknown JSON.
- **Files into R2 go directly from the browser** via presigned PUT URLs. The app server signs the URL and HEAD-verifies the upload during finalize — it never proxies file bytes.

## Architecture

- `src/lib/db/schema.ts` — single source of truth for all DB tables (Better Auth tables included).
- `src/lib/db/index.ts` — Drizzle client. **Lazy-constructed via Proxy** so module load doesn't open a libSQL connection. SvelteKit's post-build `analyse` pass imports every server module to discover routes; an eager `createClient()` would crash that pass on Railway whenever `DATABASE_URL` isn't yet set in the build environment. Same shape applies to `src/lib/auth.ts`.
- `src/lib/storage/r2.ts` — `presignPut`, `presignGet`, `headObject`, `deleteObject`. Always import from here; never from `@aws-sdk/client-s3` directly. Falls back to a local-FS shim when R2 env isn't set (see Environment).
- `src/lib/auth.ts` — Better Auth instance with OAuth (Google/GitHub/Discord) + `@better-auth/passkey`. Drizzle adapter writes to the same Turso DB. Exports `enabledSocialProviders` so login pages only render configured providers. **Lazy-constructed via Proxy** for the same `analyse`-pass reason as `db/index.ts` — better-auth runs `new URL(baseURL)` in its constructor, which crashes a build with no `BETTER_AUTH_URL`.
- `src/hooks.server.ts` — populates `event.locals.user`/`session`; redirects signed-in users with no profile to `/me/setup`; allowlists public routes.
- `src/lib/server/auth-utils.ts` — `requireUser(event)` returns the user or throws a 303 to `/login?next=...`.
- `src/lib/server/profiles.ts` — `getOrCreateProfile`, `setUsername`, `setBio`, `getProfileByUsername`, `listingsByUser`.
- `src/lib/server/account.ts` — `deleteAccount` cascades the user, all their listings + meta + files (via Drizzle FK cascades), and best-effort R2 cleanup.
- `src/lib/server/listings.ts` — `createListingDraft`, `finalizeListing`, `listRomhacks`, `listAssetHives`, `getRomhackBySlug`, `getAssetHiveBySlug`, `incrementDownloads`. The `db` arg is injectable so unit tests use an in-memory libSQL.
- `src/lib/server/uploads.ts` — `presignFor` (returns presigned URLs scoped to `{listingId}/{versionId}/{filename}`) and `verifyAllUploaded` (HEADs each key).
- `src/lib/server/versions.ts` — `createNextVersion`, `listVersionsForListing`, `getListingForAuthor` for the re-upload flow.
- `src/lib/server/search.ts` — FTS5 search with BM25 ranking, porter stemming, `type:`/`from:` query modifiers, faceted counts, and pagination. A second virtual table `listings_fts_trgm` provides typo-tolerant fallback queries when the canonical FTS table returns zero hits.
- `src/lib/server/moderation.ts` + `src/lib/server/admin.ts` — flag CRUD and the `requireAdmin` guard for `/admin/*`.
- `src/lib/schemas/*` — Zod schemas per asset type. `sprite.ts` uses the full `SpriteVariant` discriminated union (validated via `superRefine` against the `validateTriple` runtime helper in `sprite-variants.ts`).
- `src/routes/upload/+page.svelte` — unified upload wizard. Step 0 picks the asset type (4 tiles); steps 1–4 (Identity / Target / Details / Files) reshape per type, and the wizard's `--accent` colour follows the chosen type.
- `src/routes/upload/{romhack,sprite,sound,script}/+page.server.ts` — 307 redirects to `/upload?type=<t>` so old links don't break.
- `src/routes/api/uploads/{presign,finalize}/+server.ts` — POST endpoints that drive the upload flow. Both expose internal `handlePresign` / `handleFinalize` functions with structural ctx types so tests call them directly without casting.
- `src/routes/api/downloads/[fileId]/+server.ts` — increments the listing's `downloads` counter and 303-redirects to a signed R2 GET. Same internal-handler pattern (`handleDownload`).
- `src/routes/api/_dev_storage/[...rest]/+server.ts` — local-FS storage shim active only when R2 env isn't set.

## Search syntax

- Free text matches title, description, tags, categories, and author username (porter-stemmed via FTS5).
- `type:romhack` (or `sprite|sound|script`) restricts to one type. Unknown values pass through as text.
- `from:username` restricts to a single author (case-insensitive). Works alone or combined with free text.
- Mature listings are excluded by default; `?mature=show` on list pages opts in. The search page does not surface mature.
- Zero-hit canonical queries fall back to a trigram-based "did you mean" using `listings_fts_trgm` (good for typos and substrings).
- Pagination via `?offset=` (default 20 results per page).

## Upload flow (do not change without good reason)

1. Browser POSTs metadata + declared file metadata to `/api/uploads/presign`.
2. Server validates with Zod + per-type allowlist (`src/lib/utils/file-types.ts`), drafts a listing via `createListingDraft`, returns presigned PUT URLs (one per file).
3. Browser PUTs each file directly to R2 (or the dev-storage shim).
4. Browser POSTs the resolved keys to `/api/uploads/finalize`.
5. Server HEADs every key (502 if any fail), persists `listing_file` rows via `finalizeListing`, marks the listing `published`.

For re-uploads, `/upload/[type]/version?id=<listingId>` drives the same loop against `/api/listings/[id]/versions/{presign,finalize}` instead.

## Testing

- Vitest with jsdom. Setup file: `tests/setup.ts`.
- Component tests use `@testing-library/svelte`; `vitest.config.ts` sets `resolve.conditions: ['browser']` so component imports resolve Svelte's client bundle.
- Server tests that need a DB use an in-memory libSQL: `createClient({ url: ':memory:' })` then `migrate(db, { migrationsFolder: './drizzle' })` in `beforeAll`. Each test file gets its own worker process, so `:memory:` is isolated.
- Endpoint tests import the **internal** `handle*` function (not the `RequestHandler`-typed `POST`/`GET` export) and pass a `tests/event.ts` `buildEvent({ ... })` directly. No type casts at the boundary.
- SvelteKit's `error()` and `redirect()` THROW. Use `await expect(handler(...)).rejects.toMatchObject({ status: 4xx })` to assert.
- Playwright e2e is in `e2e/`; `bun run test:e2e` builds + runs preview + executes tests.

## Known issues

- **bits-ui v2 + Tailwind v4 vite plugin** — `vite.config.ts` carries a small `excludeNodeModulesSvelteStyles` plugin to avoid Tailwind trying to parse Svelte virtual style modules from `node_modules` as CSS (it chokes on the JS `import { boxWith, mergeProps }` line). Affected components include bits-ui's `select-viewport` and `scroll-area-viewport`. Audited 2026-05-06 with `@tailwindcss/vite@4.2.4`, `tailwindcss@4.2.4`, `bits-ui@2.18.1` — all at latest; no upstream fix yet. The matcher is a regex on `.svelte?…type=style` so it handles both the original URL shape and the newer `?inline&svelte&type=style` variant. Remove it once the upstream fix lands.
- **Sprite SpriteVariant flattening for FTS** — sprite categories are deeply nested (`{ type, subtype, variant }`) and aren't yet flattened into the FTS index. Future task.

## Git & commits

- **Conventional commits** with optional scope: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs:`, `test:`, `refactor:`.
- **Commit subject mentions the area touched** (`feat(romhacks): …`, `feat(api): …`, `feat(server): …`).
- **Every commit must include the Co-Authored-By trailer:**
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Don't push to GitHub until the user asks. The `origin` is `git@github.com:HexHiveHackers/HexHive.git` (the org repo).
- Tags mark milestones: `foundation-complete`, `romhacks-vertical-complete`, `asset-hives-complete`, `v1-complete`, `v1.1-complete`, `v1.2-complete`.

## Worktrees

Isolated work happens under `.worktrees/<branch>` (gitignored). Create with `git worktree add .worktrees/<branch> -b <branch>`; the `scratch` branch/worktree already exists for ad-hoc exploration. Run `bun install` inside a fresh worktree — `node_modules/` is per-checkout.

## Plans and execution

Implementation work is driven by plans under `docs/superpowers/plans/`. Each plan is a sequence of bite-sized tasks with code blocks, TDD steps, and exact commands. Plans are executed task-by-task with the superpowers `subagent-driven-development` workflow: a fresh subagent per task, plus reviews. **Don't deviate from a plan mid-task** — if a step is wrong, escalate and revise the plan instead of improvising.

The roadmap of shipped + queued + scrapped work lives in `docs/ROADMAP.md`. Visual targets for upcoming UI work are in `docs/inspiration/`.

## Aesthetic

Dark-mode only (`<html class="dark" style="color-scheme: dark">` in `app.html`). Modern shadcn shell with retro touches:

- Display headings (and badges/empty-state callouts) use Press Start 2P / GBBoot — only via the `font-display` utility, never on body copy.
- Subtle CRT scanline overlay (low-opacity repeating gradient) on hero-ish areas only.
- Type badges + the upload wizard's accent are color-coded per asset type (emerald/fuchsia/amber/sky for romhack/sprite/sound/script).
- The upload wizard uses a hexagon-bead progress indicator that nods to "HexHive".

## Deployment

Deploy is on Railway. `railway.toml` defines `production` and `staging` environments sharing one Bun service; per-environment values (Turso, R2, Better Auth, OAuth) live in Railway's Variables panel. `engines.node` in `package.json` pins Node ≥ 22 so Nixpacks doesn't pick the EOL Node 18 default. Full walkthrough in [`docs/deploy-railway.md`](./docs/deploy-railway.md).

Live resources:

- **Railway project** id `2eb78a5e-b656-4826-875a-44a4c6ee5298`, service `HexHive`. The local `railway` CLI is logged in and linked to this project — `railway variables` reads/writes production env vars without browser auth.
- **Turso DBs**: `hexhive-prod` (`libsql://hexhive-prod-jmynes.aws-us-east-1.turso.io`) and `hexhive-staging` (`libsql://hexhive-staging-jmynes.aws-us-east-1.turso.io`). Run migrations with `DATABASE_URL=<url> DATABASE_AUTH_TOKEN=<token> bun run db:migrate`. Don't provision new ones — these are already wired into Railway.
- **R2 buckets** (Cloudflare account `8221f737e4a1c585b1bccde05a0ec790`): `hexhive-prod` and `hexhive-staging`. The `wrangler` CLI is logged in. Custom domain `cdn.hexhive.app` is mapped to the `hexhive-prod` bucket — every R2 key under any prefix is served at `https://cdn.hexhive.app/<key>`. Listing files live under `listings/<listingId>/<versionId>/<filename>`; static public assets like soundfonts live under `soundfonts/<file>`. To upload from this machine without juggling secrets manually:

  ```bash
  # Pull production R2 creds (the local .env points at hexhive-dev, not the CDN bucket)
  R2_ACCESS_KEY_ID=$(railway variables --kv | sed -n 's/^R2_ACCESS_KEY_ID=//p')
  R2_SECRET_ACCESS_KEY=$(railway variables --kv | sed -n 's/^R2_SECRET_ACCESS_KEY=//p')
  R2_ACCOUNT_ID=$(railway variables --kv | sed -n 's/^R2_ACCOUNT_ID=//p')
  export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto
  aws --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" s3 cp <local> s3://hexhive-prod/<key>
  ```

  R2 is S3-compatible. **`AWS_DEFAULT_REGION=auto` is required** — anything else fails with `InvalidRegionName`. `wrangler r2 object get/put` also works but has no list and is slower. Full soundfont catalogue + upload recipe in [`docs/soundfonts.md`](./docs/soundfonts.md).
- **Public URL**: `https://hexhive-production.up.railway.app` (Railway-issued); custom domain `hexhive.app` is registered in Railway and the apex CNAME is in Namecheap, but Railway is still serving its `*.up.railway.app` cert — flip `BETTER_AUTH_URL` once `CN=hexhive.app` lands.

## Environment

`.env.example` lists every variable. Local dev runs against a SQLite file (`DATABASE_URL=file:./local.db`); production uses Turso (`libsql://...` + auth token).

OAuth client IDs are optional in dev — login buttons render only for providers whose env vars are set (see `enabledSocialProviders` in `src/lib/auth.ts`).

R2 credentials are also optional in dev. When `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` are unset, `src/lib/storage/r2.ts` switches to a filesystem-backed fallback rooted at `.dev-storage/` (gitignored), and presigned PUT/GET URLs become same-origin paths under `/api/_dev_storage/<key>`. Set the R2 env vars to switch back to real Cloudflare R2; restart the dev server (the env is read once at startup).

For OAuth setup walkthroughs (GitHub / Google / Discord redirect URIs and client-secret retrieval), see [docs/inspiration/](./docs/inspiration/) and the per-task plan history.

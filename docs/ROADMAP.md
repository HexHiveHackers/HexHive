# HexHive Roadmap

Live tracker for what's shipped and what's queued. Implementation is plan-driven — each item below either has a plan under `docs/superpowers/plans/` or will get one when it's picked up.

## Shipped

| Tag | Plan | Highlights |
|---|---|---|
| `foundation-complete` | [Foundation](./superpowers/plans/2026-05-05-hexhive-foundation.md) | SvelteKit + Bun, Tailwind v4 + shadcn-svelte, Drizzle/Turso, R2, Better Auth (OAuth + passkeys), Zod schemas, layout shell |
| `romhacks-vertical-complete` | [Romhacks vertical](./superpowers/plans/2026-05-05-hexhive-romhacks-vertical.md) | List + filters, detail, presign→PUT→finalize upload, download counter |
| `asset-hives-complete` | [Asset-hive verticals](./superpowers/plans/2026-05-06-hexhive-asset-hives.md) | Sprites/Sounds/Scripts; full SpriteVariant tree; mixed home feed |
| `v1-complete` | [Profiles, versioning, search, moderation](./superpowers/plans/2026-05-06-hexhive-profiles-versioning-search-moderation.md) | First-login username gate, `/me` + `/u/[username]`, version timeline + re-upload, FTS5 search, anonymous reports + `/admin/flags`, MatureWrap |
| `v1.1-complete` | [v1.1 polish](./superpowers/plans/2026-05-06-hexhive-v1-1-polish.md) | Avatars (R2), mature filter on lists, OG metadata, sitemap + robots, Playwright e2e smokes, README |
| (no tag) | — | Biome lint + pre-commit hook (husky + lint-staged) |
| `v1.2-complete` | [v1.2 search](./superpowers/plans/2026-05-06-hexhive-v1-2-search.md) | BM25 ranking, porter stemming, index tags/categories/author, trigram fuzzy fallback, `from:`/`type:` syntax, faceted counts, pagination |

## Queued

### Plan 8 — Production deployment

Operational, not feature work. Walkthrough lives in [`docs/deploy-railway.md`](./deploy-railway.md). Picked Railway; `railway.toml` defines `production` and `staging` environments sharing one Bun service. Project id `2eb78a5e-b656-4826-875a-44a4c6ee5298`.

Shipped:

- ✅ Railway project + service wired to `HexHiveHackers/HexHive`, watching `main`.
- ✅ Build pipeline green: Nixpacks selects Bun + Node ≥ 22 (`engines.node` in `package.json`). Build was failing on Node 18 EOL until that pin landed.
- ✅ DB and auth modules construct lazily (`src/lib/db/index.ts`, `src/lib/auth.ts` — Proxy-wrapped) so SvelteKit's post-build `analyse` pass no longer crashes when env vars are absent.
- ✅ Two Turso DBs (`hexhive-prod`, `hexhive-staging`), migrations applied, URL + token in Railway per environment.
- ✅ `BETTER_AUTH_SECRET` (per-environment) + `BETTER_AUTH_URL` set; production currently points at the Railway-issued subdomain.
- ✅ `hexhive.app` apex CNAME landed in Namecheap; Railway domain entry verified.

Remaining:

- 🔲 **Cloudflare R2** — provision two buckets (`hexhive-prod`, `hexhive-staging`), one API token with R+W to both, set `R2_*` vars in each Railway environment. Until done, uploads land on Railway's ephemeral container FS via the dev-storage shim and disappear at every redeploy.
- 🔲 **OAuth providers** — create real client IDs/secrets for Google / GitHub / Discord; add `https://hexhive.app/api/auth/callback/<provider>` (and the staging URL) as authorized redirects; paste pairs into Railway. Login pages are empty until at least one is configured.
- 🔲 **`hexhive.app` Let's Encrypt cert** — Railway is still serving its `*.up.railway.app` wildcard at the apex. Once the cert flips to `CN=hexhive.app`, set `BETTER_AUTH_URL=https://hexhive.app` in production and re-run OAuth redirect-URI updates.
- 🔲 **Staging deploy** — staging environment exists and has DB/auth vars, but no service domain attached and no automatic deploy trigger configured. Either create a `staging` branch and wire branch-tracking on the staging environment, or use Railway PR previews.
- 🔲 **Email forwarding for `hexhive.app`** — apex CNAME conflicts with the SPF TXT at `@`; Namecheap flattens the CNAME but mail forwarding may misbehave. If we want mail on the domain, flip to serving from `www` and redirect apex → www.
- 🔲 **First-admin bootstrap** — once the schema is on prod Turso, flip `user.is_admin` for a known account. No CLI or one-shot route exists yet.
- 🔲 **Migration story on deploy** — `bun run db:migrate` is currently manual against Turso. Decide whether to wire it into `preDeployCommand` or keep it explicit.
- 🔲 **Uptime monitoring + e2e against preview** — run Playwright against the staging URL before promoting `main` → prod.

### Sprite SpriteVariant flattening for FTS

Mentioned in CLAUDE.md "Known issues". The sprite `category` column is a deeply nested `{ type, subtype, variant }` shape that the current FTS triggers don't extract. A small task on its own: at trigger time, serialize the triple (and any array/record forms) into a flat space-separated string in the `categories` column on `listings_fts` / `listings_fts_trgm`. Worth doing when the sprite corpus actually has volume.

### Search analytics

A `search_query` table that records `(query, type_filter, hit_count, timestamp, user_id?)` per `/search` request, plus a small `/admin/search` view of top queries and zero-hit queries. Useful signal for tokenizer tuning and synonym lists. Not urgent.

### Search-as-you-type live results

A debounced JSON endpoint + a small client component that opens results inline as the user types. UI-heavy; defer until there's user feedback that the existing `/search` flow is too slow.

### Synonym / alias dictionary

Map common shorthand to canonical terms (`fr` → `Fire Red`, `em` → `Emerald`). Either as a server-side rewrite at query time, or as data injected into the FTS columns (e.g., a separate `synonyms` field). Good to have, not urgent.

### bits-ui / Tailwind v4 vite workaround removal

`vite.config.ts` carries the `excludeNodeModulesSvelteStyles` plugin. As of 2026-05-06 (CLAUDE.md "Known issues"), no upstream fix has shipped. Re-audit periodically — a one-task cleanup once the upstream issue closes.

### Slate → zinc cosmetic palette swap

Cosmetic only. The shadcn-svelte version we initialised with didn't ship `slate`. Revisit with a real design pass; not on the critical path.

### Avatar polish

`profile.avatarKey` is wired but the served image is whatever the user uploaded — no resize, no format normalization. A small future task: server-side downscale to 256×256 + WebP convert at upload time (would require a Bun-native or wasm image-resize library).

## Scrapped

### ~~Plan 6 — Comments + ratings~~

Originally queued as Plan 6; user dropped it. If revisited, would need its own schema (`comment` table + optional `rating` table or extend `listing` with aggregate columns), comment thread UI on detail pages, and integration with the existing `/admin/flags` moderation queue (so a single comment can be flagged the same way a listing is).

## How to use this file

- When a queued item gets a plan written, replace its description here with a link to the plan file.
- When a plan ships and tags a milestone, move it to **Shipped**.
- When something is dropped, move it to **Scrapped** with a one-line reason.
- Don't add aspirational items here unless you'd actually pick them up — keep the list honest.

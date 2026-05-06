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

Operational, not feature work. No plan file written yet. Likely tasks when picked up:

- Provision a real Turso database; set `DATABASE_URL` + `DATABASE_AUTH_TOKEN` for prod.
- Provision a Cloudflare R2 bucket; configure CORS for browser PUTs.
- Real OAuth client IDs/secrets for Google, GitHub, Discord; verify each provider's redirect URI.
- Generate a real `BETTER_AUTH_SECRET`; rotate procedures.
- Pick a host (Fly.io, a small VPS, Hetzner, or similar — Bun rules out Cloudflare Workers). Set up the `svelte-adapter-bun` server image.
- DNS, TLS, basic uptime monitoring.
- A first-admin bootstrap path (`user.is_admin` flip).
- Production migration story: how does `bun run db:migrate` run on deploy?
- Run e2e against a deployed preview before flipping DNS.

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

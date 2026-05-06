# HexHive (Svelte) — Design

**Date:** 2026-05-05
**Status:** Approved (brainstorming)
**Source:** Reimplementation of [hexhivemind/HexHive](https://github.com/hexhivemind/HexHive) (Nuxt/Vue) in SvelteKit. Asset data shapes (Romhack, Sprite, Sound, Script) are preserved; everything else is rebuilt.

## Goals

- A Pokemon ROM hack asset hub: upload, browse, and download Romhacks, Sprites, Sounds, Scripts.
- Cheap to run and serve "lots of small files" to a userbase.
- No password management — OAuth + passkeys only.
- Local-first DX with Bun.

## Non-goals (v1)

- Ratings and comments.
- Full-text search (LIKE-based filtering for v1; FTS5 later).
- Email verification flows (OAuth providers vouch for emails; passkeys don't need it).
- Server-side image transforms.

## Stack

| Concern | Choice | Rationale |
|---|---|---|
| Runtime / package manager | Bun | User preference; fast install + run. |
| Framework | SvelteKit (TypeScript) + `@sveltejs/adapter-bun` | Closest analog to the original Nuxt app. |
| UI | Tailwind + shadcn-svelte | Modern, ownable components; broad ecosystem. |
| Aesthetic | Modern shell with retro accents | "Press Start 2P" / GBBoot for H1s, badges, empty-state callouts; clean sans for body; optional CRT scanline texture on hero. |
| Database | Turso (libSQL) + Drizzle ORM + drizzle-kit | Cheap, fast reads, generous free tier; Drizzle gives strong types over Zod-validated payloads. |
| File storage | Cloudflare R2 (S3 SDK) | Zero egress fees — decisive for a download-heavy asset hub. Direct browser → R2 via presigned PUT URLs keeps the app server out of the upload bandwidth path. |
| Auth | Better Auth (OAuth + passkeys plugin) | OAuth (Google, GitHub, Discord) plus WebAuthn passkeys. No passwords stored. Drizzle adapter persists sessions in Turso. |
| Validation | Zod v4 | Port `shared/zod*` helpers and per-type schemas from the original. |
| Testing | Vitest (unit), Playwright (e2e, later) | Standard SvelteKit toolchain. |

## Data model (Drizzle / SQLite)

Base + per-type meta tables, joined on read. This keeps the original type discrimination (`RomhackData` vs. `AssetHive`-derived shapes) clean without forcing a single wide table.

- `users`, `accounts`, `sessions`, `verifications`, `passkeys` — managed by Better Auth.
- `profiles` — `user_id`, `username` (unique, case-insensitive), `bio`, `avatar_key`.
- `listings` (shared across all four types):
  - `id`, `slug` (unique per type), `type` (`romhack|sprite|sound|script`),
  - `author_id`, `title`, `description`,
  - `permissions` (json: `Credit|Free|No-Donations|No-Profit`),
  - `downloads` (int), `mature` (bool), `status` (`draft|published|hidden`),
  - `created_at`, `updated_at`.
- `listing_versions` — `id`, `listing_id`, `version` (string), `changelog` (text), `is_current`, `created_at`. Re-upload creates a new row and flips the prior `is_current` to false.
- `listing_files` — `id`, `version_id`, `r2_key`, `filename`, `original_filename`, `size`, `hash`.
- `romhack_meta` (1:1 with `listings` where `type='romhack'`) — `base_rom`, `base_rom_version`, `base_rom_region`, `release`, `categories` / `states` / `tags` / `screenshots` / `boxart` / `trailer` (json arrays).
- `asset_hive_meta` (1:1, used by sprite/sound/script) — `targeted_roms` (json), `file_count`, `total_size`.
- `sprite_meta` — `category` (json, the SpriteUnion shape), `file_map` (json).
- `sound_meta` — `category` (enum: `Attack|Cry|Jingle|SFX|Song`).
- `script_meta` — `categories` / `features` / `prerequisites` / `targeted_versions` / `tools` (json).
- `flags` — `id`, `listing_id`, `reporter_id`, `kind` (`mature|spam|illegal|other`), `reason`, `status`, `created_at`.

JSON columns hold structures already validated by Zod at the boundary; the DB stores them opaquely.

## Routes

```
/                                 home (mixed feed of recent listings)
/(auth)/login                     OAuth + passkey entry
/(auth)/signup                    same; OAuth providers create accounts on first login
/auth/callback/[provider]         OAuth return
/romhacks                         list + filters
/romhacks/[slug]                  detail + download
/sprites,  /sprites/[slug]
/sounds,   /sounds/[slug]
/scripts,  /scripts/[slug]
/upload/[type]                    auth required; multi-step form
/u/[username]                     public profile + uploads
/me                               settings, my uploads, drafts
/admin/flags                      admin only

/api/uploads/presign      POST    returns presigned R2 PUT URLs
/api/listings/[type]      GET     search/filter (LIKE for v1; FTS later)
/api/flags                POST    file a moderation report
/api/downloads/[fileId]   GET     increments counter, redirects to signed R2 GET
```

## Upload flow

1. User fills the metadata form. Zod validates client- and server-side.
2. Client POSTs to `/api/uploads/presign` declaring file sizes and content types. Server enforces type allowlist + per-user quota and returns a presigned PUT URL per file.
3. Client uploads files directly to R2.
4. Client POSTs metadata + R2 keys back to the server. Server HEADs each key to confirm presence, then persists `listings` + `listing_versions` + `listing_files` atomically and marks the listing `published`.
5. Re-upload = new `listing_versions` row, prior version's `is_current` flipped to false. Changelog text is required on every version after the first.

## Auth

- Better Auth instance in `src/lib/auth.ts`, configured with the Drizzle adapter against the Turso connection.
- OAuth providers: Google, GitHub, Discord.
- Passkeys via the Better Auth WebAuthn plugin.
- `hooks.server.ts` mounts Better Auth's request handler and populates `event.locals.user` / `event.locals.session`.
- Route protection: a server `load` helper (`requireUser`) for authenticated pages and form actions.

## Aesthetic

- shadcn-svelte default tokens for surfaces and primaries.
- Display font: "Press Start 2P" or GBBoot for H1s, type-name badges (Romhack/Sprite/Sound/Script), and empty-state callouts.
- Body font: Geist Sans or Inter.
- Hero / 404 / empty states get a subtle CRT scanline overlay; off elsewhere.
- Type badges color-coded per asset type (Romhack/Sprite/Sound/Script), reused on cards and detail pages.

## Project layout

```
hexhive/
  bun.lockb
  package.json
  svelte.config.js              # adapter-bun
  tailwind.config.js
  drizzle.config.ts
  src/
    app.html  app.css
    hooks.server.ts             # Better Auth handle + locals
    lib/
      auth.ts
      db/{index,schema,migrate}.ts
      storage/r2.ts             # presign PUT, HEAD, signed GET
      schemas/
        zod-helpers.ts          # ported from original
        listing.ts romhack.ts asset-hive.ts sprite.ts sound.ts script.ts
      server/
        listings.ts files.ts flags.ts
      components/
        ui/                     # shadcn-svelte components
        listings/  forms/  layout/
      stores/  utils/
    routes/
      +layout.svelte  +page.svelte
      (auth)/login/+page.svelte  (auth)/signup/+page.svelte
      auth/callback/[provider]/+server.ts
      romhacks/+page.svelte  romhacks/[slug]/+page.svelte
      sprites/  sounds/  scripts/   # same shape
      upload/[type]/+page.svelte
      u/[username]/+page.svelte
      me/+page.svelte
      admin/flags/+page.svelte
      api/
        uploads/presign/+server.ts
        listings/[type]/+server.ts
        flags/+server.ts
        downloads/[fileId]/+server.ts
  drizzle/                      # generated migrations
  docs/superpowers/specs/       # this spec lives here
```

## Build sequence

1. Scaffold project: `bun create svelte`, Tailwind, shadcn-svelte init, Drizzle, Turso CLI, R2 bucket provisioning, Better Auth install.
2. Drizzle schema + first migration; local Turso dev DB.
3. Better Auth wired (Google + GitHub + Discord + passkeys); `hooks.server.ts`; `(auth)/login` + `(auth)/signup` pages.
4. Port Zod helpers and per-type schemas from `shared/zod*`.
5. Global layout, theme tokens, retro fonts, Header/Footer, type-badge component.
6. Romhacks vertical end-to-end: list → detail → upload → download (download counter wired through `/api/downloads/[fileId]`).
7. Sprites, Sounds, Scripts — replicate the Romhacks pattern with their per-type meta and form fields.
8. Profiles: `/u/[username]` (public) and `/me` (private settings + drafts/uploads).
9. Versioning + changelog UI on detail pages; "upload new version" action.
10. Search & filtering UI on listings (faceted sidebar; LIKE on title/description/tags + filter columns).
11. Moderation: report button on listings, `flags` writes, `/admin/flags` review queue, `mature` toggle/blur on cards.
12. Polish pass: empty states, error boundaries, OG metadata, sitemap.

## Open items deferred to implementation planning

- Concrete shadcn-svelte components to install up front vs. on demand.
- Admin assignment mechanism (env var allowlist vs. `is_admin` column).
- Exact R2 ACL strategy (private bucket + signed GETs everywhere, vs. public-read for listings and signed only for drafts). Default plan: private + signed GET on every download.
- Quota numbers (per-user upload total, per-file size cap per asset type).

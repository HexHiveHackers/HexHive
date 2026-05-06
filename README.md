# HexHive

HexHive is a Pokémon ROM-hack asset hub: browse and upload romhacks, sprites, sounds, and scripts.

## Features

- **OAuth + passkeys** — sign in with Google, GitHub, or Discord; no passwords stored. Passkey registration available after first login. Login buttons render only for providers whose env vars are set.
- **Direct browser-to-R2 uploads** — the server signs a presigned PUT URL; file bytes never pass through the app server. Falls back to a local-FS shim in dev when R2 env isn't configured, so you can develop offline.
- **One unified upload wizard** — `/upload` is a single 4-step wizard. Step 0 picks the asset type (romhack / sprite / sound / script); the remaining steps reshape per type, and the wizard's accent color follows the chosen type. Old per-type URLs (`/upload/romhack`, `/upload/sprite`, etc.) 307 to the unified flow.
- **Versioning with changelog timeline** — re-upload a new version and prior versions are kept; a timeline shows the history.
- **SQLite FTS5 full-text search** — porter-stemmed canonical index plus a trigram-tokenized "did you mean" fallback for typos. Faceted by asset type and author.
- **User profiles** — `/me` and `/u/[username]` pages with animated avatars (PNG, APNG, JPEG, GIF, WebP). Header shows a dropdown with public profile, account settings, and sign out.
- **Account deletion** — users can delete their account (and all their listings, files, meta, and flags) from account settings. Best-effort R2 cleanup runs server-side.
- **Moderation** — anonymous-allowed reports, admin review queue, mature-content blur on flagged assets.
- **Dark-mode only** — modern shadcn shell with retro display-font accents (Press Start 2P / GBBoot) on headings and badges, subtle CRT scanlines on hero areas, and a hexagon-bead progress indicator on the upload wizard.

## Stack

- SvelteKit + Bun, Tailwind v4 + shadcn-svelte
- Drizzle ORM + Turso (libSQL / SQLite)
- Cloudflare R2 (file storage), with a filesystem-backed dev fallback
- Better Auth (OAuth + passkeys)

## Strict typing & lint

The codebase enforces a hard zero-tolerance policy:

- 0 errors **and 0 warnings** from `bun run check` (svelte-check) and `bun run lint` (Biome)
- `biome.json` is vanilla `"recommended": true` — no rule severity overrides
- No `as any`, no `as unknown`, and no suppression comments anywhere (`// biome-ignore`, `// @ts-expect-error`, `// @ts-ignore`, etc.)
- Pre-commit hook (husky + lint-staged) runs `biome check --write` on staged files

When something doesn't type, the answer is to type it correctly — not to suppress.

## Quickstart

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

OAuth provider env vars (Google, GitHub, Discord) can stay empty in development — login buttons render only for the providers you've configured.

R2 env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) can also stay empty in development. When unset, uploads route to a local filesystem shim at `.dev-storage/` (gitignored) via same-origin presigned URLs under `/api/_dev_storage/<key>`. Set the R2 env vars and restart to switch to real Cloudflare R2.

## Tests

```bash
bun run check      # svelte-check: type errors + a11y (0 errors AND 0 warnings)
bun run lint       # biome check (0 errors AND 0 warnings)
bun run test       # vitest run (unit + server tests)
bun run test:e2e   # Playwright end-to-end tests
```

Endpoint tests use the `tests/event.ts` `buildEvent({ ... })` helper to call internal `handle*` functions directly — no `RequestEvent` casts. See [CLAUDE.md](./CLAUDE.md) for the structural-handler pattern.

## Project structure

```
src/
├── lib/
│   ├── db/            # Drizzle schema + client singleton
│   ├── server/        # Server-only logic (listings, uploads, auth-utils, account, search)
│   ├── storage/       # R2 client + local-FS dev fallback
│   ├── components/    # Shared Svelte components + shadcn-svelte UI
│   └── schemas/       # Zod schemas per asset type (sprite uses a discriminated union)
├── routes/            # SvelteKit pages and API endpoints
│   └── upload/        # Unified 4-step wizard (type picker + per-type forms)
e2e/                   # Playwright tests
drizzle/               # Migration files
docs/superpowers/      # Plans, specs, and implementation history
docs/inspiration/      # Visual targets for upcoming UI work
```

## Search

The header search bar accepts free text plus optional `type:` and `from:` modifiers:

```
kaizo                    # full-text across title, description, tags, categories, author
type:romhack difficulty   # restrict by listing type
from:kaizo_dev            # restrict by author
from:kaizo_dev type:script  # combine
```

Search uses SQLite FTS5 with porter stemming for the canonical index, and a trigram-tokenized table as a typo-tolerant "did you mean" fallback when there are no exact matches. Mature listings are excluded by default; list pages opt in via `?mature=show`.

## Conventions

See [CLAUDE.md](./CLAUDE.md) for development conventions, the strict-typing policy, the structural-handler pattern, and the upload-flow contract.

## Plans

Implementation history is under `docs/superpowers/plans/`. The shipped/queued/scrapped roadmap is in [docs/ROADMAP.md](./docs/ROADMAP.md).

# HexHive

HexHive is a Pokémon ROM-hack asset hub: browse and upload romhacks, sprites, sounds, and scripts.

## Features

- **OAuth + passkeys** — sign in with Google, GitHub, or Discord; no passwords stored. Passkey registration available after first login.
- **Direct browser-to-R2 uploads** — the server signs a presigned PUT URL; file bytes never pass through the app server.
- **Four asset types** — romhacks, sprites, sounds, and scripts each have their own list, detail, and upload pages.
- **Versioning with changelog timeline** — re-upload a new version and prior versions are kept; a timeline shows the history.
- **SQLite FTS5 full-text search** — searches across titles and descriptions.
- **User profiles** — `/me` and `/u/[username]` pages with avatars.
- **Moderation** — anonymous-allowed reports, admin review queue, mature-content blur on flagged assets.

## Stack

- SvelteKit + Bun, Tailwind v4 + shadcn-svelte
- Drizzle ORM + Turso (libSQL / SQLite)
- Cloudflare R2 (file storage)
- Better Auth (OAuth + passkeys)

## Quickstart

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

OAuth provider env vars (Google, GitHub, Discord) can stay empty in development — the login buttons silently no-op for any unconfigured provider.

## Tests

```bash
bun run check      # svelte-check: type errors + a11y (0 errors required)
bun run test       # vitest run (unit + server tests)
bun run test:e2e   # Playwright end-to-end tests
```

## Project structure

```
src/
├── lib/
│   ├── db/            # Drizzle schema + client singleton
│   ├── server/        # Server-only logic (listings, uploads, auth-utils)
│   ├── components/    # Shared Svelte components + shadcn-svelte UI
│   └── schemas/       # Zod schemas per asset type
├── routes/            # SvelteKit pages and API endpoints
e2e/                   # Playwright tests
drizzle/               # Migration files
docs/superpowers/      # Plans and implementation history
```

## Search

The header search bar accepts free text plus optional `type:` and `from:` modifiers:

```
kaizo                    # full-text across title, description, tags, categories, author
type:romhack difficulty   # restrict by listing type
from:kaizo_dev            # restrict by author
from:kaizo_dev type:script  # combine
```

Search uses SQLite FTS5 with porter stemming for the canonical index, and a trigram-tokenized table as a typo-tolerant "did you mean" fallback when there are no exact matches.

## Conventions

See [CLAUDE.md](./CLAUDE.md) for development conventions.

## Plans

Implementation history is under `docs/superpowers/plans/`.

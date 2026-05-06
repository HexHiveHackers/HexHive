# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

HexHive is a Pokémon ROM-hack asset hub: browse and upload romhacks, sprites, sounds, and scripts. Built with SvelteKit + Bun, Drizzle ORM on Turso (libSQL), Cloudflare R2 for files, Better Auth (OAuth + passkeys), and shadcn-svelte UI with retro display-font accents.

## Commands

```bash
bun install                # install deps (also runs svelte-kit sync)
bun run dev                # dev server (http://localhost:5173)
bun run build              # production build (adapter-bun output)
bun run preview            # preview the production build
bun run check              # svelte-check (type + a11y); 0 errors required
bun run test               # vitest run (one-shot)
bun run test:watch         # vitest watch mode
bun run db:generate        # drizzle-kit generate (after schema changes)
bun run db:migrate         # apply pending migrations
bun run db:push            # push schema directly (skip migration files)
bun run db:studio          # drizzle-kit studio
```

Run a single test file: `bun run test src/lib/server/listings.test.ts`.

## Conventions

- **Use Bun for everything.** Don't add npm/pnpm/yarn lockfiles. The runtime is Bun via `svelte-adapter-bun`.
- **TypeScript only.** No `any` unless interop with an external library forces it.
- **Tailwind v4 + shadcn-svelte.** Use shadcn-svelte components from `$lib/components/ui/*`. Add new ones via `bun x shadcn-svelte@latest add <name>`.
- **Retro accents only on display elements.** `font-display` (Press Start 2P) for H1, type badges, and CRT-flavored hero. Body copy stays in the sans stack.
- **Use `??` (nullish coalescing), not `||`** when `0`, `false`, or `""` are valid values.
- **Server-only code lives under `src/lib/server/`.** Anything that touches `db`, secrets, or R2 belongs there. SvelteKit will refuse to ship server-only modules to the client; rely on that.
- **Validate at boundaries with Zod.** Every API endpoint parses its body with a Zod schema from `src/lib/schemas/`. Don't trust unknown JSON.
- **Files into R2 go directly from the browser** via presigned PUT URLs. The app server signs the URL and HEAD-verifies the upload during finalize — it never proxies file bytes.

## Architecture

- `src/lib/db/schema.ts` — single source of truth for all DB tables (Better Auth tables included).
- `src/lib/db/index.ts` — singleton Drizzle client.
- `src/lib/storage/r2.ts` — `presignPut`, `presignGet`, `headObject`. Always import from here, never from `@aws-sdk/client-s3` directly.
- `src/lib/auth.ts` — Better Auth instance with OAuth (Google/GitHub/Discord) + `@better-auth/passkey`. The Drizzle adapter writes to the same Turso DB.
- `src/hooks.server.ts` — populates `event.locals.user` and `event.locals.session`.
- `src/lib/server/auth-utils.ts` — `requireUser(event)` returns the user or throws a 303 to `/login?next=...`.
- `src/lib/schemas/*` — Zod schemas per asset type. The Sprite schema is currently simplified; Plan 3 replaces it with the full `SpriteVariant` discriminated union.
- `src/lib/server/listings.ts` — Romhack CRUD: `createRomhackDraft`, `finalizeRomhack`, `listRomhacks`, `getRomhackBySlug`, `incrementDownloads`. The `db` arg is injectable so unit tests use an in-memory libSQL.
- `src/lib/server/uploads.ts` — `presignFor` (returns presigned URLs scoped to `{listingId}/{versionId}/{nonce}-{name}`) and `verifyAllUploaded` (HEADs each key).
- `src/routes/api/uploads/{presign,finalize}/+server.ts` — the two POST endpoints that drive the upload flow.
- `src/routes/api/downloads/[fileId]/+server.ts` — increments the listing's `downloads` counter and 303-redirects to a signed R2 GET.

## Upload flow (do not change without good reason)

1. Browser POSTs metadata + declared file metadata to `/api/uploads/presign`.
2. Server validates with Zod + per-type allowlist (`src/lib/utils/file-types.ts`), drafts a listing, returns presigned PUT URLs (one per file).
3. Browser PUTs each file directly to R2.
4. Browser POSTs the resolved keys to `/api/uploads/finalize`.
5. Server HEADs every key (502 if any fail), persists `listing_file` rows, marks the listing `published`.

## Testing

- Vitest with jsdom. Setup file: `tests/setup.ts`.
- Component tests use `@testing-library/svelte`; `vitest.config.ts` sets `resolve.conditions: ['browser']` so component imports resolve Svelte's client bundle.
- Server tests that need a DB use an in-memory libSQL: `createClient({ url: ':memory:' })` then `migrate(db, { migrationsFolder: './drizzle' })` in `beforeAll`. Each test file gets its own worker process, so `:memory:` is isolated.
- SvelteKit's `error()` and `redirect()` THROW. Use `await expect(handler(...)).rejects.toMatchObject({ status: 4xx })` to assert.

## Known issues

- **bits-ui v2 + Tailwind v4 vite plugin** — `vite.config.ts` carries a small `excludeNodeModulesSvelteStyles` plugin to avoid Tailwind trying to parse Svelte virtual style modules from `node_modules`. Remove it once the upstream fix lands.
- **shadcn-svelte v1.2.7** does not include `slate` as a base color. We initialised with `zinc` (palette is identical in hue).

## Git & commits

- **Conventional commits** with optional scope: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs:`, `test:`.
- **Commit subject mentions the area touched** (`feat(romhacks): …`, `feat(api): …`, `feat(server): …`).
- **Every commit must include the Co-Authored-By trailer:**
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Don't push to GitHub until the user asks. The `origin` is `https://github.com/jmynes/hexhive` (private).
- Tags mark milestones: `foundation-complete`, `romhacks-vertical-complete`, etc.

## Plans and execution

Implementation work is driven by plans under `docs/superpowers/plans/`. Each plan is a sequence of bite-sized tasks with code blocks, TDD steps, and exact commands. Plans are executed task-by-task with the superpowers `subagent-driven-development` workflow: a fresh subagent per task, plus reviews. **Don't deviate from a plan mid-task** — if a step is wrong, escalate and revise the plan instead of improvising.

## Aesthetic

Modern shadcn shell with a few retro touches:
- Display headings (and badges/empty-state callouts) use Press Start 2P / GBBoot — only via the `font-display` utility, never on body copy.
- Subtle CRT scanline overlay (low-opacity repeating gradient) on hero-ish areas only.
- Type badges are color-coded per asset type (emerald/fuchsia/amber/sky for romhack/sprite/sound/script).

## Environment

`.env.example` lists every variable. Local dev runs against a SQLite file (`DATABASE_URL=file:./local.db`); production uses Turso (`libsql://...` + auth token). R2 keys, Better Auth secret, and OAuth client IDs are required for full functionality but most pages render without them — login buttons silently no-op for providers whose env is empty.

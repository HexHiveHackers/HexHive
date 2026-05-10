# /users filters + HHQL — design

## Goal

Turn the existing `/users` directory (a flat grid sorted by activity) into a filterable creator-discovery page. The filter UI is a row of chip dropdowns backed by HHQL — a JQL/PQL-style query language scoped to user records. Power users can toggle a `</>` editor and write HHQL directly; the chips and the editor are two views of one query string. URL state (`?q=` + `?sort=`) makes filters shareable.

HHQL is built as a reusable parser/evaluator under `src/lib/hhql/`, with a per-page field registry. Only `/users` consumes it in v1; other pages (search, admin) can plug in later without touching the parser.

## Non-goals

- No HHQL on `/search`, `/romhacks`, `/sprites`, etc. in v1. The infrastructure is reusable but only one consumer ships.
- No server-side filtering. The roster is enriched once and filtered in the browser. (Section: Data flow.)
- No new dimensions beyond what the schema below covers — no follower graph, no "favorited by", no badges.
- No Playwright e2e additions in v1.

## HHQL field schema (for `/users`)

| Field | Aliases | Type | Operators | Source |
|---|---|---|---|---|
| `username` | `handle` | string | `=` `!=` `~` `IN` `NOT IN` | `profile.username` (case-insensitive) |
| `alias` | `name` | string | `=` `!=` `~` `IS [NOT] EMPTY` | `profile.alias` |
| `bio` | — | string | `~` `IS [NOT] EMPTY` | `profile.bio` |
| `creates` | `makes` | enum-array | `=` `!=` `IN` `NOT IN` | distinct types of published listings the user authored |
| `listings` | `count` | number | `=` `!=` `>` `<` `>=` `<=` | total listings authored |
| `romhacks` `sprites` `sounds` `scripts` | — | number | numeric | per-type counts |
| `downloads` | `dls` | number | numeric | sum of `listing.downloads` across the user's listings |
| `active` | `lastActive` | date | numeric/date ops + `IS [NOT] EMPTY` | most recent session activity, or `null` if `hideActivity` |
| `joined` | `created` | date | numeric/date ops | `profile.createdAt` |
| `hasBio` `hasAlias` `hasAvatar` `hasLinks` `hasAffiliations` | — | bool | `=` (or bare keyword) | derived flags |
| `affiliation` | `team` `group` | string-array | `=` `!=` `~` `IN` `NOT IN` `IS [NOT] EMPTY` | `affiliation.name` joined via `profile_affiliation` |
| `role` | — | string-array | same | `profile_affiliation.role` |
| `aka` | — | string-array | same | `alias_entry.value` |
| `placeholder` | `unclaimed` | bool | `=` | `user.isPlaceholder` |
| `admin` | — | bool | `=` | `user.isAdmin` |

**Sort** is separate from the query (matching Punt's PQL): `?sort=field:dir`. Options: `active` (default desc), `joined`, `downloads`, `listings`, `username`. `dir` ∈ `asc`/`desc`.

## HHQL syntax

Same shape as Punt's PQL with two small additions; ordinal comparisons are dropped (no ordered enums in user-land).

**Carried from PQL:**
- `field op value`; quoted strings (`"…"`) for values containing whitespace or punctuation.
- `AND` / `OR` / `NOT`, parens, **implicit AND** between adjacent clauses.
- `IN (a, b, c)` / `NOT IN (...)`.
- `IS EMPTY` / `IS NOT EMPTY`.
- Relative dates: `-7d` `-2w` `-1m` `-1y`. Absolute dates in ISO (`2026-01-01`).
- Case-insensitive field names, operator keywords, and aliases.

**New in HHQL:**
- **`~` operator** — case-insensitive substring match for strings; "any element contains" for string-arrays. `bio ~ shiny`, `affiliation ~ "team aqua"`. Negate with `!~` or `NOT a ~ b`.
- **Bare boolean shorthand** — `hasBio` ≡ `hasBio = true`; `NOT hasBio` ≡ `hasBio = false`. Lets simple queries read like English: `creates = sprite hasBio active > -30d`.

**Examples:**
```
creates = sprite AND downloads > 1000
active > -30d hasBio NOT placeholder
affiliation ~ "team aqua" OR aka ~ skeetendo
joined > 2026-01-01 AND listings >= 3
(creates IN (sound, script)) AND active IS NOT EMPTY
```

**Lenient parsing:** while the user is typing, partial input (`active >`, trailing `AND`) parses to a partial AST without raising; the editor only flags syntactically impossible constructs (e.g. unbalanced parens, unknown field, type mismatch).

## Architecture

```
src/lib/hhql/
  index.ts                # public surface: parseHhql, evaluate, emit, highlight
  tokens.ts               # tokenizer with positions
  parser.ts               # AST + lenient recovery
  evaluator.ts            # AST + row -> boolean
  emit.ts                 # AST -> canonical text (used by chip ⇄ raw round-trip)
  highlight.ts            # AST -> spans for the highlight overlay
  fields.ts               # FieldRegistry interface (field metadata + value resolver)
  fields-users.ts         # the /users registry (table above, plus value extractors)
  hhql.test.ts            # vitest: tokenize/parse/evaluate/emit round-trip + errors

src/lib/components/users/
  FilterBar.svelte        # row of chip dropdowns
  HhqlInput.svelte        # </> textarea with highlight overlay + autocomplete
  filter-state.ts         # ChipState <-> AST <-> canonical text
  filter-state.test.ts    # vitest
  UserCard.svelte         # extracted from existing +page.svelte snippet (visually unchanged)

src/lib/server/
  users-directory.ts      # enrichDirectoryUsers(db) -> EnrichedUser[]
  users-directory.test.ts # in-memory libSQL fixture, asserts derived fields

src/routes/users/
  +page.server.ts         # swap listDirectoryUsers -> enrichDirectoryUsers; pass q+sort through
  +page.svelte            # mounts FilterBar + HhqlInput + grid; $derived filtered rows
```

The parser is field-agnostic — only the registry knows the field set. Adding HHQL to a future page is "write a new `fields-<page>.ts`".

## Data flow

**Server (`+page.server.ts`):**
```ts
export const load: PageServerLoad = async ({ url }) => {
  const users = await enrichDirectoryUsers(db);
  return {
    users,
    q: url.searchParams.get('q') ?? '',
    sort: url.searchParams.get('sort') ?? 'active:desc',
  };
};
```
Server never filters. It returns the full roster + the raw query string. Load runs once on initial render; subsequent edits stay in the browser.

**Client (`+page.svelte`):**
```ts
let query = $state(data.q);
let sort  = $state(data.sort);

const ast      = $derived(parseHhql(query, fieldsUsers));
const filtered = $derived(ast.ok ? evaluate(ast.value, data.users) : data.users);
const rows     = $derived(applySort(filtered, sort));
```
Two `$effect`s:
1. Sync `?q=` + `?sort=` to URL via `replaceState`, debounced ~150ms while typing. Empty `q` and default sort drop their params so the URL stays clean.
2. When `ast.ok === false`, pass `ast.error` + position to `HhqlInput` for the inline error tooltip.

**Failure mode:** invalid HHQL ⇒ `filtered` falls back to the full roster, the chip bar stays interactive, the `</>` editor underlines the bad span. Page never blanks.

**Empty state:** when `filtered.length === 0` but `data.users.length > 0`, show "No users match this query — `[clear]`" instead of the existing "No members yet." copy.

**Why `replaceState`, not `goto`:** the load only depends on the *initial* `?q`. Re-running it on every keystroke would refetch the same roster.

## Chip ⇄ query round-tripping

The chip bar is a projection of the AST; the **query string is the single source of truth**. Both chips and the `</>` editor write to the same `query` state.

**Chip change:**
1. User picks a chip preset (e.g. "last 7 days" in Active).
2. `filter-state.ts` reads the current AST, **replaces any node matching `field=active` (any operator)**, re-emits canonical text.
3. Write the new text to `query`. URL, derived rows, and the HHQL editor all update downstream.

**Raw text edit:**
1. User types in `HhqlInput`; debounced re-parse.
2. Chip bar reads the AST and reflects what it can:
   - Recognized clauses ⇒ chip shows the matching value.
   - Unrecognized clauses (e.g. `username ~ jor`) ⇒ `+1 custom` indicator on the bar. Chips replace by *field+operator-shape* match, so toggling another chip never clobbers the custom clause.

**Canonical emit rules** (so chip output is stable):
- Field names lowercase, operator keywords uppercase (`AND`, `IN`).
- Quote only when needed (whitespace or punctuation).
- Stable clause order: `creates` → `active` / `joined` → numeric (`downloads`, `listings`) → `has*` → `affiliation` / `role` / `aka` → identity (`placeholder`, `admin`) → free-text (`username` / `bio` / `alias`).
- Implicit AND between adjacent clauses; emit `AND` only when an `OR` elsewhere forces explicit precedence (then wrap with parens).

**Chip catalog:**

| Chip | Maps to |
|---|---|
| **Type** (multi) | `creates IN (...)` |
| **Active** (preset) | `active > -7d` / `> -30d` / `> 2026-01-01` / `IS [NOT] EMPTY` |
| **Joined** (preset) | `joined > -1m` / `> -1y` / `> 2026-01-01` |
| **Downloads** (preset) | `downloads >= 1` / `>= 100` / `>= 1000` |
| **Listings** (preset) | `listings >= 1` / `>= 5` / `>= 20` |
| **Has…** (multi-toggle) | `hasBio`, `hasLinks`, `hasAffiliations`, `hasAvatar`, `hasAlias` |
| **Affiliation** (multi; populated from roster) | `affiliation IN ("...","...")` |
| **Identity** | `placeholder = false` (default ON to hide unclaimed); `admin = true` toggle |
| **Sort** | writes to `?sort=` (not `?q=`) |

## Server enrichment

`enrichDirectoryUsers(db)` returns the existing `listDirectoryUsers` shape, augmented with:
- `listingsByType: Record<ListingType, number>`
- `totalDownloads: number`
- `hasBio` `hasAlias` `hasAvatar` `hasLinks` `hasAffiliations` (booleans)
- `affiliations: { name: string; role: string | null }[]`
- `akas: string[]`
- `isAdmin: boolean`

The `creates` array is derived client-side from `listingsByType` keys with `count > 0` (saves a column).

Implementation: one query joining `profile`, `user`, and an aggregate subquery over `listing` grouped by `(authorId, type)`; one query for `aliasEntry` keyed by user; one for `profile_affiliation` joined to `affiliation`. Hydrate into the row map. **Don't** lazy-load — the page shows everything by default and the filter is in-memory.

## Aesthetic

- Chip bar uses shadcn `Popover` + `Command` (already in repo). Chip label in `font-display`, value in body font.
- `</>` toggle button in the bar's right edge; opens an inline expandable region with the highlighted textarea. Mono font for the editor.
- Highlight palette: field name uses the page accent; operator muted-foreground bold; string literal `amber-300`; error span underline `destructive`.
- Default-collapsed `</>`. URL with `?q=` opens it expanded so shared links land on the right view.

## Testing

- **`src/lib/hhql/hhql.test.ts`** — every operator round-trips through tokenize → parse → emit; evaluator hit/miss per field type; lenient recovery on partial input (`active >`); error positions on bad input.
- **`src/lib/components/users/filter-state.test.ts`** — chip selection emits canonical string; `parse(emit(state)) === state`; raw custom clauses survive a chip toggle.
- **`src/lib/server/users-directory.test.ts`** — in-memory libSQL + `migrate()`, seed varied users, assert `listingsByType`, `totalDownloads`, `has*`, `affiliations`, `akas`.
- **`src/lib/components/users/FilterBar.test.ts`** (`@testing-library/svelte`) — clicking "last 30d" sets bound `query` to `active > -30d`; clicking the same preset again clears it.
- No Playwright e2e for v1.

## Migration / rollout

No DB migration. No new API endpoint. Behind no feature flag — ships as the new default `/users`. The existing card visual is preserved (extracted into `UserCard.svelte`); regressions are limited to ordering/visibility, which the test pyramid covers.

## Open questions

None blocking. Worth revisiting after v1 lands:
- Affiliation chip values from the roster's affiliations, or from the full `affiliation` table? (v1: from roster, so the dropdown only shows groups someone in the directory belongs to.)
- Server-side filtering threshold? Track roster size; if it crosses ~5k users, port the evaluator to a Drizzle WHERE emitter.

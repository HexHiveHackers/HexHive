# HexHive v1.2 — Search Performance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take search from "FTS5 prefix match, no ranking, two columns" to "ranked, stemmed, fuzzy-tolerant, faceted, paginated, with tags + categories indexed and a `from:username` filter."

**Architecture:** Keep one canonical FTS5 table for ranked exact/prefix/stemmed matching, add a second trigram-indexed table for fuzzy fallback when the canonical query produces zero hits. Triggers grow to also index `tags`, `categories`, `author username`. The `searchListings` helper grows: BM25-ranked, paginated, with optional author filter; the page surfaces faceted counts per type.

**Tech stack:** Same. No new packages. Just more SQL + a tiny query-syntax parser for `from:` and `type:` shortcuts.

**Starting tag:** `v1.1-complete`.

**Working dir:** `/home/user/Projects/hexhive`. Don't push until the user instructs.

---

## Scope

In scope:
1. BM25 ranking (cheap, big quality win).
2. Porter stemming on the canonical FTS table.
3. Index tags + categories + author username alongside title + description.
4. Trigram-indexed fallback table for fuzzy "did you mean" results when the canonical query returns zero hits.
5. Faceted counts by type on `/search`.
6. Pagination (offset + limit, "next" link).
7. Query syntax: `from:username` and `type:romhack` shortcuts the user can type into the search bar.
8. README + CLAUDE.md updates; tag `v1.2-complete`.

Out of scope:
- Search analytics / query logging (own future plan if wanted).
- Search-as-you-type live results (UI-heavy, defer).
- Synonyms/aliases dictionary (e.g., "fr" → "Fire Red").

---

## File structure (created/modified)

```
drizzle/
  0002_fts_porter.sql                  # NEW: drop + recreate listings_fts with porter, expand triggers
  0003_fts_trigram.sql                 # NEW: trigram virtual table + triggers
  meta/
    _journal.json                      # MODIFY: add 0002, 0003 entries
    0002_snapshot.json                 # NEW: copies of 0001's snapshot
    0003_snapshot.json
src/
  lib/
    server/
      search.ts                        # MODIFY: BM25 rank, pagination, fuzzy fallback, parseQuery
      search.test.ts                   # MODIFY: add new test cases
  routes/
    search/
      +page.server.ts                  # MODIFY: facets, pagination, fuzzy
      +page.svelte                     # MODIFY: facets row, "did you mean" panel, pagination
    sitemap.xml/+server.ts             # MODIFY (incidental): account for any new field if needed
CLAUDE.md                              # MODIFY: linter and search notes
README.md                              # MODIFY: search syntax mention
```

---

## Conventions (carry over)

- Use Bun. Don't push until instructed.
- Commit:
  ```
  git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit -m "<subject>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  ```
- Every commit has the Co-Authored-By trailer.
- Pre-commit hook now runs Biome on staged files. If it fails, fix the lint and re-commit — don't bypass.
- `bun run check`, `bun run test`, and `bun run test:e2e` must pass before commit.
- New SQL migrations: also write a corresponding snapshot JSON and journal entry, exactly as in v1's FTS task.

---

### Task 1: BM25 ranking + pagination on the existing FTS table

**Files:** Modify `src/lib/server/search.ts`, `src/lib/server/search.test.ts`.

This is the cheapest improvement: order by BM25 and paginate. No migration needed.

- [ ] **Step 1: Update `searchListings` signature**

```ts
export interface SearchHit {
  id: string;
  type: 'romhack' | 'sprite' | 'sound' | 'script';
  slug: string;
  title: string;
  snippet: string;
  rank: number;
}

export interface SearchOpts {
  type?: 'romhack' | 'sprite' | 'sound' | 'script';
  limit?: number;
  offset?: number;
}
```

- [ ] **Step 2: Update the SQL**

Replace the SELECT with:

```sql
SELECT
  l.id    AS id,
  l.type  AS type,
  l.slug  AS slug,
  l.title AS title,
  snippet(listings_fts, 4, '<b>', '</b>', '…', 16) AS snippet,
  bm25(listings_fts) AS rank
FROM listings_fts
JOIN listing l ON l.id = listings_fts.listing_id
WHERE listings_fts MATCH ${q}
  AND l.status = 'published'
  AND l.mature = 0
  ${filters.type ? sql`AND l.type = ${filters.type}` : sql``}
ORDER BY rank
LIMIT ${limit}
OFFSET ${offset}
```

(BM25 returns lower numbers for better matches; default ASC ordering is correct.)

- [ ] **Step 3: Mature exclusion in search**

The current `searchListings` doesn't filter mature. Add `AND l.mature = 0` (above) and surface an `includeMature` boolean in `SearchOpts` for parity with the list helpers. Default `false`.

- [ ] **Step 4: Update tests**

Add cases covering:
- `rank` is a number on each hit, sorted ascending.
- `limit`/`offset` work — insert 5 listings, request `{ limit: 2, offset: 2 }`, expect 2 results, expect they're the 3rd-and-4th by rank.
- Mature listings are excluded by default.

- [ ] **Step 5: Run + commit**

```bash
bun run check
bun run lint
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): BM25 ranking, pagination, mature exclusion" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Porter stemming + index tags/categories/author username

**Files:** Create `drizzle/0002_fts_porter.sql`, `drizzle/meta/0002_snapshot.json`, modify `drizzle/meta/_journal.json`. Modify `src/lib/server/search.test.ts`.

The canonical FTS table currently uses default Unicode61 tokenizer. Switching to `porter unicode61` makes plural/stem matches work ("hacks" matches "hack"). At the same time, expand the indexed columns to include tags + categories + author username so users can find a listing by any of those. Whichever route is taken, a migration drops + recreates `listings_fts` and the triggers.

- [ ] **Step 1: SQL migration — `drizzle/0002_fts_porter.sql`**

```sql
DROP TRIGGER IF EXISTS listings_fts_ai;
--> statement-breakpoint
DROP TRIGGER IF EXISTS listings_fts_au;
--> statement-breakpoint
DROP TRIGGER IF EXISTS listings_fts_ad;
--> statement-breakpoint
DROP TABLE IF EXISTS listings_fts;
--> statement-breakpoint

CREATE VIRTUAL TABLE listings_fts USING fts5(
  listing_id UNINDEXED,
  type       UNINDEXED,
  status     UNINDEXED,
  author_id  UNINDEXED,
  author_username,
  title,
  description,
  tags,
  categories,
  tokenize = "porter unicode61"
);
--> statement-breakpoint

-- INSERT trigger: pulls author username, romhack categories, asset-hive script categories, tags
CREATE TRIGGER listings_fts_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts(
    rowid, listing_id, type, status, author_id, author_username,
    title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.author_id,
    COALESCE((SELECT username FROM profile WHERE user_id = NEW.author_id), ''),
    NEW.title, NEW.description,
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)),
      ''
    ),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
  INSERT INTO listings_fts(
    rowid, listing_id, type, status, author_id, author_username,
    title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.author_id,
    COALESCE((SELECT username FROM profile WHERE user_id = NEW.author_id), ''),
    NEW.title, NEW.description,
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)),
      ''
    ),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
END;
--> statement-breakpoint

-- Reindex after profile.username changes (so author_username stays correct)
CREATE TRIGGER profile_fts_username_au AFTER UPDATE OF username ON profile BEGIN
  UPDATE listings_fts
     SET author_username = NEW.username
   WHERE author_id = NEW.user_id;
END;
--> statement-breakpoint

-- Reindex when romhack categories/tags change
CREATE TRIGGER romhack_meta_fts_au AFTER UPDATE ON romhack_meta BEGIN
  UPDATE listings_fts
     SET tags = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.tags)), ''),
         categories = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.categories)), '')
   WHERE listing_id = NEW.listing_id;
END;
--> statement-breakpoint

-- Reindex when script categories change
CREATE TRIGGER script_meta_fts_au AFTER UPDATE ON script_meta BEGIN
  UPDATE listings_fts
     SET categories = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.categories)), '')
   WHERE listing_id = NEW.listing_id;
END;
```

Notes on the SQL:
- `json_each` works on Drizzle's JSON-as-text columns because they're stored as JSON strings.
- The FROM `(SELECT 1) x` lets us LEFT JOIN both meta tables in one statement; only one (or neither) will be present per listing.
- `categories` for sprite/sound listings stays empty in this iteration — sprite categories are deeply nested objects (the SpriteVariant tree), not flat arrays. Indexing them well is a future task.

- [ ] **Step 2: Snapshot + journal entries**

Copy `drizzle/meta/0001_snapshot.json` to `drizzle/meta/0002_snapshot.json`. Update `drizzle/meta/_journal.json` to register `idx: 2, tag: "0002_fts_porter", when: <ts>, breakpoints: true`.

- [ ] **Step 3: Verify locally**

```bash
cd /home/user/Projects/hexhive
rm -f local.db local.db-journal local.db-shm local.db-wal
bun run db:migrate
echo $?
```

Expect 0. Inspect:

```bash
bun -e "
import('@libsql/client').then(({createClient}) => {
  const c = createClient({ url: 'file:./local.db' });
  return c.execute('SELECT sql FROM sqlite_master WHERE name = ?', ['listings_fts'])
    .then(r => { console.log(r.rows); process.exit(0); });
});
"
```

Confirm the table definition includes `tokenize = "porter unicode61"` and the new columns.

- [ ] **Step 4: Update tests**

Append to `src/lib/server/search.test.ts`:

```ts
it('matches stems via porter (hacks → hack)', async () => {
  // arrange a listing with title "Awesome Hack"
  // search for "hacks"
  // expect a hit
});

it('finds by tag', async () => {
  // arrange a listing with tags: ['nuzlocke', 'difficulty']
  // search for "nuzlocke"
  // expect a hit
});

it('finds by category', async () => {
  // arrange a romhack with categories: ['Difficulty']
  // search for "difficulty"
  // expect a hit
});

it('finds by author username', async () => {
  // arrange a listing whose author has profile.username = 'kaizo_dev'
  // search for "kaizo_dev"
  // expect a hit
});
```

Fill these in concretely — see existing tests for the pattern. Each test creates the listing + meta + (where relevant) profile rows, then asserts.

- [ ] **Step 5: Commit**

```bash
bun run check
bun run lint
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): porter stemming, index tags/categories/author username" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Trigram fallback table for fuzzy "did you mean"

**Files:** Create `drizzle/0003_fts_trigram.sql`, `drizzle/meta/0003_snapshot.json`. Modify `_journal.json`. Modify `src/lib/server/search.ts` and tests.

A second FTS5 virtual table tokenized with `trigram` indexes the same content. Trigram FTS supports substring/typo-tolerant matching — when the canonical query yields zero hits, we run the trigram query as a "did you mean" fallback. Two tables is fine — the trigram one is small and only consulted on misses.

- [ ] **Step 1: SQL migration — `drizzle/0003_fts_trigram.sql`**

```sql
CREATE VIRTUAL TABLE listings_fts_trgm USING fts5(
  listing_id UNINDEXED,
  type       UNINDEXED,
  status     UNINDEXED,
  title,
  description,
  tags,
  categories,
  tokenize = "trigram"
);
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts_trgm(
    rowid, listing_id, type, status, title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts_trgm) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description,
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts_trgm WHERE listing_id = OLD.id;
  INSERT INTO listings_fts_trgm(
    rowid, listing_id, type, status, title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts_trgm) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description,
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts_trgm WHERE listing_id = OLD.id;
END;
```

- [ ] **Step 2: Snapshot + journal entries**

Same as Task 2 — copy snapshot, add journal entry `idx: 3`.

- [ ] **Step 3: Verify migration applies**

```bash
rm -f local.db*
bun run db:migrate
```

Inspect that `listings_fts_trgm` exists and uses `tokenize = trigram`.

- [ ] **Step 4: Implement fuzzy fallback in `searchListings`**

Add a `searchListingsFuzzy(db, query, opts)` helper that runs against `listings_fts_trgm`. The trigram tokenizer doesn't support `MATCH` with prefix syntax — it does substring matching. Query syntax: a single-quoted phrase.

Sketch (inside `src/lib/server/search.ts`):

```ts
export async function searchListingsFuzzy(
  db: DB,
  query: string,
  opts: SearchOpts = {}
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 20;
  const result = await db.run(sql`
    SELECT
      l.id    AS id,
      l.type  AS type,
      l.slug  AS slug,
      l.title AS title,
      snippet(listings_fts_trgm, 3, '<b>', '</b>', '…', 16) AS snippet,
      0 AS rank
    FROM listings_fts_trgm
    JOIN listing l ON l.id = listings_fts_trgm.listing_id
    WHERE listings_fts_trgm MATCH ${q}
      AND l.status = 'published'
      AND l.mature = 0
      ${opts.type ? sql`AND l.type = ${opts.type}` : sql``}
    LIMIT ${limit}
  `);
  return (Array.isArray(result.rows) ? result.rows : []).map((r: any) => ({
    id: r.id ?? r[0],
    type: r.type ?? r[1],
    slug: r.slug ?? r[2],
    title: r.title ?? r[3],
    snippet: sanitizeSnippet(String(r.snippet ?? r[4] ?? '')),
    rank: 0
  }));
}
```

- [ ] **Step 5: Tests**

Add fuzzy tests:

```ts
it('fuzzy fallback finds typoed query', async () => {
  // listing title: "Kaizo Emerald"
  // query: "kayzo"
  // searchListings → 0 hits
  // searchListingsFuzzy → at least one hit including "Kaizo Emerald"
});

it('fuzzy still respects type filter', async () => {
  // create a romhack and a sprite both matching "kayz"
  // searchListingsFuzzy with { type: 'sprite' } returns only the sprite
});
```

- [ ] **Step 6: Commit**

```bash
bun run check
bun run lint
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): trigram fallback table + searchListingsFuzzy helper" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Query syntax — `from:username` and `type:romhack`

**Files:** Modify `src/lib/server/search.ts`, `src/lib/server/search.test.ts`.

Strip `from:foo` and `type:bar` tokens from the user's query and convert them into structured filters. The remaining text is the actual full-text search.

- [ ] **Step 1: parseQuery helper**

Add to `search.ts`:

```ts
export interface ParsedQuery {
  text: string;
  type?: 'romhack' | 'sprite' | 'sound' | 'script';
  fromUsername?: string;
}

const TYPES = ['romhack', 'sprite', 'sound', 'script'] as const;

export function parseQuery(raw: string): ParsedQuery {
  const out: ParsedQuery = { text: '' };
  const remaining: string[] = [];
  for (const tok of raw.trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(\w+):(.+)$/);
    if (!m) { remaining.push(tok); continue; }
    const [, key, val] = m;
    if (key === 'type' && (TYPES as readonly string[]).includes(val.toLowerCase())) {
      out.type = val.toLowerCase() as ParsedQuery['type'];
    } else if (key === 'from') {
      out.fromUsername = val;
    } else {
      // Unknown key: treat the whole token as text
      remaining.push(tok);
    }
  }
  out.text = remaining.join(' ');
  return out;
}
```

- [ ] **Step 2: Apply in `searchListings`**

Make `searchListings` accept the same `ParsedQuery` shape via `opts`:

```ts
export interface SearchOpts {
  type?: 'romhack' | 'sprite' | 'sound' | 'script';
  fromUsername?: string;
  limit?: number;
  offset?: number;
  includeMature?: boolean;
}
```

In the SQL, when `opts.fromUsername` is set, add `AND listings_fts.author_username MATCH ${escaped}` OR more correctly add a filter on the joined `profile.username` column:

```sql
${opts.fromUsername
  ? sql`AND EXISTS (SELECT 1 FROM profile p WHERE p.user_id = l.author_id AND lower(p.username) = lower(${opts.fromUsername}))`
  : sql``}
```

(This is more reliable than relying on the FTS index for the username — the FTS author_username column was added in Task 2 but querying it via `MATCH` requires extra escaping.)

- [ ] **Step 3: Tests**

```ts
it('parseQuery splits free text from from: and type:', () => {
  expect(parseQuery('kaizo from:alice type:romhack')).toEqual({
    text: 'kaizo', type: 'romhack', fromUsername: 'alice'
  });
});

it('parseQuery passes unknown keys through as text', () => {
  expect(parseQuery('kaizo foo:bar')).toEqual({ text: 'kaizo foo:bar' });
});

it('searchListings respects fromUsername filter', async () => {
  // arrange: listing 'A' authored by user 'alice', listing 'B' by 'bob'
  // searchListings(db, '', { fromUsername: 'alice' })
  // expect only 'A'
});
```

- [ ] **Step 4: Commit**

```bash
bun run check
bun run lint
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): parseQuery for from: and type: shortcuts + fromUsername filter" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Faceted counts on the search page

**Files:** Modify `src/lib/server/search.ts`, `src/routes/search/+page.server.ts`, `src/routes/search/+page.svelte`.

When the user searches without a type filter, show a row of counts per type (`Romhacks: 12   Sprites: 3   Sounds: 1   Scripts: 0`). Each is a link that re-runs the same query with `type=<that>`.

- [ ] **Step 1: Counts helper**

```ts
export async function searchListingsFacets(
  db: DB,
  query: string,
  opts: Omit<SearchOpts, 'type' | 'limit' | 'offset'> = {}
): Promise<Record<'romhack' | 'sprite' | 'sound' | 'script', number>> {
  const q = escapeFts(query);
  if (!q) return { romhack: 0, sprite: 0, sound: 0, script: 0 };
  const result = await db.run(sql`
    SELECT l.type AS type, COUNT(*) AS n
    FROM listings_fts
    JOIN listing l ON l.id = listings_fts.listing_id
    WHERE listings_fts MATCH ${q}
      AND l.status = 'published'
      AND l.mature = 0
      ${opts.fromUsername
        ? sql`AND EXISTS (SELECT 1 FROM profile p WHERE p.user_id = l.author_id AND lower(p.username) = lower(${opts.fromUsername}))`
        : sql``}
    GROUP BY l.type
  `);
  const out = { romhack: 0, sprite: 0, sound: 0, script: 0 };
  for (const r of (Array.isArray(result.rows) ? result.rows : [])) {
    const row = r as any;
    const t = (row.type ?? row[0]) as keyof typeof out;
    if (t in out) out[t] = Number(row.n ?? row[1] ?? 0);
  }
  return out;
}
```

- [ ] **Step 2: Wire into `/search` server load**

```ts
// inside load:
const { text, type: parsedType, fromUsername } = parseQuery(q);
const typeFromUrl = (['romhack','sprite','sound','script'] as const).find((t) => t === url.searchParams.get('type'));
const type = typeFromUrl ?? parsedType;

const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
const limit = 20;

const [hits, facets] = await Promise.all([
  text || fromUsername
    ? searchListings(db, text, { type, fromUsername, limit, offset })
    : Promise.resolve([]),
  text ? searchListingsFacets(db, text, { fromUsername }) : Promise.resolve(null)
]);

let didYouMean: SearchHit[] = [];
if (text && hits.length === 0) {
  didYouMean = await searchListingsFuzzy(db, text, { type, limit: 10 });
}

return {
  q, text, type: type ?? null, fromUsername: fromUsername ?? null,
  offset, limit,
  hits, facets, didYouMean
};
```

- [ ] **Step 3: Update `/search` page**

- Add a row of facet links above the result list when `data.facets` is set.
- When `data.hits.length === 0` and `data.didYouMean.length > 0`, render a "No exact matches. Did you mean…" panel above the fuzzy hits.
- Pagination: a "Next →" link that increments `offset` by `limit`. A "← Previous" link when `offset > 0`. Don't show counts; the FTS5 result count isn't free.

Provide concrete Svelte code that handles all three things. Use SvelteKit's `<a href>` to keep the form `method="get"` semantics.

- [ ] **Step 4: Smoke + commit**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "GET /search?q=test HTTP %{http_code}\n" 'http://localhost:5173/search?q=test'
curl -s -o /dev/null -w "GET /search?q=type:romhack HTTP %{http_code}\n" 'http://localhost:5173/search?q=type:romhack'
pkill -f 'vite dev'

bun run check
bun run lint
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): faceted counts, fuzzy fallback display, pagination on /search" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Wrap-up — README + CLAUDE.md + tag

**Files:** Modify `CLAUDE.md`, `README.md`. Tag `v1.2-complete`.

- [ ] **Step 1: CLAUDE.md update**

In the Architecture section, add a one-line note about the trigram fallback table. In the "Known issues" section, note that sprite categories aren't yet indexed for search (deeply nested data). Add a "Search syntax" sub-section in a sensible spot:

```
## Search syntax

- Free text matches title, description, tags, categories, and author username (porter-stemmed).
- `type:romhack` (or `sprite|sound|script`) restricts to one type.
- `from:username` restricts to a single author.
- Mature listings are excluded by default; toggle on the list pages with `?mature=show` (search page does not surface them).
- Zero-hit queries fall back to a trigram fuzzy match for "did you mean".
```

- [ ] **Step 2: README.md update**

Add a one-paragraph "Search" section linking to the syntax in CLAUDE.md or duplicating the bullet list — your call. Keep it short.

- [ ] **Step 3: Tag**

```bash
bun run check
bun run lint
bun run test
bun run test:e2e
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "docs: search syntax notes; tag v1.2" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git tag v1.2-complete
git log --oneline | head -10
git tag --list
```

---

## Self-review

**Scope coverage:**
- BM25 ranking + pagination + mature exclusion → Task 1 ✓
- Porter stemming, expanded indexed columns → Task 2 ✓
- Trigram fallback → Task 3 ✓
- `from:` / `type:` query syntax → Task 4 ✓
- Faceted counts + fuzzy fallback display + pagination on `/search` → Task 5 ✓
- Docs + tag → Task 6 ✓

**Out of scope, explicitly:**
- Search analytics / query logging.
- Search-as-you-type / debounced live results.
- Synonym dictionary.
- Sprite category indexing (the SpriteVariant tree is deeply nested; a flat-extract step would be a Task on its own).

**Type consistency:** `SearchHit`, `SearchOpts`, `ParsedQuery` defined once in `search.ts`. All consumers go through `parseQuery` + `searchListings`/`searchListingsFuzzy`/`searchListingsFacets`.

**Migration order matters:** Task 2's migration drops + recreates the FTS table. Existing rows are re-indexed by the triggers ONLY for new inserts after the migration. After Task 2 ships, running `db:migrate` against a populated DB will leave existing rows un-indexed in the new table. Add a one-time backfill at the end of `0002_fts_porter.sql`:

```sql
-- backfill: re-emit existing listings into the new FTS table by re-issuing the INSERT trigger logic
INSERT INTO listings_fts(
  rowid, listing_id, type, status, author_id, author_username,
  title, description, tags, categories
)
SELECT
  ROW_NUMBER() OVER (ORDER BY l.created_at),
  l.id, l.type, l.status, l.author_id,
  COALESCE(p.username, ''),
  l.title, l.description,
  COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
  COALESCE(
    (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
  )
FROM listing l
LEFT JOIN profile p ON p.user_id = l.author_id
LEFT JOIN romhack_meta rm ON rm.listing_id = l.id
LEFT JOIN script_meta sm ON sm.listing_id = l.id;
```

Same idea at the end of `0003_fts_trigram.sql`. Make sure that's in place before committing the migrations — the in-memory test DB also benefits from the backfill (it never has any data at migration time, so the backfill is a no-op there, but production runs are populated and need it).

---

## What this plan does NOT cover

- Search analytics — would need a `search_query` table + middleware. Worth a future plan if there's appetite.
- Search-as-you-type — UI debouncing + a JSON endpoint. Defer.
- Sprite SpriteVariant flattening for search — extract `type/subtype/variant` into a single text column at trigger time. A small but careful task; defer until the indexed corpus actually contains many sprites.

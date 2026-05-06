import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import type * as schema from '$lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

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
  includeMature?: boolean;
}

/**
 * Sanitize a SQLite FTS5 snippet that may contain <b>…</b> highlight tags.
 * We escape all HTML, then restore the bold markers so the browser only ever
 * renders literal text content wrapped in safe <b> elements.
 */
function sanitizeSnippet(raw: string): string {
  // Placeholder tokens unlikely to survive in user content
  const OPEN = '\x00BOLD_OPEN\x00';
  const CLOSE = '\x00BOLD_CLOSE\x00';
  // Protect the FTS-generated <b> / </b> pairs before escaping
  let s = raw.replaceAll('<b>', OPEN).replaceAll('</b>', CLOSE);
  // Escape everything (incl. any attacker-injected HTML in title/description)
  s = s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  // Restore bold markers as safe tags
  s = s.replaceAll(OPEN, '<b>').replaceAll(CLOSE, '</b>');
  return s;
}

function escapeFts(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '')}"*`)
    .join(' ');
}

export async function searchListings(db: DB, query: string, opts: SearchOpts = {}): Promise<SearchHit[]> {
  const q = escapeFts(query);
  if (!q) return [];

  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const includeMature = opts.includeMature ?? false;

  const result = await db.run(sql`
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
      ${includeMature ? sql`` : sql`AND l.mature = 0`}
      ${opts.type ? sql`AND l.type = ${opts.type}` : sql``}
    ORDER BY rank
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return (result.rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    let hit: SearchHit;
    // libSQL may return positional arrays or named objects depending on driver/version
    if (Array.isArray(r)) {
      const arr = r as unknown[];
      hit = { id: arr[0], type: arr[1], slug: arr[2], title: arr[3], snippet: arr[4], rank: arr[5] } as SearchHit;
    } else {
      hit = row as unknown as SearchHit;
    }
    return { ...hit, snippet: sanitizeSnippet(String(hit.snippet ?? '')), rank: Number(hit.rank) };
  });
}

/**
 * Fuzzy/typo-tolerant search using the trigram FTS5 table.
 * Use as a fallback when `searchListings` returns zero hits.
 */
export async function searchListingsFuzzy(db: DB, query: string, opts: SearchOpts = {}): Promise<SearchHit[]> {
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
      ${opts.includeMature ? sql`` : sql`AND l.mature = 0`}
      ${opts.type ? sql`AND l.type = ${opts.type}` : sql``}
    LIMIT ${limit}
  `);

  // Mirror the array-vs-object branch the existing searchListings uses.
  const rows = (Array.isArray(result.rows) ? result.rows : []) as unknown[];
  return rows.map((r): SearchHit => {
    const row = r as Record<string, unknown> | unknown[];
    if (Array.isArray(row)) {
      return {
        id: String(row[0]),
        type: row[1] as SearchHit['type'],
        slug: String(row[2]),
        title: String(row[3]),
        snippet: sanitizeSnippet(String(row[4] ?? '')),
        rank: 0,
      };
    }
    return {
      id: String(row.id),
      type: row.type as SearchHit['type'],
      slug: String(row.slug),
      title: String(row.title),
      snippet: sanitizeSnippet(String(row.snippet ?? '')),
      rank: 0,
    };
  });
}

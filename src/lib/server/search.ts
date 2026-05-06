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
  fromUsername?: string;
  limit?: number;
  offset?: number;
  includeMature?: boolean;
}

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
    if (!m) {
      remaining.push(tok);
      continue;
    }
    const [, key, val] = m;
    if (key === 'type' && (TYPES as readonly string[]).includes(val.toLowerCase())) {
      out.type = val.toLowerCase() as ParsedQuery['type'];
    } else if (key === 'from') {
      out.fromUsername = val;
    } else {
      remaining.push(tok);
    }
  }
  out.text = remaining.join(' ');
  return out;
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
  if (!q && !opts.fromUsername) return [];

  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const includeMature = opts.includeMature ?? false;

  // fromUsername-only path: no FTS match, just a relational filter
  if (!q) {
    const fromUsername = opts.fromUsername ?? '';
    const result = await db.run(sql`
      SELECT l.id AS id, l.type AS type, l.slug AS slug, l.title AS title, '' AS snippet, 0 AS rank
      FROM listing l
      JOIN profile p ON p.user_id = l.author_id
      WHERE l.status = 'published'
        ${includeMature ? sql`` : sql`AND l.mature = 0`}
        ${opts.type ? sql`AND l.type = ${opts.type}` : sql``}
        AND lower(p.username) = lower(${fromUsername})
      ORDER BY l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
    return (Array.isArray(result.rows) ? result.rows : []).map((r): SearchHit => {
      if (Array.isArray(r)) {
        return {
          id: String(r[0]),
          type: r[1] as SearchHit['type'],
          slug: String(r[2]),
          title: String(r[3]),
          snippet: '',
          rank: 0,
        };
      }
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        type: row.type as SearchHit['type'],
        slug: String(row.slug),
        title: String(row.title),
        snippet: '',
        rank: 0,
      };
    });
  }

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
      ${
        opts.fromUsername
          ? sql`AND EXISTS (
            SELECT 1 FROM profile p
            WHERE p.user_id = l.author_id AND lower(p.username) = lower(${opts.fromUsername})
          )`
          : sql``
      }
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

export async function searchListingsFacets(
  db: DB,
  query: string,
  opts: Omit<SearchOpts, 'type' | 'limit' | 'offset'> = {},
): Promise<Record<'romhack' | 'sprite' | 'sound' | 'script', number>> {
  const out = { romhack: 0, sprite: 0, sound: 0, script: 0 };
  const q = escapeFts(query);
  const fromUsername = opts.fromUsername;
  if (!q && !fromUsername) return out;

  const result = await (q
    ? db.run(sql`
        SELECT l.type AS type, COUNT(*) AS n
        FROM listings_fts
        JOIN listing l ON l.id = listings_fts.listing_id
        WHERE listings_fts MATCH ${q}
          AND l.status = 'published'
          ${opts.includeMature ? sql`` : sql`AND l.mature = 0`}
          ${
            fromUsername
              ? sql`AND EXISTS (SELECT 1 FROM profile p WHERE p.user_id = l.author_id AND lower(p.username) = lower(${fromUsername}))`
              : sql``
          }
        GROUP BY l.type
      `)
    : db.run(sql`
        SELECT l.type AS type, COUNT(*) AS n
        FROM listing l
        JOIN profile p ON p.user_id = l.author_id
        WHERE l.status = 'published'
          ${opts.includeMature ? sql`` : sql`AND l.mature = 0`}
          AND lower(p.username) = lower(${fromUsername})
        GROUP BY l.type
      `));

  for (const r of Array.isArray(result.rows) ? result.rows : []) {
    const row = r as unknown as Record<string, unknown> | unknown[];
    const t = Array.isArray(row) ? row[0] : row.type;
    const n = Array.isArray(row) ? row[1] : row.n;
    if (typeof t === 'string' && t in out) {
      (out as Record<string, number>)[t] = Number(n ?? 0);
    }
  }
  return out;
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
      ${
        opts.fromUsername
          ? sql`AND EXISTS (
            SELECT 1 FROM profile p
            WHERE p.user_id = l.author_id AND lower(p.username) = lower(${opts.fromUsername})
          )`
          : sql``
      }
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

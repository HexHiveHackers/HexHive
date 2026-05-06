import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface SearchHit {
  id: string;
  type: 'romhack' | 'sprite' | 'sound' | 'script';
  slug: string;
  title: string;
  snippet: string;
}

function escapeFts(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '')}"*`)
    .join(' ');
}

export async function searchListings(
  db: DB,
  query: string,
  filters: { type?: 'romhack' | 'sprite' | 'sound' | 'script' } = {}
): Promise<SearchHit[]> {
  const q = escapeFts(query);
  if (!q) return [];

  const result = await db.run(sql`
    SELECT
      l.id    AS id,
      l.type  AS type,
      l.slug  AS slug,
      l.title AS title,
      snippet(listings_fts, 4, '<b>', '</b>', '…', 16) AS snippet
    FROM listings_fts
    JOIN listing l ON l.id = listings_fts.listing_id
    WHERE listings_fts MATCH ${q}
      AND l.status = 'published'
      ${filters.type ? sql`AND l.type = ${filters.type}` : sql``}
    LIMIT 60
  `);

  return (result.rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    // libSQL may return positional arrays or named objects depending on driver/version
    if (Array.isArray(r)) {
      const arr = r as unknown[];
      return { id: arr[0], type: arr[1], slug: arr[2], title: arr[3], snippet: arr[4] } as SearchHit;
    }
    return row as unknown as SearchHit;
  });
}

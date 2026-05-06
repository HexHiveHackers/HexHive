import { db } from '$lib/db';
import {
  parseQuery,
  type SearchHit,
  searchListings,
  searchListingsFacets,
  searchListingsFuzzy,
} from '$lib/server/search';
import type { PageServerLoad } from './$types';

const TYPES = ['romhack', 'sprite', 'sound', 'script'] as const;
type SearchType = (typeof TYPES)[number];

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';

  const parsed = parseQuery(q);
  const typeFromUrl = TYPES.find((t) => t === url.searchParams.get('type')) as SearchType | undefined;
  const type = typeFromUrl ?? parsed.type;
  const fromUsername = parsed.fromUsername;

  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = 20;

  const hasAnyFilter = !!(parsed.text || fromUsername);
  let hits: SearchHit[] = [];
  let facets: Record<SearchType, number> | null = null;
  let didYouMean: SearchHit[] = [];

  if (hasAnyFilter) {
    hits = await searchListings(db, parsed.text, { type, fromUsername, limit, offset });
    facets = await searchListingsFacets(db, parsed.text, { fromUsername });
    if (parsed.text && hits.length === 0) {
      didYouMean = await searchListingsFuzzy(db, parsed.text, { type, limit: 10 });
    }
  }

  return {
    q,
    text: parsed.text,
    type: type ?? null,
    fromUsername: fromUsername ?? null,
    offset,
    limit,
    hits,
    facets,
    didYouMean,
  };
};

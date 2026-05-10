import type { ListingType } from '$lib/db/schema';

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  type: 'article';
}

const OG_IMAGE_BY_TYPE: Record<ListingType, string> = {
  romhack: '/og-romhacks.jpg',
  sprite: '/og-sprites.jpg',
  sound: '/og-sounds.jpg',
  script: '/og-scripts.jpg',
};

export function buildOgMeta(args: {
  origin: string;
  listingType: ListingType;
  slug: string;
  title: string;
  description: string;
}): OgMeta {
  const route = args.listingType === 'romhack' ? 'romhacks' : `${args.listingType}s`;
  return {
    title: `${args.title} — HexHive`,
    description: (args.description || 'Pokemon ROM hack asset on HexHive').slice(0, 280),
    url: `${args.origin}/${route}/${args.slug}`,
    image: `${args.origin}${OG_IMAGE_BY_TYPE[args.listingType]}`,
    type: 'article',
  };
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

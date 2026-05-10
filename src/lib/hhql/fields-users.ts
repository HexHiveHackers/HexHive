import type { ListingType } from '$lib/db/schema';

import { buildRegistry, type FieldRegistry } from './fields';

export interface DirectoryRow {
  username: string;
  alias: string | null;
  bio: string | null;
  listingsByType: Record<ListingType, number>;
  totalDownloads: number;
  lastActive: number | null; // ms since epoch
  joinedAt: number; // ms since epoch
  hasBio: boolean;
  hasAlias: boolean;
  hasAvatar: boolean;
  hasLinks: boolean;
  hasAffiliations: boolean;
  affiliations: { name: string; role: string | null }[];
  akas: string[];
  isPlaceholder: boolean;
  isAdmin: boolean;
  // visual-only fields (not filterable; for rendering only)
  name: string;
  avatarKey: string | null;
  pronouns: string | null;
  placeholderKind: 'contributor' | 'user';
}

export const fieldsUsers: FieldRegistry<DirectoryRow> = buildRegistry<DirectoryRow>([
  { name: 'username', aliases: ['handle'], type: 'string', read: (r) => r.username },
  { name: 'alias', aliases: ['name'], type: 'string', read: (r) => r.alias },
  { name: 'bio', type: 'string', read: (r) => r.bio },
  {
    name: 'creates',
    aliases: ['makes'],
    type: 'enum[]',
    enumValues: ['romhack', 'sprite', 'sound', 'script'],
    read: (r) =>
      Object.entries(r.listingsByType)
        .filter(([, n]) => n > 0)
        .map(([t]) => t),
  },
  {
    name: 'listings',
    aliases: ['count'],
    type: 'number',
    read: (r) => Object.values(r.listingsByType).reduce((a, b) => a + b, 0),
  },
  { name: 'romhacks', type: 'number', read: (r) => r.listingsByType.romhack },
  { name: 'sprites', type: 'number', read: (r) => r.listingsByType.sprite },
  { name: 'sounds', type: 'number', read: (r) => r.listingsByType.sound },
  { name: 'scripts', type: 'number', read: (r) => r.listingsByType.script },
  { name: 'downloads', aliases: ['dls'], type: 'number', read: (r) => r.totalDownloads },
  { name: 'active', aliases: ['lastactive'], type: 'date', read: (r) => r.lastActive },
  { name: 'joined', aliases: ['created'], type: 'date', read: (r) => r.joinedAt },
  { name: 'hasbio', type: 'bool', read: (r) => r.hasBio },
  { name: 'hasalias', type: 'bool', read: (r) => r.hasAlias },
  { name: 'hasavatar', type: 'bool', read: (r) => r.hasAvatar },
  { name: 'haslinks', type: 'bool', read: (r) => r.hasLinks },
  { name: 'hasaffiliations', type: 'bool', read: (r) => r.hasAffiliations },
  {
    name: 'affiliation',
    aliases: ['team', 'group'],
    type: 'string[]',
    read: (r) => r.affiliations.map((a) => a.name),
  },
  {
    name: 'role',
    type: 'string[]',
    read: (r) => r.affiliations.map((a) => a.role).filter((x): x is string => x !== null),
  },
  { name: 'aka', type: 'string[]', read: (r) => r.akas },
  {
    name: 'placeholder',
    aliases: ['unclaimed'],
    type: 'bool',
    read: (r) => r.isPlaceholder,
  },
  { name: 'admin', type: 'bool', read: (r) => r.isAdmin },
]);

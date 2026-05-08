import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const ts = (name: string) => integer(name, { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull();

/* -------- Better Auth core (matches Better Auth's expected schema) -------- */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const passkey = sqliteTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type').notNull(),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
  transports: text('transports'),
  createdAt: ts('created_at'),
});

/* -------- Application -------- */

export const profile = sqliteTable(
  'profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    pronouns: text('pronouns'),
    bio: text('bio'),
    avatarKey: text('avatar_key'),
    bannerKey: text('banner_key'),
    // User-set contact email. No verification, no SMTP — purely a string
    // the owner types in for credit / public display. Distinct from
    // user.email which is the synthetic OAuth-identity placeholder.
    contactEmail: text('contact_email'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => ({
    usernameIdx: uniqueIndex('profile_username_unique').on(sql`lower(${t.username})`),
  }),
);

export const listingType = ['romhack', 'sprite', 'sound', 'script'] as const;
export type ListingType = (typeof listingType)[number];

export const listing = sqliteTable(
  'listing',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: listingType }).notNull(),
    slug: text('slug').notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    downloads: integer('downloads').notNull().default(0),
    mature: integer('mature', { mode: 'boolean' }).notNull().default(false),
    // Optional uploader-chosen cover. When null, the list page falls back to
    // the first image file in the listing's current version.
    thumbnailFileId: text('thumbnail_file_id'),
    status: text('status', { enum: ['draft', 'published', 'hidden'] })
      .notNull()
      .default('draft'),
    createdAt: ts('created_at'),
    updatedAt: ts('updated_at'),
  },
  (t) => ({
    typeSlugUnique: uniqueIndex('listing_type_slug_unique').on(t.type, t.slug),
    authorIdx: index('listing_author_idx').on(t.authorId),
    typeStatusIdx: index('listing_type_status_idx').on(t.type, t.status),
  }),
);

export const listingVersion = sqliteTable(
  'listing_version',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listing.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    changelog: text('changelog'),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
    createdAt: ts('created_at'),
  },
  (t) => ({
    listingIdx: index('listing_version_listing_idx').on(t.listingId),
  }),
);

export const listingFile = sqliteTable(
  'listing_file',
  {
    id: text('id').primaryKey(),
    versionId: text('version_id')
      .notNull()
      .references(() => listingVersion.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    size: integer('size').notNull(),
    hash: text('hash'),
  },
  (t) => ({
    versionIdx: index('listing_file_version_idx').on(t.versionId),
  }),
);

export const romhackMeta = sqliteTable('romhack_meta', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listing.id, { onDelete: 'cascade' }),
  baseRom: text('base_rom').notNull(),
  baseRomVersion: text('base_rom_version').notNull(),
  baseRomRegion: text('base_rom_region').notNull(),
  release: text('release').notNull(),
  categories: text('categories', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  states: text('states', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  screenshots: text('screenshots', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  boxart: text('boxart', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  trailer: text('trailer', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
});

export const assetHiveMeta = sqliteTable('asset_hive_meta', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listing.id, { onDelete: 'cascade' }),
  targetedRoms: text('targeted_roms', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  fileCount: integer('file_count').notNull().default(0),
  totalSize: integer('total_size').notNull().default(0),
});

export const spriteMeta = sqliteTable('sprite_meta', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listing.id, { onDelete: 'cascade' }),
  category: text('category', { mode: 'json' }).notNull(),
  fileMap: text('file_map', { mode: 'json' }),
});

export const soundMeta = sqliteTable('sound_meta', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listing.id, { onDelete: 'cascade' }),
  category: text('category', { enum: ['Attack', 'Cry', 'Jingle', 'SFX', 'Song'] }).notNull(),
});

export const scriptMeta = sqliteTable('script_meta', {
  listingId: text('listing_id')
    .primaryKey()
    .references(() => listing.id, { onDelete: 'cascade' }),
  categories: text('categories', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  features: text('features', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  prerequisites: text('prerequisites', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  targetedVersions: text('targeted_versions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  tools: text('tools', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
});

export const flag = sqliteTable(
  'flag',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listing.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['mature', 'spam', 'illegal', 'other'] }).notNull(),
    reason: text('reason'),
    status: text('status', { enum: ['open', 'reviewed', 'dismissed'] })
      .notNull()
      .default('open'),
    createdAt: ts('created_at'),
  },
  (t) => ({
    listingIdx: index('flag_listing_idx').on(t.listingId),
    statusIdx: index('flag_status_idx').on(t.status),
  }),
);

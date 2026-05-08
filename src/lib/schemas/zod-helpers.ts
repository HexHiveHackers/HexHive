import { z } from 'zod';

export const ASSET_PERMISSION = ['Credit', 'Free', 'No-Donations', 'No-Profit'] as const;
export type AssetPermission = (typeof ASSET_PERMISSION)[number];

export const SUPPORTED_BASE_ROM = ['Emerald', 'Fire Red'] as const;
export const SUPPORTED_BASE_ROM_VERSION = ['v1.0', 'v1.1'] as const;
export const SUPPORTED_BASE_ROM_REGION = ['English', 'French', 'German', 'Italian', 'Japanese', 'Spanish'] as const;

export const baseRom = z.enum(SUPPORTED_BASE_ROM);
export const baseRomVersion = z.enum(SUPPORTED_BASE_ROM_VERSION);
export const baseRomRegion = z.enum(SUPPORTED_BASE_ROM_REGION);

export const username = z
  .string()
  .min(3, 'Username is required')
  .regex(/^[a-zA-Z0-9._\-+]+$/, 'Username can only contain letters, numbers, dots, dashes, underscores, and pluses');

export const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase kebab-case')
  .refine((s) => !/^\d+$/.test(s), 'Slug cannot be only numbers');

// Best-effort email validation. Requires exactly one `@`, a non-empty
// local part, a host with at least one dot, and a final TLD label of
// 2+ ASCII letters. Accepts subdomains and multi-segment hosts like
// `me@hexhive.co.uk`. Internationalised TLDs are expected to arrive as
// punycode (`xn--…`) which still matches `[a-z]{2,}`. Deliberately
// permissive: better to accept a weird-but-valid address than reject
// one a real user wants to put on their profile.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export const contactEmail = z.union([
  z.literal(''),
  z
    .string()
    .max(254, 'Email is too long')
    .regex(EMAIL_RE, 'Enter an email address with a domain (like you@example.com).'),
]);

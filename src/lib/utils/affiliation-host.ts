// Maps an affiliation URL to a recognised host slug. The slug is
// rendered as an icon next to the affiliation name on profiles.
// Returns null when the URL is missing or the host isn't one we
// have an icon for — caller should fall back to a generic link icon.
export type AffiliationHost =
  | 'github'
  | 'discord'
  | 'youtube'
  | 'twitch'
  | 'pokecommunity'
  | 'reddit'
  | 'twitter'
  | 'bluesky'
  | 'mastodon'
  | 'itchio'
  | 'gitlab';

const HOST_RULES: { match: RegExp; host: AffiliationHost }[] = [
  { match: /(^|\.)github\.com$/, host: 'github' },
  { match: /(^|\.)gitlab\.com$/, host: 'gitlab' },
  { match: /(^|\.)discord\.(gg|com)$/, host: 'discord' },
  { match: /(^|\.)youtube\.com$/, host: 'youtube' },
  { match: /(^|\.)youtu\.be$/, host: 'youtube' },
  { match: /(^|\.)twitch\.tv$/, host: 'twitch' },
  { match: /(^|\.)pokecommunity\.com$/, host: 'pokecommunity' },
  { match: /(^|\.)reddit\.com$/, host: 'reddit' },
  { match: /(^|\.)(twitter|x)\.com$/, host: 'twitter' },
  { match: /(^|\.)bsky\.app$/, host: 'bluesky' },
  { match: /(^|\.)mastodon\.(social|online)$/, host: 'mastodon' },
  { match: /(^|\.)itch\.io$/, host: 'itchio' },
];

export function detectAffiliationHost(url: string | null | undefined): AffiliationHost | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  for (const r of HOST_RULES) if (r.match.test(host)) return r.host;
  return null;
}

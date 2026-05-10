// Maps a URL to a recognised host slug. The slug drives icon
// selection in <HostIcon /> for both affiliations (group homepages,
// repos, Discord servers) and profile links (a user's personal
// profiles on other sites). Returns null for URLs we don't have an
// icon for; the caller falls back to a generic link glyph.
export type LinkHost =
  // Code / collaboration
  | 'github'
  | 'gitlab'
  // Pokémon-community sites (no simple-icons entries; rendered as
  // custom wordmark badges in <HostIcon />)
  | 'pokecommunity'
  | 'pokemon-showdown'
  | 'serebii'
  | 'whackahack'
  | 'smogon'
  | 'bulbapedia'
  | 'hackdex'
  // Chat / forums
  | 'discord'
  | 'reddit'
  // Microblog / social
  | 'twitter'
  | 'bluesky'
  | 'mastodon'
  | 'threads'
  | 'tumblr'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  // Video / audio / streaming
  | 'youtube'
  | 'twitch'
  | 'spotify'
  | 'soundcloud'
  | 'bandcamp'
  // Art portfolios
  | 'deviantart'
  | 'artstation'
  | 'behance'
  | 'pixiv'
  // Game hosting
  | 'itchio'
  | 'gamejolt'
  | 'newgrounds'
  // Funding / linkhubs
  | 'patreon'
  | 'kofi'
  | 'buymeacoffee'
  | 'linktree'
  | 'beacons';

const HOST_RULES: { match: RegExp; host: LinkHost }[] = [
  { match: /(^|\.)github\.com$/, host: 'github' },
  { match: /(^|\.)gitlab\.com$/, host: 'gitlab' },

  { match: /(^|\.)pokecommunity\.com$/, host: 'pokecommunity' },
  { match: /(^|\.)pokemonshowdown\.com$/, host: 'pokemon-showdown' },
  { match: /(^|\.)psim\.us$/, host: 'pokemon-showdown' },
  { match: /(^|\.)serebii\.net$/, host: 'serebii' },
  { match: /(^|\.)whackahack\.com$/, host: 'whackahack' },
  { match: /(^|\.)smogon\.com$/, host: 'smogon' },
  { match: /(^|\.)bulbagarden\.net$/, host: 'bulbapedia' },
  { match: /(^|\.)hackdex\.cc$/, host: 'hackdex' },

  { match: /(^|\.)discord\.(gg|com)$/, host: 'discord' },
  { match: /(^|\.)reddit\.com$/, host: 'reddit' },

  { match: /(^|\.)(twitter|x)\.com$/, host: 'twitter' },
  { match: /(^|\.)bsky\.app$/, host: 'bluesky' },
  { match: /(^|\.)mastodon\.(social|online|art|world)$/, host: 'mastodon' },
  { match: /(^|\.)threads\.(net|com)$/, host: 'threads' },
  { match: /(^|\.)tumblr\.com$/, host: 'tumblr' },
  { match: /(^|\.)instagram\.com$/, host: 'instagram' },
  { match: /(^|\.)(facebook|fb)\.com$/, host: 'facebook' },
  { match: /(^|\.)tiktok\.com$/, host: 'tiktok' },

  { match: /(^|\.)youtube\.com$/, host: 'youtube' },
  { match: /(^|\.)youtu\.be$/, host: 'youtube' },
  { match: /(^|\.)twitch\.tv$/, host: 'twitch' },
  { match: /(^|\.)spotify\.com$/, host: 'spotify' },
  { match: /(^|\.)soundcloud\.com$/, host: 'soundcloud' },
  { match: /(^|\.)bandcamp\.com$/, host: 'bandcamp' },

  { match: /(^|\.)deviantart\.com$/, host: 'deviantart' },
  { match: /(^|\.)artstation\.com$/, host: 'artstation' },
  { match: /(^|\.)behance\.net$/, host: 'behance' },
  { match: /(^|\.)pixiv\.net$/, host: 'pixiv' },

  { match: /(^|\.)itch\.io$/, host: 'itchio' },
  { match: /(^|\.)gamejolt\.com$/, host: 'gamejolt' },
  { match: /(^|\.)newgrounds\.com$/, host: 'newgrounds' },

  { match: /(^|\.)patreon\.com$/, host: 'patreon' },
  { match: /(^|\.)ko-fi\.com$/, host: 'kofi' },
  { match: /(^|\.)buymeacoffee\.com$/, host: 'buymeacoffee' },
  { match: /(^|\.)linktr\.ee$/, host: 'linktree' },
  { match: /(^|\.)linktree\.com$/, host: 'linktree' },
  { match: /(^|\.)beacons\.ai$/, host: 'beacons' },
];

export function detectLinkHost(url: string | null | undefined): LinkHost | null {
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

// Friendly label for a host slug — used as the visible text when a
// profile link has no user-supplied label. "GitHub" beats "github.com"
// in the UI.
export function hostLabel(host: LinkHost): string {
  switch (host) {
    case 'github':
      return 'GitHub';
    case 'gitlab':
      return 'GitLab';
    case 'pokecommunity':
      return 'PokéCommunity';
    case 'pokemon-showdown':
      return 'Pokémon Showdown';
    case 'serebii':
      return 'Serebii';
    case 'whackahack':
      return 'WhackAHack';
    case 'smogon':
      return 'Smogon';
    case 'bulbapedia':
      return 'Bulbagarden';
    case 'hackdex':
      return 'Hackdex';
    case 'discord':
      return 'Discord';
    case 'reddit':
      return 'Reddit';
    case 'twitter':
      return 'X';
    case 'bluesky':
      return 'Bluesky';
    case 'mastodon':
      return 'Mastodon';
    case 'threads':
      return 'Threads';
    case 'tumblr':
      return 'Tumblr';
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
    case 'tiktok':
      return 'TikTok';
    case 'youtube':
      return 'YouTube';
    case 'twitch':
      return 'Twitch';
    case 'spotify':
      return 'Spotify';
    case 'soundcloud':
      return 'SoundCloud';
    case 'bandcamp':
      return 'Bandcamp';
    case 'deviantart':
      return 'DeviantArt';
    case 'artstation':
      return 'ArtStation';
    case 'behance':
      return 'Behance';
    case 'pixiv':
      return 'pixiv';
    case 'itchio':
      return 'itch.io';
    case 'gamejolt':
      return 'Game Jolt';
    case 'newgrounds':
      return 'Newgrounds';
    case 'patreon':
      return 'Patreon';
    case 'kofi':
      return 'Ko-fi';
    case 'buymeacoffee':
      return 'Buy Me a Coffee';
    case 'linktree':
      return 'Linktree';
    case 'beacons':
      return 'Beacons';
  }
}

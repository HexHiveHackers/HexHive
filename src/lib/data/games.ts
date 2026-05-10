// Curated catalogue of games that HexHive tools / romhacks / sprites etc.
// can target. Boxart URLs point at the libretro-thumbnails GitHub repo
// (high-quality No-Intro-named boxarts under a permissive license). If a
// boxart is sensitive to upstream churn we can later mirror onto the
// hexhive-prod R2 bucket and swap the URL; the field is just a string.

export type GamePlatform = 'gba' | 'gbc' | 'gb' | 'nds' | 'snes' | 'gen' | 'gc' | 'wii' | 'ps1';

export type Game = {
  id: string;
  title: string;
  shortTitle?: string;
  platform: GamePlatform;
  /** Year of original release. */
  year?: number;
  /** No-Intro-style filename used by libretro thumbnails, without extension. */
  noIntroName?: string;
  /** Direct boxart URL (libretro by default; R2-cached when we mirror). */
  boxartUrl?: string;
};

const LIBRETRO = 'https://raw.githubusercontent.com/libretro-thumbnails';

function libretroBoxart(repo: string, noIntroName: string): string {
  return `${LIBRETRO}/${repo}/master/Named_Boxarts/${encodeURIComponent(noIntroName)}.png`;
}

export const GAMES: Record<string, Game> = {
  'pokemon-firered': {
    id: 'pokemon-firered',
    title: 'Pokémon FireRed Version',
    shortTitle: 'Pokémon FireRed',
    platform: 'gba',
    year: 2004,
    noIntroName: 'Pokemon - FireRed Version (USA)',
    boxartUrl: libretroBoxart('Nintendo_-_Game_Boy_Advance', 'Pokemon - FireRed Version (USA)'),
  },
  'ygo-wct-2006': {
    id: 'ygo-wct-2006',
    title: 'Yu-Gi-Oh! Ultimate Masters: World Championship Tournament 2006',
    shortTitle: 'Yu-Gi-Oh! WCT 2006',
    platform: 'gba',
    year: 2006,
    noIntroName: 'Yu-Gi-Oh! Ultimate Masters - World Championship Tournament 2006 (USA)',
    boxartUrl: libretroBoxart(
      'Nintendo_-_Game_Boy_Advance',
      'Yu-Gi-Oh! Ultimate Masters - World Championship Tournament 2006 (USA)',
    ),
  },
  'ygo-eds': {
    id: 'ygo-eds',
    title: 'Yu-Gi-Oh! The Eternal Duelist Soul',
    shortTitle: 'Yu-Gi-Oh! EDS',
    platform: 'gba',
    year: 2002,
    noIntroName: 'Yu-Gi-Oh! The Eternal Duelist Soul (USA)',
    boxartUrl: libretroBoxart('Nintendo_-_Game_Boy_Advance', 'Yu-Gi-Oh! The Eternal Duelist Soul (USA)'),
  },
  'ygo-wct-2004': {
    id: 'ygo-wct-2004',
    title: 'Yu-Gi-Oh! World Championship Tournament 2004',
    shortTitle: 'Yu-Gi-Oh! WCT 2004',
    platform: 'gba',
    year: 2004,
    noIntroName: 'Yu-Gi-Oh! World Championship Tournament 2004 (USA)',
    boxartUrl: libretroBoxart('Nintendo_-_Game_Boy_Advance', 'Yu-Gi-Oh! World Championship Tournament 2004 (USA)'),
  },
  'ygo-7-trials-to-glory': {
    id: 'ygo-7-trials-to-glory',
    title: 'Yu-Gi-Oh! 7 Trials to Glory: World Championship Tournament 2005',
    shortTitle: 'Yu-Gi-Oh! 7 Trials to Glory',
    platform: 'gba',
    year: 2005,
    noIntroName: 'Yu-Gi-Oh! 7 Trials to Glory - World Championship Tournament 2005 (USA)',
    boxartUrl: libretroBoxart(
      'Nintendo_-_Game_Boy_Advance',
      'Yu-Gi-Oh! 7 Trials to Glory - World Championship Tournament 2005 (USA)',
    ),
  },
  'ygo-worldwide-edition': {
    id: 'ygo-worldwide-edition',
    title: 'Yu-Gi-Oh! Worldwide Edition: Stairway to the Destined Duel',
    shortTitle: 'Yu-Gi-Oh! Worldwide Edition',
    platform: 'gba',
    year: 2003,
    noIntroName: 'Yu-Gi-Oh! Worldwide Edition - Stairway to the Destined Duel (USA)',
    boxartUrl: libretroBoxart(
      'Nintendo_-_Game_Boy_Advance',
      'Yu-Gi-Oh! Worldwide Edition - Stairway to the Destined Duel (USA)',
    ),
  },
  'ygo-reshef': {
    id: 'ygo-reshef',
    title: 'Yu-Gi-Oh! Reshef of Destruction',
    shortTitle: 'Yu-Gi-Oh! Reshef of Destruction',
    platform: 'gba',
    year: 2004,
    noIntroName: 'Yu-Gi-Oh! Reshef of Destruction (USA)',
    boxartUrl: libretroBoxart('Nintendo_-_Game_Boy_Advance', 'Yu-Gi-Oh! Reshef of Destruction (USA)'),
  },
};

export function getGame(id: string): Game | undefined {
  return GAMES[id];
}

export const PLATFORM_LABEL: Record<GamePlatform, string> = {
  gba: 'GBA',
  gbc: 'GBC',
  gb: 'GB',
  nds: 'NDS',
  snes: 'SNES',
  gen: 'Genesis',
  gc: 'GameCube',
  wii: 'Wii',
  ps1: 'PlayStation',
};

// Curated directory of external ROM-hacking tools. Tools are HexHive's 5th
// listing type but live as a typed seed array (rather than DB rows) for now —
// most are external GitHub projects we link out to, not user uploads. The
// model below carries the same rich metadata a future `tool` listing type
// would store, so moving to a DB-backed table later is a flip, not a rewrite.

export type ToolSubtype =
  // What the tool *does*. Multi-select per tool.
  | 'binary' // raw binary editing — hex, patching, byte-level surgery
  | 'decomp' // decompilation, disassembly, pseudo-C
  | 'map-editor' // overworld / battle / dungeon map authoring
  | 'hex-editor' // structured hex view with anchors / table tools
  | 'music-editor' // MIDI / soundfont / sequence editing
  | 'sprite-editor' // sprite art, palettes, tilesets
  | 'script-editor' // event/script authoring
  | 'asset-injector' // import/export of art, audio, deck data, etc.
  | 'patcher' // IPS/UPS/BPS application or generation
  | 'rom-builder' // RPG Maker XP/Essentials, Studio, etc. — full toolchains
  | 'tool'; // catch-all for older shareware (modexe, gen3 essentials, etc.)

export type ToolPlatform =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'web'
  | 'android'
  | 'ios'
  // OS distributions we care about for native Linux tools.
  | 'debian'
  | 'ubuntu'
  | 'fedora'
  | 'arch'
  | 'nixos';

export type ToolStatus = 'active' | 'beta' | 'archived';

export type ToolLink = {
  label: string;
  href: string;
};

export type Tool = {
  slug: string;
  name: string;
  tagline: string;
  author: string;
  authorUrl?: string;
  // Where the source lives. For external-link tools this is the canonical URL.
  repoUrl: string;
  homepageUrl?: string;
  releasesUrl?: string;
  branch?: string;
  // Square icon for the tool, shown on the index card and detail header.
  // When unset, the UI falls back to a generic wrench glyph.
  iconUrl?: string;
  status: ToolStatus;
  /** What the tool does. A tool may be more than one (hex + decomp). */
  subtypes: ToolSubtype[];
  /** Where it runs — OSes, distros, web. */
  platforms: ToolPlatform[];
  /** Implementation languages / frameworks. */
  languages: string[];
  /** ROMs / engines this tool targets. */
  targetedSystems: string[];
  /** Short bullet summary for the index card. */
  highlights: string[];
  /** Long-form paragraphs for the detail page. */
  description: string[];
  /** Sectioned feature list for the detail page. */
  featureGroups?: { title: string; items: string[] }[];
  /** Games this tool supports. References src/lib/data/games.ts entries by id; note is tool-specific. */
  supportedGames?: { gameId: string; note?: string }[];
  /** Screenshots / UI captures, rendered as a gallery on the detail page. */
  screenshots?: { url: string; caption?: string }[];
  /** Free-form taxonomy chips. */
  tags: string[];
  /** Required runtime / external tooling (Python, devkitARM, etc.). */
  dependencies?: string[];
  license?: string;
  extraLinks?: ToolLink[];
  inspiredBy?: ToolLink[];
};

export const TOOL_SUBTYPE_LABEL: Record<ToolSubtype, string> = {
  binary: 'Binary tool',
  decomp: 'Decomp tool',
  'map-editor': 'Map editor',
  'hex-editor': 'Hex editor',
  'music-editor': 'Music editor',
  'sprite-editor': 'Sprite editor',
  'script-editor': 'Script editor',
  'asset-injector': 'Asset injector',
  patcher: 'Patcher',
  'rom-builder': 'ROM builder',
  tool: 'Tool',
};

export const TOOL_PLATFORM_LABEL: Record<ToolPlatform, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  web: 'Web',
  android: 'Android',
  ios: 'iOS',
  debian: 'Debian',
  ubuntu: 'Ubuntu',
  fedora: 'Fedora',
  arch: 'Arch',
  nixos: 'NixOS',
};

export const TOOL_STATUS_LABEL: Record<ToolStatus, string> = {
  active: 'Active',
  beta: 'Beta',
  archived: 'Archived',
};

export const TOOLS: Tool[] = [
  {
    slug: 'channeler-advance',
    name: 'Channeler Advance',
    tagline:
      'GBA ROM hacking tool: hex editor, sprite/tilemap/palette tools, ARM disassembly, and a FireRed map viewer.',
    author: 'Soul-8691',
    authorUrl: 'https://github.com/Soul-8691',
    repoUrl: 'https://github.com/Soul-8691/Channeler-Advance',
    branch: 'map-editor',
    releasesUrl: 'https://github.com/Soul-8691/Channeler-Advance/releases',
    status: 'active',
    subtypes: ['hex-editor', 'binary', 'decomp', 'asset-injector', 'map-editor'],
    platforms: ['windows', 'macos', 'linux'],
    languages: ['Python 3.8+', 'Tkinter'],
    targetedSystems: ['Game Boy Advance', 'Nintendo DS'],
    dependencies: [
      'Python 3.8+',
      'Tkinter (usually bundled with Python; on Linux: python3-tk)',
      'Pillow, Pygments, tomli, tomli-w',
      'Capstone (for ARM/Thumb disassembly)',
      'angr (optional, used for the pseudo-C decompiler)',
      'devkitARM (only for ASM patch workflows)',
    ],
    tags: [
      'hex editor',
      'sprite editor',
      'tilemap editor',
      'palette tools',
      'disassembler',
      'decompiler',
      'patch injector',
      'map browser',
      'Python scripting',
      'FireRed',
      'Yu-Gi-Oh!',
      'cross-platform',
    ],
    highlights: [
      'Hex editor with structured views for text, sprites, tables, and graphics in the same window.',
      'ARM/Thumb disassembly and a pseudo-C decompiler (angr when installed, Capstone fallback).',
      'Write Thumb ASM or small C patches in-editor and inject them.',
      'Read-only FireRed overworld map browser.',
      'PNG sprite/tilemap import; YDK deck and banlist import for Yu-Gi-Oh! titles.',
      'Built-in Python scripting pane.',
      'Cross-platform: Windows, macOS, Linux.',
    ],
    description: [
      'Channeler Advance is a Python desktop app for hacking Game Boy Advance ROMs. The main window is a hex editor; a docked panel cycles between the named-anchor browser, ARM/Thumb disassembly, pseudo-C, and a Python script pad. A separate Tools window pins up to six structured views (text tables, structs, graphics) on a 3x2 grid.',
      'Per-game TOML definitions describe where text, sprites, tables, and routines live, so the hex view labels regions automatically and double-clicking a pointer follows it. FireRed ships with both a definition file and the official symbol file, so disassembly reads with real function names. Yu-Gi-Oh! titles get YDK deck and banlist imports surfaced inline on the relevant structs.',
    ],
    featureGroups: [
      {
        title: 'Editing',
        items: [
          'Hex / ASCII / Pokémon-text views with insert and overwrite modes.',
          'Find and replace, goto by address or symbol name, cross-references panel.',
          'Double-click a pointer to follow; double-click a routine to highlight the whole function.',
        ],
      },
      {
        title: 'Graphics',
        items: [
          '4-bit and 8-bit sprite preview, including LZ77 and Huffman compressed art.',
          'PNG sprite import with automatic relocation when the new art is larger.',
          'Tilemap import with flip-aware tile deduplication (Tilemap-Studio style).',
          'Palette import/export: JASC .pal, GIMP .gpl, Tilemap Studio RGB lines, raw RGB555 .bin.',
        ],
      },
      {
        title: 'Code',
        items: [
          'ARM/Thumb disassembly with FireRed function names and inline pointer-pool comments.',
          'Pseudo-C decompilation (angr or Capstone fallback).',
          'HackMew-style Thumb assembly editor: write, compile, insert.',
          'C-inject editor compiles small C patches and links them against vanilla FireRed symbols.',
        ],
      },
      {
        title: 'FireRed map viewer',
        items: [
          'Browse map groups and layouts; render with primary + secondary tilesets.',
          'Inspect the metatile block grid (13 palette slots, 2x zoom, hover for metatile data).',
          'Region section IDs and map IDs surfaced without manual offset lookup.',
        ],
      },
    ],
    supportedGames: [
      {
        gameId: 'pokemon-firered',
        note: 'Full structure definitions, official symbol file, and a built-in read-only overworld map viewer.',
      },
      { gameId: 'ygo-wct-2006', note: 'Bundled structure definitions. Companion ygowct06 disassembly repo.' },
      {
        gameId: 'ygo-eds',
        note: 'The deepest Yu-Gi-Oh! map in the bundled set; covers card data, decks, and duelists.',
      },
      { gameId: 'ygo-wct-2004', note: 'Partial structure map.' },
      { gameId: 'ygo-7-trials-to-glory', note: 'Partial structure map.' },
      { gameId: 'ygo-worldwide-edition', note: 'Partial structure map.' },
      { gameId: 'ygo-reshef', note: 'Partial structure map. Sprites need the "reshef" graphics prefix to decode.' },
    ],
    screenshots: [],
    extraLinks: [
      {
        label: 'pret/pokefirered (FireRed C decompilation)',
        href: 'https://github.com/pret/pokefirered',
      },
      {
        label: 'Soul-8691/ygowct06 (companion WCT 2006 disassembly)',
        href: 'https://github.com/Soul-8691/ygowct06',
      },
    ],
    inspiredBy: [
      {
        label: 'Hex Maniac Advance by huderlem',
        href: 'https://github.com/huderlem/hex-maniac-advance',
      },
      {
        label: 'Tilemap Studio by Rangi42',
        href: 'https://github.com/Rangi42/tilemap-studio',
      },
    ],
  },
  {
    slug: 'hexmaniacadvance',
    name: 'HexManiacAdvance',
    tagline: 'Specialised hex editor for Pokémon GBA ROMs with rich structured tools and table-driven editing.',
    author: 'Haven',
    authorUrl: 'https://github.com/haven1433',
    repoUrl: 'https://github.com/haven1433/HexManiacAdvance',
    releasesUrl: 'https://github.com/haven1433/HexManiacAdvance/releases',
    iconUrl: 'https://cdn.hexhive.app/tool-icons/hexmaniacadvance.png',
    status: 'active',
    subtypes: ['hex-editor', 'binary', 'asset-injector', 'sprite-editor', 'script-editor', 'tool'],
    platforms: ['windows', 'macos', 'linux'],
    languages: ['C#', '.NET'],
    targetedSystems: ['Game Boy Advance'],
    tags: [
      'hex editor',
      'sprite editor',
      'script editor',
      'palette tools',
      'table editor',
      'metadata anchors',
      'GBA Pokémon',
    ],
    highlights: [
      'Editor that understands GBA Pokémon ROM structure: trainer parties, moves, items, scripts, sprites, maps.',
      'Anchored navigation — names instead of raw offsets, cross-references, and follow-pointer everywhere.',
      'Integrated sprite, palette, and tilemap editing with import/export.',
      'Built-in script editor with syntax help for the standard Pokémon engine commands.',
      'Active development with a Discord community for support and contributors.',
    ],
    description: [
      'HexManiacAdvance (HMA) is the modern successor to huderlem’s original Hex Maniac Advance. It is a specialised hex editor for Generation 3 Pokémon ROMs that exposes the underlying data as named tables, structured rows, and follow-pointer references rather than raw bytes.',
      'It bundles sprite, palette, tilemap, script, and table tooling into one application so most romhacking workflows can stay inside HMA without bouncing between disparate single-purpose utilities.',
    ],
    extraLinks: [{ label: 'Discord (development + support)', href: 'https://discord.gg/x9eQuBg' }],
  },
];

export function listTools(): Tool[] {
  return TOOLS;
}

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

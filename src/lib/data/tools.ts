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
  /** Specific games / TOML / sym files bundled. */
  supportedGames?: { title: string; note?: string }[];
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
      'A cross-platform workbench for hacking GBA games — edit text, sprites, maps, scripts, and code in one window.',
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
      'Python 3.8 or newer',
      'Tkinter (often bundled; install python3-tk on Linux if missing)',
      'Pillow, Pygments, tomli, tomli-w',
      'Capstone (for assembly disassembly)',
      'angr (optional — enables structured pseudo-C decompilation)',
      'devkitARM (only needed for ASM-patch workflows)',
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
      'Edit ROM text, sprites, palettes, tilemaps and structured tables from a single hex view that already knows what each region means.',
      "Browse a game's assembly code with real symbol names — branch targets and data references read like a labelled disassembly, not a soup of addresses.",
      'See decompiled pseudo-C of any routine, or write your own ARM/Thumb assembly and inject it back into the ROM.',
      "Drop in small C patches that link directly against the original game's functions — no manual address bookkeeping.",
      'Browse the FireRed overworld: map groups, layouts, primary + secondary tilesets, region IDs, all rendered live from the ROM.',
      'Import PNG sprites and tilemaps; export palettes in JASC, GIMP and Tilemap-Studio formats.',
      'Runs identically on Windows, macOS and Linux — same Python entrypoint, same UI.',
    ],
    description: [
      'Channeler Advance is a one-window workbench for hacking Game Boy Advance games. Open a ROM and you get a hex editor, a structured view of the text, sprites and tables inside, an assembly-language reader, a decompiler, and a graphics previewer — all wired together so a click in one pane jumps to the matching place in the others.',
      "It's designed in the spirit of Hex Maniac Advance: rather than juggling separate tools for sprites, scripts, maps and code, you stay in one place and let the editor turn raw bytes into something readable. Per-game definition files describe where the text, sprites and tables live, so the editor can label them automatically.",
      'For Pokémon FireRed it ships with a built-in overworld map browser — pick a map group and layout, see the world rendered with its tilesets and metatile blocks, and look up region IDs without leaving the editor.',
      'For Yu-Gi-Oh! titles (Ultimate Masters 2006, Eternal Duelist Soul, several Worldwide Edition / WCT entries, Reshef of Destruction) it can import EDOPro deck files and banlists straight into the relevant card data.',
      "When you need to go deeper, the assembly pane reads the ROM's code with proper function names and inline pointer comments, the pseudo-C pane shows a structured decompilation when angr is installed, and the patch panes let you write Thumb assembly or small C functions that compile and link against the game's own routines.",
      'Cross-platform from the ground up — same Python codebase, same UI, same shortcuts on Windows, macOS and Linux.',
    ],
    featureGroups: [
      {
        title: 'Hex editing, the everyday stuff',
        items: [
          'Hex, ASCII and Pokémon-text views side by side; toggle insert vs overwrite.',
          'Find and replace, copy/paste (with separate insert and overwrite paste), goto by address or by name.',
          'Double-click a pointer to follow it; double-click a routine to highlight the whole function.',
          'Cross-references panel shows everywhere in the ROM that points to the byte under the cursor.',
        ],
      },
      {
        title: 'Sprites, tilesets and palettes',
        items: [
          'Live preview of 4-bit and 8-bit sprites, including LZ77 and Huffman compressed art.',
          'Import a PNG sprite back into the ROM, with optional automatic relocation when the new art is larger.',
          'Tilemap import sized to your image, with automatic flip-aware tile deduplication (Tilemap-Studio style).',
          'Palette browser; import or export JASC .pal, GIMP .gpl, Tilemap-Studio RGB lines, or raw RGB555 .bin.',
          'Scrollable 8bpp palette viewer for full 256-colour masters.',
        ],
      },
      {
        title: 'FireRed overworld map browser',
        items: [
          'Pick a map group and layout from a tree view; see the assembled map render live from the ROM.',
          'Inspect primary and secondary tilesets and the metatile block grid (13 BG palette slots, 2× zoom, hover to see metatile data).',
          'Browse region section IDs and map IDs without writing a single offset by hand.',
        ],
      },
      {
        title: 'Code & patching',
        items: [
          'ARM and Thumb disassembly with real symbol names — branch targets become readable function names, pointer pools get inline comments.',
          'Pseudo-C view through angr when installed; falls back to a Capstone-based pseudo-C reader otherwise.',
          'HackMew-style Thumb assembly editor with one-shortcut compile & insert.',
          "C-inject patches: write a small C function in the editor, compile, and have the linker resolve calls to the game's own routines automatically.",
          'Built-in Python scripting pane for one-off edits and bulk operations.',
        ],
      },
      {
        title: 'Yu-Gi-Oh! workflows',
        items: [
          'Import EDOPro .ydk deck files into deck slots inside the ROM with one click.',
          'Import EDOPro .conf / .lflist banlists, or a plain JSON {"Card Name": copies} dictionary.',
          'Edit card data, duelist tables and Reshef-specific structures from the same struct editor as everything else.',
        ],
      },
      {
        title: 'Quality of life',
        items: [
          'A 3×2 docked tools grid lets you pin up to six structured views (text tables, structs, graphics) at once and find them by name.',
          'Span-aware navigation: jumping to a name selects the whole table, structure or function it points at, not just the first byte.',
          'Hex viewport caches its render — large ROMs stay responsive while you scroll and edit.',
          'Unicode-safe UI text including a Linux-friendly ellipsis so labels never break.',
        ],
      },
    ],
    supportedGames: [
      {
        title: 'Pokémon FireRed',
        note: 'Full structure definitions and a built-in read-only overworld map browser. Disassembly uses the official symbol file so code reads with real function names.',
      },
      {
        title: 'Yu-Gi-Oh! Ultimate Masters: World Championship Tournament 2006',
        note: "Bundled structure definitions; ARM7TDMI reference disassembly available from the author's companion ygowct06 repo.",
      },
      {
        title: 'Yu-Gi-Oh! The Eternal Duelist Soul',
        note: 'The deepest Yu-Gi-Oh! map of the bundled set — covers card data, decks and duelists.',
      },
      {
        title: 'Yu-Gi-Oh! WCT 2004, 7 Trials to Glory (WCT 2005), Worldwide Edition, Reshef of Destruction',
        note: 'Partial structure maps for each — load with File → Load structure TOML, or place a matching .toml beside the ROM. Reshef sprites need the "reshef" graphics prefix to decode.',
      },
    ],
    extraLinks: [
      {
        label: 'pret/pokefirered — FireRed C decompilation',
        href: 'https://github.com/pret/pokefirered',
      },
      {
        label: 'Soul-8691/ygowct06 — companion WCT 2006 disassembly',
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
];

export function listTools(): Tool[] {
  return TOOLS;
}

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

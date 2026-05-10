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
    tagline: 'Cross-platform GBA hex / ARM-Thumb / TOML-anchor workbench in the spirit of Hex Maniac Advance.',
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
      'tomli / tomli-w',
      'Pillow',
      'Pygments',
      'Capstone ≥ 5',
      'angr ≥ 9.2 (optional)',
      'devkitARM (for ASM workflows)',
    ],
    tags: [
      'hex editor',
      'ARM7TDMI',
      'THUMB ASM',
      'pseudo-C',
      'angr',
      'Capstone',
      'TOML anchors',
      'pret/gbagfx',
      'LZ77 / Huff',
      'NDS NITRO',
      'FireRed',
      'Yu-Gi-Oh!',
    ],
    highlights: [
      'Hex / ASCII / PCS editing with insert + overwrite, find/replace and goto.',
      'ARM/Thumb disassembly via Capstone with sym-file + TOML labels and pool comments.',
      'Pseudo-C through angr (Capstone fallback) plus HackMew-style THUMB ASM and C-inject patches.',
      'TOML-backed `[[NamedAnchors]]` / `[[FunctionAnchors]]` drive structured tables, structs and graphics.',
      'Read-only FireRed (BPRE) overworld map viewer — groups, layouts, tilesets, blocksets, region IDs.',
      'NDS NITRO formats (`lznclr`, `lzncgr`, `lznanr`, `lzncer`, `lz5bg`) for cross-platform DS work.',
    ],
    description: [
      'Channeler Advance is a Game Boy Advance ROM-hacking workbench by Soul-8691, written in Python with a Tkinter UI and built to run identically on Windows, macOS and Linux. Its design draws on Hex Maniac Advance: a hex editor at the centre, with anchor-driven structured views (PCS text, structs, graphics) docked alongside ARM/Thumb disassembly and decompilation panes.',
      'Anchors are declared in per-game TOML files — `[[NamedAnchors]]`, `[[FunctionAnchors]]`, `[[List]]` — and drive everything from automatic struct row labels to graphics decoding to symbol-aware disassembly. On FireRed (BPRE) ROMs the bundled `pokefirered.sym` resolves branch targets and `.word` pool references; `[[NamedAnchors]]` win over the sym file at the same address, and `[[FunctionAnchors]]` are applied first so a named anchor can override a function anchor.',
      'The Tools window (Ctrl+T) docks a 3×2 grid of PCS / Struct / Graphics panels with a unified anchor combobox and per-panel Find. Pointer-follow and double-click flows can prompt "Open in Tools?" and route the anchor into a chosen slot 1–6. Goto, Go to offset… and the Named Anchor browser only move the hex view — they never auto-open Disassembly, pseudo-C or Tools.',
      'Graphics support covers 4bpp/8bpp sprites, tilemaps, tilesets and palettes, including LZ77/Huff streams whose lengths are measured for selection and bounds. Tilemap import does flip-aware dedupe in the Tilemap-Studio style, and 8bpp palette preview is a scrollable swatch grid for full 256-colour masters.',
      'The pseudo-C pane has a C-inject mode (Ctrl+H) that compiles and links patches against vanilla FireRed symbols. Symbols that live in ROM as Thumb code are linked at odd addresses; data labels are listed in `rom.txt` so the linker leaves them even.',
    ],
    featureGroups: [
      {
        title: 'Editing & navigation',
        items: [
          'Insert / overwrite, copy, paste-overwrite (Ctrl+B), paste-insert (Ctrl+V), find/replace, save (Ctrl+S).',
          'Pointer follow on valid `0x08……` / `0x09……` `.word` targets, including from raw bytes.',
          'Goto by `pokefirered.sym` symbol name on BPRE ROMs (case-insensitive).',
          'Cross-references list incoming `.word` pointers and BL sites with anchor / symbol context.',
          'Span selection prefers `[[NamedAnchors]]` extent → smallest containing `pokefirered.sym` symbol → single byte.',
        ],
      },
      {
        title: 'Analysis panes (right of hex)',
        items: [
          'Anchors browser (Ctrl+1 / Ctrl+M).',
          'ARM/Thumb disassembly (Ctrl+2 / Ctrl+E) with entry labels and pool `.word` comments.',
          'Pseudo-C (Ctrl+3 / Ctrl+D) — angr CFG + decompiler, Capstone fallback.',
          'Python script pane (Ctrl+4 / Ctrl+P) — Ctrl+Shift+Enter to run.',
          'Ctrl+H / Ctrl+I are context-sensitive: HackMew THUMB compile on Disassembly, C-inject compile on pseudo-C.',
        ],
      },
      {
        title: 'Structs & graphics',
        items: [
          '`name`-style columns drive automatic row labels; `pcs_ptr` / `ascii_ptr` editing including nested arrays.',
          'Anchor `Format` with `` `ydk` `` or `` `ban` `` exposes Import YDK deck… / Import banlist… buttons inline.',
          'Banlist import accepts EDOPro `.conf` / `.lflist` (password-keyed) and name-keyed JSON.',
          'Sprite import (`uct` / `lzt` / `ucs` / `lzs`) with optional 0xFF fill of the old slot on relocate.',
          'Tilemap import sized to tiles × 8 px with flip-aware dedupe; updates Format when tile count changes.',
        ],
      },
    ],
    supportedGames: [
      {
        title: 'Pokémon FireRed',
        note: 'Bundled `FireRed.toml` + `pokefirered.sym`; read-only overworld map viewer for BPRE.',
      },
      {
        title: 'Yu-Gi-Oh! Ultimate Masters: World Championship Tournament 2006',
        note: 'Bundled `wct06.toml`; ARM7TDMI reference repo at Soul-8691/ygowct06.',
      },
      {
        title: 'Yu-Gi-Oh! The Eternal Duelist Soul',
        note: 'Bundled `EDS.toml` — more in-depth than the partial Yu-Gi-Oh! maps.',
      },
      {
        title: 'Yu-Gi-Oh! (partial maps)',
        note: '`WCT04.toml`, `WCT05.toml`, `WWE.toml`, `Reshef.toml`. Reshef sprites often need the `reshef` graphics prefix.',
      },
    ],
    extraLinks: [
      {
        label: 'pret/pokefirered (C / disasm reference)',
        href: 'https://github.com/pret/pokefirered',
      },
      {
        label: 'Soul-8691/ygowct06 (ARM7TDMI reference)',
        href: 'https://github.com/Soul-8691/ygowct06',
      },
    ],
    inspiredBy: [
      {
        label: 'Hex Maniac Advance — huderlem',
        href: 'https://github.com/huderlem/hex-maniac-advance',
      },
      {
        label: 'Tilemap Studio — Rangi42',
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

// Curated directory of external ROM-hacking tools. Unlike romhacks / sprites
// / sounds / scripts (community uploads in the DB), tools live as a typed,
// hand-maintained array — they're external projects we link out to.
//
// To add a tool: append an entry below; everything is typed so the index +
// detail pages render whatever's filled in. `slug` drives /tools/<slug>.

export type ToolPlatform = 'windows' | 'macos' | 'linux' | 'web' | 'android' | 'ios';
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
  repoUrl: string;
  homepageUrl?: string;
  releasesUrl?: string;
  branch?: string;
  status: ToolStatus;
  platforms: ToolPlatform[];
  languages: string[];
  /** Short-list bullet summary for the index card. */
  highlights: string[];
  /** Long-form paragraphs for the detail page. */
  description: string[];
  /** Sectioned feature list for the detail page. */
  featureGroups?: { title: string; items: string[] }[];
  supportedGames?: { title: string; note?: string }[];
  tags: string[];
  extraLinks?: ToolLink[];
  inspiredBy?: ToolLink[];
};

export const TOOLS: Tool[] = [
  {
    slug: 'channeler-advance',
    name: 'Channeler Advance',
    tagline: 'Cross-platform GBA hex/ASM/struct editor with TOML-driven anchors.',
    author: 'Soul-8691',
    authorUrl: 'https://github.com/Soul-8691',
    repoUrl: 'https://github.com/Soul-8691/Channeler-Advance',
    branch: 'map-editor',
    releasesUrl: 'https://github.com/Soul-8691/Channeler-Advance/releases',
    status: 'active',
    platforms: ['windows', 'macos', 'linux'],
    languages: ['Python', 'Tkinter'],
    tags: ['hex editor', 'disassembly', 'pseudo-C', 'graphics', 'TOML', 'GBA', 'NDS'],
    highlights: [
      'Hex / ASCII / PCS editing with insert + overwrite, find/replace, goto.',
      'ARM/Thumb disassembly via Capstone with sym/TOML labels and pool comments.',
      'Pseudo-C through angr (Capstone fallback) plus HackMew-style THUMB ASM and C-inject patches.',
      'TOML-backed tables, structs and graphics with repointing and 0xFF gap fill.',
      'Read-only FireRed overworld map viewer (groups, layouts, tilesets, blocksets).',
    ],
    description: [
      'Channeler Advance is a Game Boy Advance ROM-hacking workbench by Soul-8691, written in Python with a Tkinter UI. Its design draws on Hex Maniac Advance: a hex editor at the centre, with anchor-driven structured views (PCS text, structs, graphics) docked alongside disassembly and decompilation panes.',
      'Anchors are declared in per-game TOML files — `[[NamedAnchors]]`, `[[FunctionAnchors]]`, `[[List]]` — and drive everything from row labels to graphics decoding to symbol-aware disassembly. On FireRed (BPRE) ROMs the bundled `pokefirered.sym` resolves branch targets and `.word` pool references, with `[[NamedAnchors]]` taking precedence so projects can override vanilla labels.',
      'The Tools window (Ctrl+T) docks a 3×2 grid of PCS / Struct / Graphics panels with a unified anchor combobox and per-panel Find. Pointer-follow and double-click flows can prompt "Open in Tools?" and route the anchor into a chosen slot. Goto, Go to offset…, and the Named Anchor browser only move the hex view — they never auto-open Disassembly, pseudo-C, or Tools.',
      'Graphics support covers 4bpp/8bpp sprites, tilemaps, tilesets and palettes, including LZ77/Huff streams whose lengths are measured for selection and bounds. NDS NITRO formats (`lznclr`, `lzncgr`, `lznanr`, `lzncer`, `lz5bg`) round out the toolkit for NDS work alongside GBA. Tilemap import does flip-aware dedupe in the Tilemap-Studio style.',
      'The pseudo-C pane has a C-inject mode (Ctrl+H) that compiles and links patches against vanilla FireRed symbols. Symbols that live in ROM as Thumb code are linked at odd addresses; data labels are listed in `rom.txt` so the linker leaves them even.',
    ],
    featureGroups: [
      {
        title: 'Editing & navigation',
        items: [
          'Insert / overwrite, copy, paste-overwrite (Ctrl+B), paste-insert (Ctrl+V), find/replace, save (Ctrl+S).',
          'Pointer follow on valid `0x08……` / `0x09……` `.word` targets (including from raw bytes).',
          'Goto by `pokefirered.sym` symbol name on BPRE ROMs (case-insensitive).',
          'Cross-references list incoming `.word` pointers and BL sites with anchor/symbol context.',
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
          '`name`-style columns drive automatic row labels; `pcs_ptr` / `ascii_ptr` editing, including nested arrays.',
          'Selected anchor `Format` with `` `ydk` `` or `` `ban` `` exposes Import YDK deck… / Import banlist… in the editor.',
          'Banlist import accepts EDOPro `.conf` / `.lflist` (password-keyed) and name-keyed JSON.',
          'Sprite import (`uct`/`lzt`/`ucs`/`lzs`) with optional 0xFF fill of the old slot on relocate.',
          'Tilemap import sized to tiles × 8 px with flip-aware dedupe; updates Format when tile count changes.',
          '8bpp palette preview is a scrollable swatch grid for full 256-colour masters.',
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
        label: 'pret/pokefirered (C/disasm reference)',
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

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

const PLATFORM_LABEL: Record<ToolPlatform, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  web: 'Web',
  android: 'Android',
  ios: 'iOS',
};

export function platformLabel(p: ToolPlatform): string {
  return PLATFORM_LABEL[p];
}

// Heuristic mapper from a parsed Sappy voicegroup entry → an SF2 preset in
// the loaded VGK FRLG sound bank. The VGK bank ships with named presets that
// mirror many of the GBA DirectSound samples (sc88pro_*, sd90_*, FRLG SFX,
// PSG square/wave/noise stand-ins), so a simple name-overlap score gets us
// most of the way there.

import type { VoiceEntry } from './voicegroup';

export interface SfPreset {
  bankMSB: number;
  bankLSB: number;
  program: number;
  name: string;
  isAnyDrums: boolean;
}

export interface MappingChoice {
  bankMSB: number;
  bankLSB: number;
  program: number;
  // SF2 marks drum kits via the preset header's "drum" bit (surfaced by
  // spessasynth as isAnyDrums) — NOT necessarily by bankMSB ≥ 128. So the
  // resolver has to carry isDrum explicitly; every "is this a drum?"
  // check in the rewriter and detectDrumChannels reads this, not bankMSB.
  isDrum: boolean;
  label: string;
  reason: string;
}

const SAMPLE_PREFIXES = ['sc88pro_', 'sd90_classical_', 'sd90_special_', 'sd90_', 'frlg_', 'rs_', 'pkmn_', 'gb_'];

function stripSamplePrefix(s: string): string {
  for (const p of SAMPLE_PREFIXES) if (s.startsWith(p)) return s.slice(p.length);
  return s;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[_\s\-/]+/)
    .filter((t) => t.length > 1);
}

function scoreMatch(presetName: string, query: string): number {
  const a = presetName.toLowerCase();
  const q = query.toLowerCase();
  if (a === q) return 10_000;
  if (a.startsWith(q)) return 6_000 + q.length;
  if (a.includes(q)) return 5_000 + q.length;
  const aToks = new Set(tokens(presetName));
  let s = 0;
  for (const tok of tokens(query)) {
    if (aToks.has(tok)) s += 50 + tok.length;
    else if (tok.length > 3 && a.includes(tok)) s += 10 + tok.length;
  }
  return s;
}

function bestMelodic(presets: readonly SfPreset[], query: string): SfPreset | undefined {
  let best: SfPreset | undefined;
  let bestScore = 1;
  for (const p of presets) {
    if (p.isAnyDrums) continue;
    const s = scoreMatch(p.name, query);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

function bestDrum(presets: readonly SfPreset[], hint: string): SfPreset | undefined {
  let best: SfPreset | undefined;
  let bestScore = -1;
  for (const p of presets) {
    if (!p.isAnyDrums) continue;
    const s = hint ? scoreMatch(p.name, hint) : 0;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

// Format a (MSB, LSB, program) coordinate as "MSB:program" when LSB is 0
// (the common case) or "MSB.LSB:program" when LSB is non-zero, so SF2s
// that use bank LSB to expose preset variants don't all collapse to the
// same display string.
export function fmtPresetCoord(bankMSB: number, bankLSB: number, program: number): string {
  return bankLSB === 0 ? `${bankMSB}:${program}` : `${bankMSB}.${bankLSB}:${program}`;
}

function asChoice(p: SfPreset, reason: string): MappingChoice {
  return {
    bankMSB: p.bankMSB,
    bankLSB: p.bankLSB,
    program: p.program,
    isDrum: p.isAnyDrums,
    label: `${fmtPresetCoord(p.bankMSB, p.bankLSB, p.program)} ${p.name}`,
    reason,
  };
}

// VGK is its own preset layout — bank 0 program N is NOT GM. When no name
// match is found we fall back to the first melodic preset (typically
// 0:0 Grand Piano in VGK) and flag the row so the user knows to override.
function defaultMelodic(presets: readonly SfPreset[], reason: string): MappingChoice {
  const first = presets.find((p) => !p.isAnyDrums);
  if (first) return asChoice(first, reason);
  return { bankMSB: 0, bankLSB: 0, program: 0, isDrum: false, label: '0:0 (none)', reason };
}

// Pull a name hint out of a Sappy keysplit subgroup name. e.g.
// `voicegroup_strings_keysplit` → "strings", `voicegroup_piano_keysplit` →
// "piano", `voicegroup_frlg_drumset` → "drumset".
function keysplitHint(subgroup: string): string {
  return subgroup
    .toLowerCase()
    .replace(/^voicegroup_?/, '')
    .replace(/_?keysplit$/, '')
    .replace(/_/g, ' ')
    .trim();
}

export function autoMap(entry: VoiceEntry, _slot: number, presets: readonly SfPreset[]): MappingChoice {
  switch (entry.kind) {
    case 'square1':
    case 'square2':
    case 'square1_alt':
    case 'square2_alt': {
      const hit = bestMelodic(
        presets,
        entry.kind === 'square2' || entry.kind === 'square2_alt' ? 'square wave 2' : 'square wave',
      );
      if (hit) return asChoice(hit, `psg ${entry.kind}`);
      return defaultMelodic(presets, `psg ${entry.kind} — no VGK match, override recommended`);
    }
    case 'wave':
    case 'wave_alt': {
      const hit = bestMelodic(presets, `gb wave ${entry.dataName}`);
      if (hit) return asChoice(hit, `psg wave ${entry.dataName}`);
      return defaultMelodic(presets, `psg wave ${entry.dataName} — no VGK match, override recommended`);
    }
    case 'noise':
    case 'noise_alt': {
      const hit = bestMelodic(presets, 'gb noise');
      if (hit) return asChoice(hit, 'psg noise');
      return defaultMelodic(presets, 'psg noise — no VGK match, override recommended');
    }
    case 'directsound':
    case 'directsound_no_resample': {
      const stripped = stripSamplePrefix(entry.sampleName);
      const hit = bestMelodic(presets, stripped);
      if (hit) return asChoice(hit, `directsound ${entry.sampleName}`);
      return defaultMelodic(presets, `unmatched sample ${entry.sampleName} — override recommended`);
    }
    case 'keysplit_all': {
      const hint = keysplitHint(entry.subgroupName);
      const hit = bestDrum(presets, hint);
      if (hit) return asChoice(hit, `drumkit ${entry.subgroupName}`);
      // Last-resort drum fallback: first drum preset in the bank, or 128:0.
      const anyDrum = presets.find((p) => p.isAnyDrums);
      if (anyDrum) return asChoice(anyDrum, `drumkit fallback for ${entry.subgroupName}`);
      return {
        bankMSB: 128,
        bankLSB: 0,
        program: 0,
        isDrum: true,
        label: '128:0 (drum)',
        reason: `drum fallback ${entry.subgroupName}`,
      };
    }
    case 'keysplit': {
      // Multi-instrument keysplits can't pick one preset perfectly, but the
      // subgroup name almost always carries a usable hint
      // (e.g. "voicegroup_strings_keysplit" → "strings"). Search the VGK
      // melodic presets for that hint before giving up.
      const hint = keysplitHint(entry.subgroupName);
      if (hint) {
        const hit = bestMelodic(presets, hint);
        if (hit) return asChoice(hit, `keysplit ${entry.subgroupName} (matched "${hint}")`);
      }
      return defaultMelodic(presets, `keysplit ${entry.subgroupName} — no VGK match, override recommended`);
    }
    case 'unknown':
      return defaultMelodic(presets, 'unknown voice entry — override recommended');
  }
}

// SpessaSynth's WorkletSynthesizer exposes its preset list via `presetList`;
// we narrow the structural shape we need so this module doesn't depend on the
// full library types.
interface PresetSource {
  presetList: ReadonlyArray<{
    bankMSB: number;
    bankLSB: number;
    program: number;
    name: string;
    isAnyDrums: boolean;
  }>;
}

export function listPresets(synth: PresetSource): SfPreset[] {
  return synth.presetList.map((p) => ({
    bankMSB: p.bankMSB,
    bankLSB: p.bankLSB,
    program: p.program,
    name: p.name,
    isAnyDrums: p.isAnyDrums,
  }));
}

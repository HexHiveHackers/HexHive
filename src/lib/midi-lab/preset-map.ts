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
  program: number;
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

function asChoice(p: SfPreset, reason: string): MappingChoice {
  return { bankMSB: p.bankMSB, program: p.program, label: `${p.bankMSB}:${p.program} ${p.name}`, reason };
}

const GM_FALLBACK = (slot: number, reason: string): MappingChoice => ({
  bankMSB: 0,
  program: slot & 0x7f,
  label: `0:${slot & 0x7f} (GM)`,
  reason,
});

export function autoMap(entry: VoiceEntry, slot: number, presets: readonly SfPreset[]): MappingChoice {
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
      return GM_FALLBACK(80, `psg ${entry.kind} fallback (GM Lead Square)`);
    }
    case 'wave':
    case 'wave_alt': {
      const hit = bestMelodic(presets, `programmable wave ${entry.dataName}`);
      if (hit) return asChoice(hit, `psg wave ${entry.dataName}`);
      return GM_FALLBACK(80, 'psg wave fallback');
    }
    case 'noise':
    case 'noise_alt': {
      const hit = bestMelodic(presets, 'noise');
      if (hit) return asChoice(hit, 'psg noise');
      return GM_FALLBACK(122, 'psg noise fallback (GM Seashore)');
    }
    case 'directsound':
    case 'directsound_no_resample': {
      const stripped = stripSamplePrefix(entry.sampleName);
      const hit = bestMelodic(presets, stripped);
      if (hit) return asChoice(hit, `directsound ${entry.sampleName}`);
      return GM_FALLBACK(slot, `unmatched sample ${entry.sampleName}`);
    }
    case 'keysplit_all': {
      const hit = bestDrum(presets, entry.subgroupName);
      if (hit) return asChoice(hit, `drumkit ${entry.subgroupName}`);
      return { bankMSB: 128, program: 0, label: '128:0 (drum)', reason: `drum fallback ${entry.subgroupName}` };
    }
    case 'keysplit':
      // Multi-instrument keysplits don't translate cleanly to a single SF2
      // preset; fall back to GM-by-slot as a least-bad default.
      return GM_FALLBACK(slot, `keysplit ${entry.subgroupName} (GM-by-slot fallback)`);
    case 'unknown':
      return GM_FALLBACK(slot, 'unknown voice entry');
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

// Parses pokeemerald/pokefirered-style voicegroup .inc files into a 128-entry
// table. Each MIDI program-change in a Sappy-engine song indexes into one of
// these slots, so we need typed entries to drive the SF2 preset remap.

export type VoiceEntry =
  | { kind: 'square1' | 'square2' | 'square1_alt' | 'square2_alt' }
  | { kind: 'wave' | 'wave_alt'; dataName: string }
  | { kind: 'noise' | 'noise_alt' }
  | { kind: 'directsound' | 'directsound_no_resample'; sampleName: string; baseKey: number; pan: number }
  | { kind: 'keysplit'; subgroupName: string; tableName: string }
  | { kind: 'keysplit_all'; subgroupName: string }
  | { kind: 'unknown'; raw: string };

export interface ParsedVoicegroup {
  name: string;
  entries: VoiceEntry[];
  warnings: string[];
}

const SLOT_COUNT = 128;
const UNKNOWN: VoiceEntry = { kind: 'unknown', raw: '' };

function stripComment(line: string): string {
  const at = line.indexOf('@');
  return (at < 0 ? line : line.slice(0, at)).trim();
}

function splitArgs(rest: string): string[] {
  return rest
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseInt10(s: string): number {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function stripSamplePrefix(name: string): string {
  return name.replace(/^DirectSoundWaveData_/, '');
}

function parseEntry(macro: string, rest: string, warnings: string[]): VoiceEntry {
  const args = splitArgs(rest);
  switch (macro) {
    case 'voice_square_1':
      return { kind: 'square1' };
    case 'voice_square_2':
      return { kind: 'square2' };
    case 'voice_square_1_alt':
      return { kind: 'square1_alt' };
    case 'voice_square_2_alt':
      return { kind: 'square2_alt' };
    case 'voice_noise':
      return { kind: 'noise' };
    case 'voice_noise_alt':
      return { kind: 'noise_alt' };
    case 'voice_programmable_wave':
      return { kind: 'wave', dataName: args[2] ?? '' };
    case 'voice_programmable_wave_alt':
      return { kind: 'wave_alt', dataName: args[2] ?? '' };
    case 'voice_directsound':
    case 'voice_directsound_no_resample':
      return {
        kind: macro === 'voice_directsound' ? 'directsound' : 'directsound_no_resample',
        sampleName: stripSamplePrefix(args[2] ?? ''),
        baseKey: parseInt10(args[0] ?? '60'),
        pan: parseInt10(args[1] ?? '0'),
      };
    case 'voice_keysplit':
      return { kind: 'keysplit', subgroupName: args[0] ?? '', tableName: args[1] ?? '' };
    case 'voice_keysplit_all':
      return { kind: 'keysplit_all', subgroupName: args[0] ?? '' };
    default:
      warnings.push(`unknown macro: ${macro}`);
      return { kind: 'unknown', raw: `${macro} ${rest}`.trim() };
  }
}

export function parseVoicegroup(incText: string): ParsedVoicegroup {
  const warnings: string[] = [];
  let name = '';
  const entries: VoiceEntry[] = [];

  for (const rawLine of incText.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (line.length === 0) continue;
    if (line.startsWith('.')) continue;

    const labelMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)::/);
    if (labelMatch) {
      name = labelMatch[1];
      continue;
    }
    const groupMatch = line.match(/^voice_group\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (groupMatch) {
      name = groupMatch[1];
      continue;
    }
    if (!line.startsWith('voice_')) continue;

    const space = line.search(/\s/);
    const macro = space < 0 ? line : line.slice(0, space);
    const rest = space < 0 ? '' : line.slice(space + 1);
    entries.push(parseEntry(macro, rest, warnings));
  }

  if (entries.length > SLOT_COUNT) {
    warnings.push(`voicegroup has ${entries.length} entries, truncating to ${SLOT_COUNT}`);
    entries.length = SLOT_COUNT;
  }
  while (entries.length < SLOT_COUNT) entries.push(UNKNOWN);

  return { name, entries, warnings };
}

// Stable digest keyed off (name + every entry's structural shape). Used to
// scope localStorage overrides so two MIDIs sharing the same voicegroup share
// preset choices.
export function hashVoicegroup(p: ParsedVoicegroup): string {
  const parts: string[] = [p.name];
  for (let i = 0; i < p.entries.length; i++) {
    const e = p.entries[i];
    switch (e.kind) {
      case 'directsound':
      case 'directsound_no_resample':
        parts.push(`${i}:${e.kind}:${e.sampleName}`);
        break;
      case 'wave':
      case 'wave_alt':
        parts.push(`${i}:${e.kind}:${e.dataName}`);
        break;
      case 'keysplit':
        parts.push(`${i}:keysplit:${e.subgroupName}:${e.tableName}`);
        break;
      case 'keysplit_all':
        parts.push(`${i}:keysplit_all:${e.subgroupName}`);
        break;
      case 'unknown':
        parts.push(`${i}:unknown:${e.raw}`);
        break;
      default:
        parts.push(`${i}:${e.kind}`);
    }
  }
  return fnv1a32(parts.join('|')).toString(16);
}

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

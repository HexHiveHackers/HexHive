import { describe, expect, it } from 'vitest';
import { autoMap, listPresets, type SfPreset } from './preset-map';
import type { VoiceEntry } from './voicegroup';

// Mock VGK-style preset list. Note: bank 0 is *not* GM-laid-out — VGK
// is its own custom layout, which is why the auto-mapper does not assume
// "bank 0 program N" matches any GM instrument.
const PRESETS: SfPreset[] = [
  { bankMSB: 0, bankLSB: 0, program: 0, name: 'Grand Piano', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 15, name: 'Fretless Bass', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 19, name: 'Pizzicato Strings', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 23, name: 'Strings Ensemble', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 29, name: 'Flute', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 17, name: 'sc88pro_organ2', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 24, name: 'sc88pro_nylon_str_guitar', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 73, name: 'sc88pro_flute', isAnyDrums: false },
  { bankMSB: 1, bankLSB: 0, program: 4, name: 'sd90_classical_detuned_ep1_low', isAnyDrums: false },
  { bankMSB: 1, bankLSB: 0, program: 5, name: 'sd90_classical_detuned_ep1_high', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 80, name: 'PSG Square Wave', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 81, name: 'PSG Square Wave 2', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 39, name: 'GB Wave 3', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 49, name: 'GB Noise', isAnyDrums: false },
  { bankMSB: 128, bankLSB: 0, program: 0, name: 'Drumkit 1', isAnyDrums: true },
  { bankMSB: 128, bankLSB: 0, program: 1, name: 'rs_drumset', isAnyDrums: true },
  { bankMSB: 128, bankLSB: 0, program: 2, name: 'frlg_drumset', isAnyDrums: true },
];

describe('autoMap', () => {
  it('maps directsound by stripped sample-name to a name-matching preset', () => {
    // sc88pro_flute → "flute" → "Flute" (real VGK preset name) wins over the
    // verbatim sc88pro_flute fake; this matches how the real bank is laid out.
    const v: VoiceEntry = { kind: 'directsound', sampleName: 'sc88pro_flute', baseKey: 60, pan: 0 };
    const m = autoMap(v, 73, PRESETS);
    expect(m.label.toLowerCase()).toContain('flute');
  });

  it('maps stripped-prefix directsound', () => {
    const v: VoiceEntry = {
      kind: 'directsound',
      sampleName: 'sd90_classical_detuned_ep1_high',
      baseKey: 60,
      pan: 0,
    };
    const m = autoMap(v, 5, PRESETS);
    expect(m.bankMSB).toBe(1);
    expect(m.program).toBe(5);
  });

  it('maps PSG square to a Square preset', () => {
    expect(autoMap({ kind: 'square1' }, 80, PRESETS).program).toBe(80);
    expect(autoMap({ kind: 'square2' }, 81, PRESETS).program).toBe(81);
  });

  it('maps PSG wave and noise', () => {
    const w = autoMap({ kind: 'wave', dataName: 'ProgrammableWaveData_2' }, 82, PRESETS);
    expect(w.label).toContain('GB Wave');
    const n = autoMap({ kind: 'noise' }, 122, PRESETS);
    expect(n.label).toContain('GB Noise');
  });

  it('maps keysplit_all rs_drumset to bank-128 drum preset by name', () => {
    const m = autoMap({ kind: 'keysplit_all', subgroupName: 'voicegroup_rs_drumset' }, 0, PRESETS);
    expect(m.bankMSB).toBe(128);
    expect(m.label).toContain('rs_drumset');
  });

  it('keysplit derives a name hint from the subgroup', () => {
    const strings = autoMap(
      { kind: 'keysplit', subgroupName: 'voicegroup_strings_keysplit', tableName: 'keysplit_strings' },
      48,
      PRESETS,
    );
    expect(strings.label).toContain('Strings Ensemble');
    expect(strings.reason).toContain('strings');

    const piano = autoMap(
      { kind: 'keysplit', subgroupName: 'voicegroup_piano_keysplit', tableName: 'keysplit_piano' },
      1,
      PRESETS,
    );
    expect(piano.label).toContain('Grand Piano');
  });

  it('falls back to the first melodic preset (not GM-by-slot) for unmatched samples', () => {
    const v: VoiceEntry = { kind: 'directsound', sampleName: 'sd90_special_scream_drive', baseKey: 60, pan: 0 };
    const m = autoMap(v, 33, PRESETS);
    expect(m.bankMSB).toBe(0);
    expect(m.program).toBe(0); // first melodic = Grand Piano
    expect(m.reason).toContain('override recommended');
  });

  it('unknown entries fall back with override-recommended reason', () => {
    const m = autoMap({ kind: 'unknown', raw: 'voice_xyz' }, 42, PRESETS);
    expect(m.label).toContain('Grand Piano');
    expect(m.reason).toContain('override recommended');
  });
});

describe('listPresets', () => {
  it('reads structural preset list', () => {
    const synth = {
      presetList: [
        { bankMSB: 0, bankLSB: 0, program: 0, name: 'A', isAnyDrums: false },
        { bankMSB: 128, bankLSB: 0, program: 0, name: 'B', isAnyDrums: true },
      ],
    };
    const p = listPresets(synth);
    expect(p).toHaveLength(2);
    expect(p[1].isAnyDrums).toBe(true);
  });
});

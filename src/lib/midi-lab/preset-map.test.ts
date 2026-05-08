import { describe, expect, it } from 'vitest';
import { autoMap, listPresets, type SfPreset } from './preset-map';
import type { VoiceEntry } from './voicegroup';

const PRESETS: SfPreset[] = [
  { bankMSB: 0, bankLSB: 0, program: 0, name: 'Acoustic Grand Piano', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 17, name: 'sc88pro_organ2', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 24, name: 'sc88pro_nylon_str_guitar', isAnyDrums: false },
  { bankMSB: 0, bankLSB: 0, program: 73, name: 'sc88pro_flute', isAnyDrums: false },
  { bankMSB: 1, bankLSB: 0, program: 4, name: 'sd90_classical_detuned_ep1_low', isAnyDrums: false },
  { bankMSB: 1, bankLSB: 0, program: 5, name: 'sd90_classical_detuned_ep1_high', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 80, name: 'PSG Square Wave', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 81, name: 'PSG Square Wave 2', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 82, name: 'PSG Programmable Wave', isAnyDrums: false },
  { bankMSB: 5, bankLSB: 0, program: 83, name: 'PSG Noise', isAnyDrums: false },
  { bankMSB: 128, bankLSB: 0, program: 0, name: 'Standard Kit', isAnyDrums: true },
  { bankMSB: 128, bankLSB: 0, program: 24, name: 'frlg_drumset', isAnyDrums: true },
  { bankMSB: 128, bankLSB: 0, program: 25, name: 'rs_drumset', isAnyDrums: true },
];

describe('autoMap', () => {
  it('maps directsound by exact sample-name', () => {
    const v: VoiceEntry = { kind: 'directsound', sampleName: 'sc88pro_flute', baseKey: 60, pan: 0 };
    const m = autoMap(v, 73, PRESETS);
    expect(m.program).toBe(73);
    expect(m.label).toContain('flute');
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
    expect(w.program).toBe(82);
    const n = autoMap({ kind: 'noise' }, 122, PRESETS);
    expect(n.program).toBe(83);
  });

  it('maps keysplit_all rs_drumset to bank-128 drum preset by name', () => {
    const m = autoMap({ kind: 'keysplit_all', subgroupName: 'voicegroup_rs_drumset' }, 0, PRESETS);
    expect(m.bankMSB).toBe(128);
    expect(m.label).toContain('rs_drumset');
  });

  it('falls back to GM slot for keysplit and unknown', () => {
    const m1 = autoMap({ kind: 'keysplit', subgroupName: 'voicegroup_piano_keysplit', tableName: 'kk' }, 1, PRESETS);
    expect(m1.bankMSB).toBe(0);
    expect(m1.program).toBe(1);
    const m2 = autoMap({ kind: 'unknown', raw: 'voice_xyz' }, 42, PRESETS);
    expect(m2.bankMSB).toBe(0);
    expect(m2.program).toBe(42);
  });

  it('falls back to GM slot when sample name has no preset match', () => {
    const v: VoiceEntry = { kind: 'directsound', sampleName: 'sd90_special_scream_drive', baseKey: 60, pan: 0 };
    const m = autoMap(v, 33, PRESETS);
    expect(m.bankMSB).toBe(0);
    expect(m.program).toBe(33);
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

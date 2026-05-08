import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashVoicegroup, parseVoicegroup } from './voicegroup';

const FIX = join(process.cwd(), 'static/midi-lab/fixtures');
const read = (p: string): string => readFileSync(join(FIX, p), 'utf8');

describe('parseVoicegroup', () => {
  it('parses voicegroup159 (Pallet Town) with 128 entries', () => {
    const vg = parseVoicegroup(read('pallet/voicegroup159.inc'));
    expect(vg.name).toBe('voicegroup159');
    expect(vg.entries).toHaveLength(128);
    expect(vg.warnings).toEqual([]);
  });

  it('extracts directsound sample names', () => {
    const vg = parseVoicegroup(read('pallet/voicegroup159.inc'));
    const e4 = vg.entries[4];
    expect(e4.kind).toBe('directsound');
    if (e4.kind === 'directsound') {
      expect(e4.sampleName).toBe('sd90_classical_detuned_ep1_low');
    }
    const e5 = vg.entries[5];
    expect(e5.kind).toBe('directsound');
    if (e5.kind === 'directsound') {
      expect(e5.sampleName).toBe('sd90_classical_detuned_ep1_high');
    }
    const e24 = vg.entries[24];
    expect(e24.kind).toBe('directsound');
    if (e24.kind === 'directsound') {
      expect(e24.sampleName).toBe('sc88pro_nylon_str_guitar');
    }
  });

  it('classifies alt PSG voices', () => {
    const vg = parseVoicegroup(read('pallet/voicegroup159.inc'));
    expect(vg.entries[80].kind).toBe('square1_alt');
    expect(vg.entries[81].kind).toBe('square2_alt');
    expect(vg.entries[82].kind).toBe('wave_alt');
    expect(vg.entries[83].kind).toBe('square1_alt');
    expect(vg.entries[126].kind).toBe('noise_alt');
    expect(vg.entries[127].kind).toBe('noise_alt');
  });

  it('parses voice_group syntax (Littleroot) and keysplit entries', () => {
    const vg = parseVoicegroup(read('littleroot/littleroot.inc'));
    expect(vg.name).toBe('littleroot');
    expect(vg.entries[0]).toEqual({ kind: 'keysplit_all', subgroupName: 'voicegroup_rs_drumset' });
    expect(vg.entries[1]).toEqual({
      kind: 'keysplit',
      subgroupName: 'voicegroup_piano_keysplit',
      tableName: 'keysplit_piano',
    });
  });

  it('parses Battle Dome Lobby with frlg drumset', () => {
    const vg = parseVoicegroup(read('b_dome_lobby/b_dome.inc'));
    expect(vg.name).toBe('b_dome');
    expect(vg.entries[0]).toEqual({ kind: 'keysplit_all', subgroupName: 'voicegroup_frlg_drumset' });
    const e17 = vg.entries[17];
    expect(e17.kind).toBe('directsound');
    if (e17.kind === 'directsound') expect(e17.sampleName).toBe('sc88pro_organ2');
  });

  it('keysplit voicegroup004 from voicegroup159 slot 48 parses', () => {
    const vg = parseVoicegroup(read('pallet/voicegroup159.inc'));
    expect(vg.entries[48]).toEqual({
      kind: 'keysplit',
      subgroupName: 'voicegroup004',
      tableName: 'KeySplitTable2',
    });
  });
});

describe('hashVoicegroup', () => {
  it('is stable across re-parses', () => {
    const t = read('pallet/voicegroup159.inc');
    expect(hashVoicegroup(parseVoicegroup(t))).toBe(hashVoicegroup(parseVoicegroup(t)));
  });
  it('differs between voicegroups', () => {
    const a = hashVoicegroup(parseVoicegroup(read('pallet/voicegroup159.inc')));
    const b = hashVoicegroup(parseVoicegroup(read('littleroot/littleroot.inc')));
    expect(a).not.toBe(b);
  });
});

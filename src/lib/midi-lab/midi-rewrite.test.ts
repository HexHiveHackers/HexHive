import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countBankSelectMSB, countProgramChanges, parseSmf, rewriteProgramChanges, serializeSmf } from './midi-rewrite';

const FIX = join(process.cwd(), 'static/midi-lab/fixtures');
const readMidi = (p: string): Uint8Array => new Uint8Array(readFileSync(join(FIX, p)));

const fixtures = [
  'pallet/mus_pallet.mid',
  'littleroot/mus_littleroot.mid',
  'b_dome_lobby/mus_b_dome_lobby.mid',
] as const;

describe('SMF parse + serialize', () => {
  for (const f of fixtures) {
    it(`round-trips event count for ${f}`, () => {
      const orig = readMidi(f);
      const parsed = parseSmf(orig);
      const reSerialized = serializeSmf(parsed);
      const reParsed = parseSmf(reSerialized);
      expect(reParsed.ntrks).toBe(parsed.ntrks);
      expect(reParsed.format).toBe(parsed.format);
      expect(reParsed.division).toBe(parsed.division);
      for (let t = 0; t < parsed.tracks.length; t++) {
        expect(reParsed.tracks[t].length).toBe(parsed.tracks[t].length);
      }
    });
  }
});

describe('rewriteProgramChanges', () => {
  it('inserts a CC0 + PC pair for every original PC (Pallet)', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    const pcCount = countProgramChanges(orig);
    expect(pcCount).toBeGreaterThan(0);
    const rewritten = rewriteProgramChanges(orig, (slot, _ch) => ({
      bankMSB: 7,
      program: slot,
      label: 'noop',
      reason: 'test',
    }));
    expect(countProgramChanges(rewritten)).toBe(pcCount);
    expect(countBankSelectMSB(rewritten)).toBeGreaterThanOrEqual(pcCount);
  });

  it('honors the resolver bank/program choice', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    const rewritten = rewriteProgramChanges(orig, (_slot, _ch) => ({
      bankMSB: 42,
      program: 17,
      label: 'pinned',
      reason: 'test',
    }));
    const smf = parseSmf(rewritten);
    let foundPair = false;
    for (const track of smf.tracks) {
      for (let i = 0; i < track.length - 1; i++) {
        const a = track[i];
        const b = track[i + 1];
        if (
          a.kind === 'midi' &&
          (a.status & 0xf0) === 0xb0 &&
          a.data[0] === 0 &&
          a.data[1] === 42 &&
          b.kind === 'midi' &&
          (b.status & 0xf0) === 0xc0 &&
          b.data[0] === 17 &&
          b.delta === 0
        ) {
          foundPair = true;
        }
      }
    }
    expect(foundPair).toBe(true);
  });

  it('zeroes NoteOn velocity for events on a muted slot', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    // Mute every slot — no audible NoteOn should remain.
    const rewritten = rewriteProgramChanges(
      orig,
      (slot) => ({ bankMSB: 0, program: slot, label: '', reason: '' }),
      () => true,
    );
    const smf = parseSmf(rewritten);
    let nonZeroNoteOns = 0;
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && (e.status & 0xf0) === 0x90 && e.data[1] > 0) nonZeroNoteOns++;
      }
    }
    expect(nonZeroNoteOns).toBe(0);
  });

  it('leaves NoteOns untouched for unmuted slots', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    const rewritten = rewriteProgramChanges(
      orig,
      (slot) => ({ bankMSB: 0, program: slot, label: '', reason: '' }),
      () => false,
    );
    const smf = parseSmf(rewritten);
    let nonZeroNoteOns = 0;
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && (e.status & 0xf0) === 0x90 && e.data[1] > 0) nonZeroNoteOns++;
      }
    }
    expect(nonZeroNoteOns).toBeGreaterThan(0);
  });

  it('preserves total event count + 1 CC0 per original PC across all fixtures', () => {
    for (const f of fixtures) {
      const orig = readMidi(f);
      const origSmf = parseSmf(orig);
      const origEventCount = origSmf.tracks.reduce((acc, t) => acc + t.length, 0);
      const origPcCount = countProgramChanges(orig);

      const rewritten = rewriteProgramChanges(orig, (slot) => ({
        bankMSB: 0,
        program: slot,
        label: '',
        reason: '',
      }));
      const newSmf = parseSmf(rewritten);
      const newEventCount = newSmf.tracks.reduce((acc, t) => acc + t.length, 0);
      expect(newEventCount).toBe(origEventCount + origPcCount);
    }
  });
});

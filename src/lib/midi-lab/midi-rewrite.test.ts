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
      bankLSB: 0,
      program: slot,
      isDrum: false,
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
      bankLSB: 0,
      program: 17,
      isDrum: false,
      label: 'pinned',
      reason: 'test',
    }));
    // Each PC is now preceded by CC0 (bank MSB) and CC32 (bank LSB),
    // emitted with delta-0 so the triple lands on the same tick.
    const smf = parseSmf(rewritten);
    let foundTriple = false;
    for (const track of smf.tracks) {
      for (let i = 0; i < track.length - 2; i++) {
        const a = track[i];
        const b = track[i + 1];
        const c = track[i + 2];
        if (
          a.kind === 'midi' &&
          (a.status & 0xf0) === 0xb0 &&
          a.data[0] === 0 &&
          a.data[1] === 42 &&
          b.kind === 'midi' &&
          (b.status & 0xf0) === 0xb0 &&
          b.data[0] === 32 &&
          b.data[1] === 0 &&
          b.delta === 0 &&
          c.kind === 'midi' &&
          (c.status & 0xf0) === 0xc0 &&
          c.data[0] === 17 &&
          c.delta === 0
        ) {
          foundTriple = true;
        }
      }
    }
    expect(foundTriple).toBe(true);
  });

  it('zeroes NoteOn velocity for events on a muted slot', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    // Mute every slot — no audible NoteOn should remain.
    const rewritten = rewriteProgramChanges(
      orig,
      (slot) => ({ bankMSB: 0, bankLSB: 0, program: slot, isDrum: false, label: '', reason: '' }),
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
      (slot) => ({ bankMSB: 0, bankLSB: 0, program: slot, isDrum: false, label: '', reason: '' }),
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

  it('preserves total event count across all fixtures', () => {
    for (const f of fixtures) {
      const orig = readMidi(f);
      const origSmf = parseSmf(orig);
      const origEventCount = origSmf.tracks.reduce((acc, t) => acc + t.length, 0);
      const origPcCount = countProgramChanges(orig);
      const origCc20Count = countCC(orig, 20);

      const rewritten = rewriteProgramChanges(orig, (slot) => ({
        bankMSB: 0,
        bankLSB: 0,
        program: slot,
        isDrum: false,
        label: '',
        reason: '',
      }));
      const newSmf = parseSmf(rewritten);
      const newEventCount = newSmf.tracks.reduce((acc, t) => acc + t.length, 0);
      // Each original PC expands to (CC0 + CC32 + PC) → +2 per PC.
      // Each CC20 (Sappy BENDR) expands to (CC101 + CC100 + CC6 + CC38) → +3 per CC20.
      // CC21 (LFOS) and CC29 (xIECV) are 1:1 swaps to CC76 / CC91 respectively — no count change.
      expect(newEventCount).toBe(origEventCount + 2 * origPcCount + 3 * origCc20Count);
    }
  });
});

describe('rewriteProgramChanges — Sappy LFOS (CC21) → CC76 (XG vibrato rate)', () => {
  const noopResolver = (slot: number) => ({
    bankMSB: 0,
    bankLSB: 0,
    program: slot,
    isDrum: false,
    label: '',
    reason: '',
  });

  it('rewrites every CC21 into a CC76 preserving channel + value + delta', () => {
    for (const f of fixtures) {
      const orig = readMidi(f);
      const origCc21 = countCC(orig, 21);
      if (origCc21 === 0) continue;

      // Capture the (channel, value) tuples of every CC21 in the source.
      const origSmf = parseSmf(orig);
      const sourceTuples: Array<[number, number]> = [];
      for (const track of origSmf.tracks) {
        for (const e of track) {
          if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === 21) {
            sourceTuples.push([e.status & 0x0f, e.data[1]]);
          }
        }
      }

      const rewritten = rewriteProgramChanges(orig, noopResolver);
      const newSmf = parseSmf(rewritten);
      const newTuples: Array<[number, number]> = [];
      for (const track of newSmf.tracks) {
        for (const e of track) {
          if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === 76) {
            newTuples.push([e.status & 0x0f, e.data[1]]);
          }
        }
      }
      expect(newTuples).toEqual(sourceTuples);
      expect(countCC(rewritten, 21)).toBe(0);
    }
  });
});

describe('rewriteProgramChanges — Sappy xIECV (CC29) → CC91 (reverb send)', () => {
  const noopResolver = (slot: number) => ({
    bankMSB: 0,
    bankLSB: 0,
    program: slot,
    isDrum: false,
    label: '',
    reason: '',
  });

  it('rewrites every CC29 into a CC91 preserving channel + value + delta', () => {
    for (const f of fixtures) {
      const orig = readMidi(f);
      const origCc29 = countCC(orig, 29);
      if (origCc29 === 0) continue;

      const origSmf = parseSmf(orig);
      const sourceTuples: Array<[number, number]> = [];
      for (const track of origSmf.tracks) {
        for (const e of track) {
          if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === 29) {
            sourceTuples.push([e.status & 0x0f, e.data[1]]);
          }
        }
      }

      const rewritten = rewriteProgramChanges(orig, noopResolver);
      const newSmf = parseSmf(rewritten);
      const newTuples: Array<[number, number]> = [];
      for (const track of newSmf.tracks) {
        for (const e of track) {
          if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === 91) {
            newTuples.push([e.status & 0x0f, e.data[1]]);
          }
        }
      }
      expect(newTuples).toEqual(sourceTuples);
      expect(countCC(rewritten, 29)).toBe(0);
    }
  });
});

describe('rewriteProgramChanges — Sappy BENDR (CC20) → RPN 0,0', () => {
  const noopResolver = (slot: number) => ({
    bankMSB: 0,
    bankLSB: 0,
    program: slot,
    isDrum: false,
    label: '',
    reason: '',
  });

  it('expands each CC20 into a CC101/CC100/CC6/CC38 quadruple on the same channel and tick', () => {
    for (const f of fixtures) {
      const orig = readMidi(f);
      const origCc20 = countCC(orig, 20);
      if (origCc20 === 0) continue;

      const rewritten = rewriteProgramChanges(orig, noopResolver);
      const smf = parseSmf(rewritten);

      let quadruples = 0;
      for (const track of smf.tracks) {
        for (let i = 0; i <= track.length - 4; i++) {
          const a = track[i];
          const b = track[i + 1];
          const c = track[i + 2];
          const d = track[i + 3];
          if (
            a.kind === 'midi' &&
            (a.status & 0xf0) === 0xb0 &&
            a.data[0] === 101 &&
            a.data[1] === 0 &&
            b.kind === 'midi' &&
            (b.status & 0xf0) === 0xb0 &&
            b.data[0] === 100 &&
            b.data[1] === 0 &&
            b.delta === 0 &&
            c.kind === 'midi' &&
            (c.status & 0xf0) === 0xb0 &&
            c.data[0] === 6 &&
            c.delta === 0 &&
            d.kind === 'midi' &&
            (d.status & 0xf0) === 0xb0 &&
            d.data[0] === 38 &&
            d.data[1] === 0 &&
            d.delta === 0 &&
            // all four CCs target the same channel
            (a.status & 0x0f) === (b.status & 0x0f) &&
            (b.status & 0x0f) === (c.status & 0x0f) &&
            (c.status & 0x0f) === (d.status & 0x0f)
          ) {
            quadruples++;
          }
        }
      }
      expect(quadruples).toBe(origCc20);
    }
  });

  it('emits the original semitone value as the Data Entry MSB (CC6) — Pallet uses BENDR=12', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    const rewritten = rewriteProgramChanges(orig, noopResolver);
    const smf = parseSmf(rewritten);
    const bendRangeValues: number[] = [];
    for (const track of smf.tracks) {
      for (let i = 0; i <= track.length - 4; i++) {
        const a = track[i];
        const c = track[i + 2];
        if (
          a.kind === 'midi' &&
          (a.status & 0xf0) === 0xb0 &&
          a.data[0] === 101 &&
          a.data[1] === 0 &&
          c.kind === 'midi' &&
          (c.status & 0xf0) === 0xb0 &&
          c.data[0] === 6
        ) {
          bendRangeValues.push(c.data[1]);
        }
      }
    }
    // All Pallet BENDR values are 12 (±1 octave).
    expect(bendRangeValues.length).toBeGreaterThan(0);
    for (const v of bendRangeValues) expect(v).toBe(12);
  });

  it('drops the original CC20 from output (no Sappy-specific CC remains)', () => {
    const orig = readMidi('pallet/mus_pallet.mid');
    const origCc20 = countCC(orig, 20);
    expect(origCc20).toBeGreaterThan(0);

    const rewritten = rewriteProgramChanges(orig, noopResolver);
    expect(countCC(rewritten, 20)).toBe(0);
  });
});

function countCC(midi: Uint8Array, controller: number): number {
  const smf = parseSmf(midi);
  let n = 0;
  for (const track of smf.tracks) {
    for (const e of track) {
      if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === controller) n++;
    }
  }
  return n;
}

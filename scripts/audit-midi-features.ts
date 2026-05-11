// MIDI / MP2K feature audit for /sounds/midi-lab fixtures.
//
// Walks every fixture .mid + paired .s file, classifies every event in the
// SMF, and cross-references with what our playback path (rewriter + spessa-
// synth) actually honors. Produces a markdown report on stdout.
//
// Run: `bun run scripts/audit-midi-features.ts > docs/midi-feature-audit.md`

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseSmf } from '../src/lib/midi-lab/midi-rewrite';

const FIX_ROOT = join(import.meta.dir, '..', 'static', 'midi-lab', 'fixtures');

interface FixtureFiles {
  id: string;
  mid: string;
  s: string | null;
}

function listFixtures(): FixtureFiles[] {
  const out: FixtureFiles[] = [];
  for (const id of readdirSync(FIX_ROOT)) {
    const dir = join(FIX_ROOT, id);
    const files = readdirSync(dir);
    const mid = files.find((f) => f.endsWith('.mid'));
    const s = files.find((f) => f.endsWith('.s')) ?? null;
    if (!mid) continue;
    out.push({ id, mid: join(dir, mid), s: s ? join(dir, s) : null });
  }
  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────

interface CcEvent {
  channel: number;
  controller: number;
  value: number;
  tick: number;
}
interface NoteEvent {
  channel: number;
  pitch: number;
  velocity: number;
  tick: number;
}
interface MidiStats {
  format: number;
  ntrks: number;
  division: number;
  ticksTotal: number;
  programChanges: { channel: number; program: number; tick: number }[];
  ccs: CcEvent[];
  noteOns: NoteEvent[];
  noteOffs: NoteEvent[];
  pitchBends: { channel: number; value: number; tick: number }[];
  channelAftertouch: { channel: number; value: number; tick: number }[];
  polyAftertouch: { channel: number; pitch: number; value: number; tick: number }[];
  metaTexts: { type: number; text: string; tick: number }[];
  tempoChanges: { tick: number; usPerQuarter: number }[];
  timeSig: { tick: number; num: number; den: number }[];
  keySig: { tick: number; sf: number; mi: number }[];
  sysex: { tick: number; len: number }[];
}

function parseStats(midi: Uint8Array): MidiStats {
  const smf = parseSmf(midi);
  const stats: MidiStats = {
    format: smf.format,
    ntrks: smf.ntrks,
    division: smf.division,
    ticksTotal: 0,
    programChanges: [],
    ccs: [],
    noteOns: [],
    noteOffs: [],
    pitchBends: [],
    channelAftertouch: [],
    polyAftertouch: [],
    metaTexts: [],
    tempoChanges: [],
    timeSig: [],
    keySig: [],
    sysex: [],
  };
  for (const track of smf.tracks) {
    let tick = 0;
    for (const e of track) {
      tick += e.delta;
      if (e.kind === 'midi') {
        const ch = e.channel ?? e.status & 0x0f;
        const status = e.status & 0xf0;
        if (status === 0xc0) {
          stats.programChanges.push({ channel: ch, program: e.data[0], tick });
        } else if (status === 0xb0) {
          stats.ccs.push({ channel: ch, controller: e.data[0], value: e.data[1], tick });
        } else if (status === 0x90) {
          if (e.data[1] === 0) {
            stats.noteOffs.push({ channel: ch, pitch: e.data[0], velocity: 0, tick });
          } else {
            stats.noteOns.push({ channel: ch, pitch: e.data[0], velocity: e.data[1], tick });
          }
        } else if (status === 0x80) {
          stats.noteOffs.push({ channel: ch, pitch: e.data[0], velocity: e.data[1], tick });
        } else if (status === 0xe0) {
          const value = (e.data[1] << 7) | e.data[0];
          stats.pitchBends.push({ channel: ch, value, tick });
        } else if (status === 0xd0) {
          stats.channelAftertouch.push({ channel: ch, value: e.data[0], tick });
        } else if (status === 0xa0) {
          stats.polyAftertouch.push({ channel: ch, pitch: e.data[0], value: e.data[1], tick });
        }
      } else if (e.kind === 'meta') {
        const t = e.metaType ?? 0;
        if (t === 0x51 && e.data.length === 3) {
          const us = (e.data[0] << 16) | (e.data[1] << 8) | e.data[2];
          stats.tempoChanges.push({ tick, usPerQuarter: us });
        } else if (t === 0x58 && e.data.length === 4) {
          stats.timeSig.push({ tick, num: e.data[0], den: 1 << e.data[1] });
        } else if (t === 0x59 && e.data.length === 2) {
          stats.keySig.push({ tick, sf: (e.data[0] << 24) >> 24, mi: e.data[1] });
        } else if (t >= 0x01 && t <= 0x07) {
          stats.metaTexts.push({ type: t, text: new TextDecoder().decode(e.data), tick });
        }
      } else if (e.kind === 'sysex') {
        stats.sysex.push({ tick, len: e.data.length });
      }
    }
    if (tick > stats.ticksTotal) stats.ticksTotal = tick;
  }
  return stats;
}

// ── per-feature analysis ─────────────────────────────────────────────────

function ccHistogram(ccs: CcEvent[]): Map<number, { count: number; channels: Set<number>; range: [number, number] }> {
  const m = new Map<number, { count: number; channels: Set<number>; range: [number, number] }>();
  for (const c of ccs) {
    const cur = m.get(c.controller) ?? { count: 0, channels: new Set<number>(), range: [127, 0] as [number, number] };
    cur.count++;
    cur.channels.add(c.channel);
    if (c.value < cur.range[0]) cur.range[0] = c.value;
    if (c.value > cur.range[1]) cur.range[1] = c.value;
    m.set(c.controller, cur);
  }
  return m;
}

// RPN: CC101 (MSB), CC100 (LSB), then CC6/CC38 to set data. RPN 0,0 = pitch
// bend range; the data CC carries the range in semitones.
function detectPitchBendRangeRPN(ccs: CcEvent[]): Map<number, number[]> {
  // channel → semitone values seen
  const out = new Map<number, number[]>();
  const rpnState = new Map<number, { msb: number | null; lsb: number | null }>();
  for (const c of ccs) {
    const state = rpnState.get(c.channel) ?? { msb: null, lsb: null };
    if (c.controller === 101) state.msb = c.value;
    else if (c.controller === 100) state.lsb = c.value;
    else if (c.controller === 6 && state.msb === 0 && state.lsb === 0) {
      const arr = out.get(c.channel) ?? [];
      arr.push(c.value);
      out.set(c.channel, arr);
    }
    rpnState.set(c.channel, state);
  }
  return out;
}

// Max simultaneous notes per channel (true polyphony observed in the SMF).
function maxPolyphony(noteOns: NoteEvent[], noteOffs: NoteEvent[]): Map<number, number> {
  const events = [...noteOns.map((n) => ({ ...n, on: true })), ...noteOffs.map((n) => ({ ...n, on: false }))].sort(
    (a, b) => a.tick - b.tick || (a.on === b.on ? 0 : a.on ? 1 : -1), // offs before ons at same tick
  );
  const active = new Map<number, number>();
  const peak = new Map<number, number>();
  for (const e of events) {
    const cur = active.get(e.channel) ?? 0;
    const next = e.on ? cur + 1 : Math.max(0, cur - 1);
    active.set(e.channel, next);
    if (next > (peak.get(e.channel) ?? 0)) peak.set(e.channel, next);
  }
  return peak;
}

// Note duration distribution: extreme long-held notes can indicate Sappy
// TIE (sustained-until-release) that was flattened into a single long
// NoteOn.
function noteDurationStats(
  noteOns: NoteEvent[],
  noteOffs: NoteEvent[],
  division: number,
): {
  count: number;
  veryLongTicks: number; // > 8 quarter notes
  veryLongPct: number;
  maxTicks: number;
  pctileMs95: number; // 95th percentile note length in ticks
} {
  const active = new Map<string, number>(); // "ch:pitch" → onTick
  const durations: number[] = [];
  const events = [...noteOns.map((n) => ({ ...n, on: true })), ...noteOffs.map((n) => ({ ...n, on: false }))].sort(
    (a, b) => a.tick - b.tick || (a.on === b.on ? 0 : a.on ? 1 : -1),
  );
  for (const e of events) {
    const key = `${e.channel}:${e.pitch}`;
    if (e.on) active.set(key, e.tick);
    else {
      const onTick = active.get(key);
      if (onTick !== undefined) {
        durations.push(e.tick - onTick);
        active.delete(key);
      }
    }
  }
  const veryLongThreshold = division * 8;
  const veryLong = durations.filter((d) => d >= veryLongThreshold).length;
  durations.sort((a, b) => a - b);
  const pctile95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
  return {
    count: durations.length,
    veryLongTicks: veryLong,
    veryLongPct: durations.length ? (veryLong / durations.length) * 100 : 0,
    maxTicks: durations.length ? durations[durations.length - 1] : 0,
    pctileMs95: pctile95,
  };
}

// Sappy .s scan: count occurrences of every command we know about, so we
// can compare what the source carries vs what made it into the .mid.
const SAPPY_CMDS = [
  'TIE',
  'EOT',
  'MOD ',
  'MODT',
  'LFOS',
  'LFODL',
  'BEND',
  'BENDR',
  'TUNE',
  'XCMD',
  'KEYSH',
  'VOICE',
  'VOL ',
  'PAN ',
  'PRIO',
  'TEMPO',
  'WAIT',
  'FINE',
  'GOTO',
  'PATT',
  'PEND',
  'REPT',
  'MEMACC',
  'NOTE',
] as const;

function scanSappyAsm(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cmd of SAPPY_CMDS) {
    // Match as a whole token, case-insensitive — Sappy .s files are
    // hand-formatted but consistent.
    const rx = new RegExp(`\\b${cmd.trim()}\\b`, 'gi');
    const m = text.match(rx);
    out[cmd.trim()] = m ? m.length : 0;
  }
  return out;
}

// ── report ───────────────────────────────────────────────────────────────

const CC_NAMES: Record<number, string> = {
  0: 'Bank Select MSB',
  1: 'Modulation Wheel (vibrato depth)',
  5: 'Portamento Time',
  6: 'RPN/NRPN Data Entry MSB',
  7: 'Volume',
  10: 'Pan',
  11: 'Expression',
  // Sappy-specific CCs (empirically confirmed by .s ↔ .mid count + value
  // correlation across all three Pokémon Gen-3 fixtures). The .s→.mid
  // converter (likely song2mid / agb2mid) uses CC20-CC30 to encode Sappy
  // bytecode commands that have no standard MIDI equivalent. spessasynth
  // does NOT interpret these — they're silently ignored at playback.
  20: 'Sappy BENDR (pitch-bend range, semitones)',
  21: 'Sappy LFOS (LFO speed)',
  22: 'Sappy LFODL (LFO delay) — speculative',
  23: 'Sappy MODT (modulation type) — speculative',
  29: 'Sappy XCMD xIECV (echo / initial channel volume)',
  30: 'Sappy XCMD (unknown subcommand)',
  32: 'Bank Select LSB',
  38: 'RPN/NRPN Data Entry LSB',
  64: 'Sustain Pedal',
  65: 'Portamento On/Off',
  66: 'Sostenuto',
  71: 'Resonance',
  74: 'Brightness',
  76: 'Vibrato Rate',
  77: 'Vibrato Depth',
  78: 'Vibrato Delay',
  84: 'Portamento Control',
  91: 'Reverb Send',
  93: 'Chorus Send',
  100: 'RPN LSB',
  101: 'RPN MSB',
  120: 'All Sound Off',
  121: 'Reset All Controllers',
  123: 'All Notes Off',
};

const SAPPY_CC_MAP: Record<number, string> = {
  20: 'BENDR',
  21: 'LFOS',
  29: 'xIECV (echo)',
};

// Sappy CCs that the rewriter translates into standard MIDI before
// playback. Order: source CC → destination CC(s) + a short description.
const REWRITER_TRANSLATIONS: Record<number, { dest: string; via: string }> = {
  20: { dest: 'RPN 0,0 + CC6', via: 'BENDR → pitch-bend range (semitones)' },
  21: { dest: 'CC76', via: 'LFOS → XG vibrato rate' },
  29: { dest: 'CC91', via: 'xIECV → reverb send (best-effort)' },
};

function out(s: string): void {
  process.stdout.write(`${s}\n`);
}

function audit(): void {
  const fixtures = listFixtures();
  out('# MP2K / SMF feature audit — `/sounds/midi-lab` fixtures');
  out('');
  out('Generated by `bun run scripts/audit-midi-features.ts`. Reports every event class our parser');
  out('sees in each fixture .mid, plus a scan of the paired `.s` for Sappy bytecode commands. The');
  out('"Verdict" column is a quick read on whether the feature is handled by our playback (rewriter');
  out('+ spessasynth) or being silently dropped.');
  out('');
  out('## Executive summary');
  out('');
  out('Three categories of finding, in order of audible impact:');
  out('');
  out('### A. Sappy state encoded in non-standard CCs (rewriter handles)');
  out('');
  out(
    "The .s → .mid converter preserves Sappy state by emitting it as **non-standard MIDI controllers (CC20-CC30 range)**. spessasynth doesn't interpret them directly, so the rewriter (`src/lib/midi-lab/midi-rewrite.ts`) translates each into the standard MIDI equivalent the synth honors. Mappings empirically confirmed by exact count + value match against the .s sources across all three fixtures:",
  );
  out('');
  out('| CC | Sappy command | What it controls | Rewriter target | Status |');
  out('|---|---|---|---|---|');
  out(
    '| **20** | `BENDR` | Pitch-bend range in semitones (most fixtures use 12 = ±1 octave) | RPN 0,0 + CC6 (pitch-bend range) | ✅ shipped |',
  );
  out('| **21** | `LFOS` | LFO speed (vibrato rate) | CC76 (XG vibrato rate) | ✅ shipped |');
  out(
    '| **29** | `XCMD xIECV` | Echo / initial channel volume | CC91 (reverb send) — best-effort, spessasynth reverb character ≠ GBA echo | ✅ shipped |',
  );
  out(
    '| **30** | (unknown XCMD subcommand, constant value 8) | TBD — likely Sappy-specific | — | ⚠️ unhandled; low impact |',
  );
  out('');
  out('### B. Loop boundaries present but not consumed');
  out('');
  out(
    'All three fixtures carry SMF Marker events with text `[` (loop start) and `]` (loop end) — the canonical Sappy/m4a loop-point convention. **Our playback ignores them**: `seq.loopCount = ∞` simply restarts the whole SMF from frame 0, so any pre-loop intro repeats every time.',
  );
  out('');
  out(
    "**Fix sketch:** before passing the SMF to spessasynth's Sequencer, rewrite `[`/`]` markers into the `loopStart`/`loopEnd` text spessasynth's built-in marker loop handler recognizes — or call spessasynth's loop-point API directly with the tick values.",
  );
  out('');
  out('### C. Inherent limits (no fix without a custom synth)');
  out('');
  out('- PSG / DMG square-wave + noise voices: SF2 sample-based playback can only approximate, not reproduce.');
  out('- Pulse-wave duty cycle shifts (12.5/25/50/75%): no SF2 modelling.');
  out(
    '- Voice stealing / hard polyphony cap: spessasynth has unbounded voices, so busy passages render fuller than GBA hardware would.',
  );
  out('- `MODT 1`/`MODT 2` (volume / pan vibrato): dropped during .s → .mid (no SMF representation).');
  out('');
  out("These would need a dedicated GBA-engine synth (e.g. agbplay's WebAssembly port) to fix. Not in scope.");
  out('');
  out('---');
  out('');
  out('## Per-fixture detail');
  out('');
  for (const f of fixtures) {
    const midiBytes = new Uint8Array(readFileSync(f.mid));
    const stats = parseStats(midiBytes);
    const ccHist = ccHistogram(stats.ccs);
    const rpnBend = detectPitchBendRangeRPN(stats.ccs);
    const poly = maxPolyphony(stats.noteOns, stats.noteOffs);
    const durations = noteDurationStats(stats.noteOns, stats.noteOffs, stats.division);
    const sappy = f.s ? scanSappyAsm(readFileSync(f.s, 'utf8')) : null;

    out(`---`);
    out('');
    out(`## ${f.id}`);
    out('');
    out(`- file: \`${basename(f.mid)}\``);
    out(`- format ${stats.format}, ${stats.ntrks} tracks, ${stats.division} TPQN, ${stats.ticksTotal} total ticks`);
    out(
      `- ${stats.noteOns.length} NoteOns, ${stats.noteOffs.length} NoteOffs, ${stats.programChanges.length} program changes`,
    );
    out('');

    // CC table
    out(`### Control changes (CC events)`);
    out('');
    if (ccHist.size === 0) {
      out('_None._');
    } else {
      out(`| CC# | Name | Count | Channels | Value range | Verdict |`);
      out(`|---|---|---|---|---|---|`);
      const sorted = [...ccHist.entries()].sort((a, b) => a[0] - b[0]);
      for (const [cc, info] of sorted) {
        const name = CC_NAMES[cc] ?? '?';
        const verdict = ccVerdict(cc);
        out(
          `| ${cc} | ${name} | ${info.count} | ${[...info.channels].sort((a, b) => a - b).join(',')} | ${info.range[0]}–${info.range[1]} | ${verdict} |`,
        );
      }
    }
    out('');

    // RPN pitch-bend range
    out(`### Pitch-bend range (RPN 0,0)`);
    out('');
    if (rpnBend.size === 0) {
      out(
        '⚠️ **No RPN 0,0 (pitch-bend range) messages found.** spessasynth defaults to ±2 semitones per channel. If the source voicegroup intended a wider range (Sappy `BENDR` per-voice), bends will sound shallow.',
      );
    } else {
      out(`| Channel | Range values (semitones) |`);
      out(`|---|---|`);
      for (const [ch, vals] of [...rpnBend.entries()].sort((a, b) => a[0] - b[0])) {
        out(`| ${ch} | ${vals.join(', ')} |`);
      }
    }
    out('');

    // Pitch bend usage
    out(`### Pitch-bend events (0xE0)`);
    out('');
    if (stats.pitchBends.length === 0) {
      out('_None._');
    } else {
      const channels = new Set(stats.pitchBends.map((p) => p.channel));
      const values = stats.pitchBends.map((p) => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      out(
        `${stats.pitchBends.length} events across ${channels.size} channel(s) (${[...channels].sort((a, b) => a - b).join(',')}). 14-bit range used: ${min}–${max} (center 8192 = no bend).`,
      );
      if (rpnBend.size === 0) {
        out('');
        out(`⚠️ Pitch bends present but no RPN 0,0 range declared → played at ±2 semitones default.`);
      }
    }
    out('');

    // Modulation / vibrato
    const cc1 = ccHist.get(1);
    out(`### Vibrato / modulation`);
    out('');
    if (!cc1) {
      out(
        "No CC1 (modulation wheel). If the source had Sappy `MOD`/`MODT`, it was either pitch-only and got dropped, or volume/pan vibrato (which the converter can't represent in SMF).",
      );
    } else {
      out(
        `CC1 used on channel(s) ${[...cc1.channels].sort((a, b) => a - b).join(',')}, ${cc1.count} events, depth range ${cc1.range[0]}–${cc1.range[1]}. Standard pitch vibrato — spessasynth applies this. ✅`,
      );
    }
    // CC76/77/78 — XG vibrato rate/depth/delay
    const xgVib = [76, 77, 78].filter((cc) => ccHist.has(cc));
    if (xgVib.length > 0) {
      out('');
      out(`XG-style vibrato controls present (${xgVib.map((c) => `CC${c}`).join(', ')}). spessasynth honors these.`);
    }
    out('');

    // Loop markers. The Sappy/m4a convention encodes loop boundaries as
    // Marker meta events (0x06) with text `[` (loop start) and `]` (loop
    // end). Some other tools use `loopStart`/`loopEnd`. Match both.
    out(`### Loop points`);
    out('');
    const allText = stats.metaTexts;
    const loopMarkers = allText.filter((m) => m.type === 0x06 && (/^[[\]]$/.test(m.text) || /loop/i.test(m.text)));
    if (loopMarkers.length === 0) {
      out(
        '⚠️ **No loop markers found.** Our `seq.loopCount=∞` will loop the entire SMF from frame 0. Sappy `GOTO` (loop target) info is lost during .s→.mid conversion.',
      );
    } else {
      out(`Found ${loopMarkers.length} Sappy/m4a loop marker(s) (\`[\` = loop start, \`]\` = loop end):`);
      out('');
      out(`| Marker | Position | Quarter-note | % through file |`);
      out(`|---|---|---|---|`);
      for (const m of loopMarkers) {
        const pct = stats.ticksTotal > 0 ? ((m.tick / stats.ticksTotal) * 100).toFixed(1) : '0';
        out(`| \`${m.text}\` | tick ${m.tick} | ${(m.tick / stats.division).toFixed(2)} q | ${pct}% |`);
      }
      out('');
      out(
        "⚠️ **Our Sequencer is not configured to honor these.** `seq.loopCount=∞` plus default config loops the whole SMF — the `[` marker is ignored. Wiring up spessasynth's loop boundary support (or rewriting `[` → `loopStart` so spessasynth's built-in marker handler picks it up) is the fix.",
      );
    }
    // All non-loop markers/texts for context
    if (allText.length > 0 && loopMarkers.length === 0) {
      out('');
      out(`All meta texts in file: ${allText.length}`);
      const sample = allText.slice(0, 5);
      for (const m of sample) {
        out(`- type 0x${m.type.toString(16).padStart(2, '0')}: \`${m.text.slice(0, 80)}\``);
      }
      if (allText.length > 5) out(`- … ${allText.length - 5} more`);
    }
    out('');

    // Polyphony
    out(`### Max simultaneous notes per channel`);
    out('');
    if (poly.size === 0) {
      out('_No notes._');
    } else {
      const entries = [...poly.entries()].sort((a, b) => a[0] - b[0]);
      const total = entries.reduce((acc, [, n]) => acc + n, 0);
      out(`| Channel | Peak polyphony |`);
      out(`|---|---|`);
      for (const [ch, n] of entries) out(`| ${ch} | ${n} |`);
      out('');
      out(
        `Aggregate peak: ${total} simultaneous voices across all channels. GBA hardware caps total voices around 8–12; modern synth has effectively unlimited.${total > 12 ? ' ⚠️ Source likely composed knowing some voices would steal — busier than the GBA could actually produce.' : ''}`,
      );
    }
    out('');

    // Note durations (TIE candidate detection)
    out(`### Note duration distribution`);
    out('');
    out(
      `${durations.count} matched note-on/off pairs. 95th-pct length: ${durations.pctileMs95} ticks (${(durations.pctileMs95 / stats.division).toFixed(2)} quarter notes). Longest: ${durations.maxTicks} ticks (${(durations.maxTicks / stats.division).toFixed(2)} quarter notes).`,
    );
    if (durations.veryLongPct > 5) {
      out('');
      out(
        `⚠️ ${durations.veryLongTicks} notes (${durations.veryLongPct.toFixed(1)}%) are ≥ 8 quarter notes long — strong candidates for Sappy TIE (sustained-until-explicit-release) that got flattened. Our playback handles long NoteOn/NoteOff pairs fine; flagging for awareness.`,
      );
    }
    out('');

    // Channel + poly aftertouch
    out(`### Aftertouch`);
    out('');
    if (stats.channelAftertouch.length === 0 && stats.polyAftertouch.length === 0) {
      out("No aftertouch events. (Sappy doesn't generate these.)");
    } else {
      out(
        `Channel aftertouch: ${stats.channelAftertouch.length}, poly aftertouch: ${stats.polyAftertouch.length}. ⚠️ Unusual for a Sappy rip — investigate.`,
      );
    }
    out('');

    // Tempo / time / key
    out(`### Tempo / time / key`);
    out('');
    out(
      `- Tempo changes: ${stats.tempoChanges.length}${stats.tempoChanges.length > 0 ? ` (initial ${(60_000_000 / stats.tempoChanges[0].usPerQuarter).toFixed(1)} BPM)` : ''}`,
    );
    out(
      `- Time-signature changes: ${stats.timeSig.length}${stats.timeSig.length > 0 ? ` (initial ${stats.timeSig[0].num}/${stats.timeSig[0].den})` : ''}`,
    );
    out(`- Key-signature changes: ${stats.keySig.length}`);
    out(`- SysEx events: ${stats.sysex.length}`);
    out('');

    // Sappy .s scan
    if (sappy) {
      out(`### Sappy \`.s\` bytecode (source) command count`);
      out('');
      out(`| Command | Count | Notes |`);
      out(`|---|---|---|`);
      const cmdNotes: Record<string, string> = {
        TIE: '`TIE` = sustain-until-release. Flattened to long NoteOn/Off pair in .mid.',
        MOD: '`MOD` = modulation depth. Maps to CC1 if MODT=0 (pitch), dropped otherwise.',
        MODT: '`MODT` = modulation **type** (0=pitch, 1=volume, 2=pan). Non-zero variants have **no SMF equivalent** — silently lost.',
        LFOS: '`LFOS` = LFO speed. Maps to CC76 (vibrato rate) — XG/GS only, vanilla GM ignores.',
        LFODL: '`LFODL` = LFO delay. Maps to CC78 (vibrato delay) — XG/GS only.',
        BEND: '`BEND` = pitch bend (standard, maps to 0xE0).',
        BENDR:
          '`BENDR` = pitch-bend **range** per voice. Should emit RPN 0,0 to set range on the channel — check RPN section above.',
        TUNE: '`TUNE` = fine tune cents. Maps to RPN 0,1 (fine tuning) — converter may drop.',
        XCMD: '`XCMD` = extended Sappy commands. Unlikely to survive SMF conversion.',
        PRIO: '`PRIO` = voice priority. Hardware-level voice stealing hint — **no SMF equivalent**.',
        MEMACC: '`MEMACC` = memory accumulator (loop counters, conditionals). Flattened or dropped.',
        GOTO: '`GOTO` = jump (loop target). Becomes a `loopStart`/`loopEnd` marker pair *if* the converter wrote one.',
        PATT: '`PATT` = pattern call. Expanded inline in .mid.',
        PEND: '`PEND` = pattern end.',
        REPT: '`REPT` = repeat. Flattened.',
        VOICE: '`VOICE` = program change. Maps to 0xC0.',
        'VOL ': '`VOL` = channel volume. Maps to CC7.',
        'PAN ': '`PAN` = channel pan. Maps to CC10.',
        TEMPO: '`TEMPO` = tempo set. Maps to meta 0x51.',
        KEYSH: '`KEYSH` = key shift in semitones. Applied during conversion (note pitches shifted in .mid).',
        FINE: '`FINE` = end of song.',
        EOT: '`EOT` = end of track.',
        WAIT: '`WAIT` = delta-time delays.',
        NOTE: '`NOTE` = note-on with attached duration.',
      };
      for (const cmd of Object.keys(sappy).sort()) {
        const n = sappy[cmd];
        if (n === 0) continue;
        const note = cmdNotes[cmd] ?? '';
        out(`| \`${cmd}\` | ${n} | ${note} |`);
      }
      // Flag dropped features by checking command counts vs MIDI presence
      out('');
      const droppedRisks: string[] = [];
      if (sappy.MODT > 0) {
        droppedRisks.push(
          `⚠️ **${sappy.MODT}× MODT in source.** If any are MODT=1 or MODT=2 (vol/pan vibrato), those are silently dropped in the .mid.`,
        );
      }
      if (sappy.BENDR > 0) {
        const cc20Count = ccHist.get(20)?.count ?? 0;
        if (cc20Count === sappy.BENDR) {
          droppedRisks.push(
            `✅ **${sappy.BENDR}× BENDR in source matches ${cc20Count}× CC20 in .mid** — rewriter translates each to RPN 0,0 + CC6=${ccHist.get(20)?.range[0] ?? '?'} so pitch bends play at the source-intended range.`,
          );
        } else if (cc20Count === 0 && rpnBend.size === 0) {
          droppedRisks.push(
            `⚠️ **${sappy.BENDR}× BENDR in source, 0 CC20 and 0 RPN 0,0 in .mid.** Bend range info completely dropped.`,
          );
        }
      }
      if (sappy.LFOS > 0) {
        const cc21Count = ccHist.get(21)?.count ?? 0;
        if (cc21Count === sappy.LFOS) {
          droppedRisks.push(
            `✅ **${sappy.LFOS}× LFOS in source matches ${cc21Count}× CC21 in .mid** — rewriter translates each to CC76 (XG vibrato rate).`,
          );
        } else if (cc21Count === 0 && !ccHist.has(76)) {
          droppedRisks.push(`⚠️ **${sappy.LFOS}× LFOS in source, 0 CC21 and 0 CC76 in .mid.** LFO speed dropped.`);
        }
      }
      if (sappy.GOTO > 0) {
        if (loopMarkers.length > 0) {
          droppedRisks.push(
            `🔁 **${sappy.GOTO}× GOTO in source matches ${loopMarkers.length}× loop marker(s) (\`[\` / \`]\`) in .mid** — preserved, but our Sequencer config doesn't consume them. Loop region: tick ${loopMarkers[0].tick}–${loopMarkers[loopMarkers.length - 1].tick}.`,
          );
        } else {
          droppedRisks.push(
            `⚠️ **${sappy.GOTO}× GOTO in source, 0 loop markers in .mid.** Loop target completely dropped.`,
          );
        }
      }
      if (sappy.PRIO > 0) {
        droppedRisks.push(
          `ℹ️ **${sappy.PRIO}× PRIO in source.** Hardware voice-priority hints have no SMF representation. No fix possible.`,
        );
      }
      if (sappy.XCMD > 0) {
        droppedRisks.push(`ℹ️ **${sappy.XCMD}× XCMD in source.** Extended Sappy commands; presumed dropped.`);
      }
      if (sappy.LFODL > 0 && !ccHist.has(78) && !ccHist.has(22)) {
        droppedRisks.push(`⚠️ **${sappy.LFODL}× LFODL in source, 0 CC78 in .mid.** LFO delay dropped.`);
      }
      if (droppedRisks.length > 0) {
        out(`#### Likely-dropped features (.s → .mid)`);
        out('');
        for (const r of droppedRisks) out(`- ${r}`);
        out('');
      }
    }
  }

  // ─── playback-path notes ───────────────────────────────────────────────
  out(`---`);
  out('');
  out(`## Playback path: what we handle vs. drop`);
  out('');
  out(`Source: \`src/lib/midi-lab/midi-rewrite.ts\` (rewriter) + \`spessasynth_lib\` Sequencer/Synthesizer.`);
  out('');
  out(`| Feature | Handled by | Status |`);
  out(`|---|---|---|`);
  out(`| NoteOn / NoteOff | rewriter pass-through, spessasynth voice alloc | ✅ |`);
  out(`| Program change (0xC0) | rewriter expands to CC0 + CC32 + PC; drum slots locked via setDrums | ✅ |`);
  out(
    `| Bank Select MSB/LSB (CC0/CC32) | rewriter injects per program-change; \`drumLock\` blocks mid-song flips | ✅ |`,
  );
  out(`| Pitch bend (0xE0) | pass-through | ✅ (but range may be wrong — see RPN section) |`);
  out(`| Modulation wheel (CC1) | pass-through, spessasynth applies pitch vibrato | ✅ |`);
  out(`| Volume / Pan / Expression (CC7/10/11) | pass-through | ✅ |`);
  out(`| Sustain / sostenuto (CC64/66) | pass-through | ✅ |`);
  out(`| Reverb / chorus send (CC91/93) | pass-through | ✅ effect character ≠ GBA |`);
  out(
    `| RPN 0,0 (pitch-bend range) | rewriter injects via CC20 translation; pass-through if source already sets it | ✅ |`,
  );
  out(`| Vibrato rate (CC76, XG) | rewriter injects via CC21 translation; pass-through otherwise | ✅ |`);
  out(
    `| Reverb send (CC91) | rewriter injects via CC29 translation; pass-through otherwise | ✅ best-effort vs GBA echo |`,
  );
  out(`| Tempo / time sig / key sig (meta) | pass-through | ✅ |`);
  out(`| Channel aftertouch (0xD0) | pass-through | ✅ unused by Sappy |`);
  out(`| Poly aftertouch (0xA0) | pass-through | ✅ unused by Sappy |`);
  out(
    `| SMF Marker (0x06) — \`[\` / \`]\` (Sappy loop boundaries) | **not consumed**; \`seq.loopCount=∞\` loops the whole file | ⚠️ |`,
  );
  out(
    `| Drum channel mode (MSB ≥ 128) | rewriter detects bank≥128 slots, sets channel drum mode, locks against MIDI flips | ✅ |`,
  );
  out(
    `| Drum-bank lock against allControllerReset | re-applies setDrums on every controller reset / songChange / timeChange | ✅ |`,
  );
  out(`| PSG / DMG square + noise voices | mapped to nearest SF2 melodic preset by autoMap | ❌ inherent SF2 limit |`);
  out(`| Pulse-wave duty cycle | no SF2 equivalent | ❌ |`);
  out(`| MODT 1/2 (volume/pan vibrato) | lost in .s → .mid | ❌ |`);
  out(`| Sappy TIE | flattened to long NoteOn/Off — works | ✅ |`);
  out(`| Voice stealing / hard polyphony cap | spessasynth has unbounded polyphony | ❌ over-renders busy passages |`);
  out('');
  out(`### Concrete fixes`);
  out('');
  out('Done:');
  out('');
  out(`- ✅ **Sappy CC20 (BENDR) → RPN 0,0 + CC6** — rewriter restores intended pitch-bend range. (Shipped.)`);
  out('- ✅ **Sappy CC21 (LFOS) → CC76** — rewriter restores intended vibrato rate. (Shipped.)');
  out(
    `- ✅ **Sappy CC29 (xIECV) → CC91** — rewriter best-effort approximation of echo. Note that spessasynth's reverb character is not GBA hardware echo. (Shipped.)`,
  );
  out('');
  out('Queued:');
  out('');
  out(
    `1. **Loop point honor.** Rewriter could rename \`[\` → \`loopStart\` and \`]\` → \`loopEnd\` so spessasynth's built-in marker handler picks up the loop region. Battle Dome benefits the most — its loop starts at tick 384 of 1152, meaning ~33% of the file is intro that currently replays every loop.`,
  );
  out(
    `2. **Mark inherent SF2 limits in UI.** PSG/duty-cycle limitations can't be fixed without a custom synth. A user-facing note on the lab page ("PSG voices are sample approximations") would manage expectations.`,
  );
  out('');
}

audit();

function ccVerdict(cc: number): string {
  // CCs we know spessasynth honors out of the box (standard GM/GS/XG core).
  const safe = new Set([
    0, 1, 5, 6, 7, 10, 11, 32, 38, 64, 65, 66, 71, 74, 76, 77, 78, 84, 91, 93, 100, 101, 120, 121, 123,
  ]);
  if (safe.has(cc)) return '✅ pass-through (spessasynth honors)';
  const translation = REWRITER_TRANSLATIONS[cc];
  if (translation) {
    return `✅ rewriter translates → ${translation.dest} (${translation.via})`;
  }
  if (cc in SAPPY_CC_MAP) {
    return `❌ Sappy ${SAPPY_CC_MAP[cc]} encoded as non-standard CC — synth silently ignores`;
  }
  return '⚠️ uncommon — verify synth interprets it';
}

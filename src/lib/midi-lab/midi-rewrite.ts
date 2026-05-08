// VLQ-aware Standard MIDI File parser/serializer with one job: rewrite every
// program-change event to honour a Sappy-style voicegroup → SF2 preset map.
// Each PC gets a CC#0 (bank MSB) injected immediately before it (delta-0) so
// the synth selects the right SF2 preset without shifting any subsequent
// timing.

export interface MappingChoice {
  bankMSB: number;
  program: number;
  label: string;
  reason: string;
}

export type Resolver = (slot: number, channel: number) => MappingChoice;

const HEADER_MAGIC = [0x4d, 0x54, 0x68, 0x64]; // "MThd"
const TRACK_MAGIC = [0x4d, 0x54, 0x72, 0x6b]; // "MTrk"

interface MidiEvent {
  delta: number;
  kind: 'midi' | 'meta' | 'sysex';
  status: number;
  channel?: number;
  data: Uint8Array; // status-less payload bytes (after the status byte)
  metaType?: number;
}

interface ParsedSmf {
  format: number;
  ntrks: number;
  division: number;
  tracks: MidiEvent[][];
}

class Reader {
  off = 0;
  constructor(public buf: Uint8Array) {}

  readUint8(): number {
    return this.buf[this.off++];
  }
  readUint16BE(): number {
    const v = (this.buf[this.off] << 8) | this.buf[this.off + 1];
    this.off += 2;
    return v;
  }
  readUint32BE(): number {
    const v =
      this.buf[this.off] * 0x1000000 +
      ((this.buf[this.off + 1] << 16) | (this.buf[this.off + 2] << 8) | this.buf[this.off + 3]);
    this.off += 4;
    return v >>> 0;
  }
  readVLQ(): number {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.buf[this.off++];
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) return value;
    }
    return value;
  }
  readBytes(n: number): Uint8Array {
    const out = this.buf.subarray(this.off, this.off + n);
    this.off += n;
    return out;
  }
  expectMagic(magic: number[], where: string): void {
    for (let i = 0; i < magic.length; i++) {
      if (this.buf[this.off + i] !== magic[i]) throw new Error(`bad magic at ${where} +${i}`);
    }
    this.off += magic.length;
  }
}

function writeVLQ(value: number): number[] {
  if (value < 0) throw new Error('negative VLQ');
  const out = [value & 0x7f];
  let v = value >>> 7;
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80);
    v = v >>> 7;
  }
  return out;
}

export function parseSmf(midi: ArrayBuffer | Uint8Array): ParsedSmf {
  const u8 = midi instanceof Uint8Array ? midi : new Uint8Array(midi);
  const r = new Reader(u8);
  r.expectMagic(HEADER_MAGIC, 'MThd');
  const headerLen = r.readUint32BE();
  if (headerLen < 6) throw new Error(`MThd length too short: ${headerLen}`);
  const format = r.readUint16BE();
  const ntrks = r.readUint16BE();
  const division = r.readUint16BE();
  // Skip any extra header bytes (rare).
  r.off += headerLen - 6;

  const tracks: MidiEvent[][] = [];
  for (let t = 0; t < ntrks; t++) {
    r.expectMagic(TRACK_MAGIC, 'MTrk');
    const trackLen = r.readUint32BE();
    const trackEnd = r.off + trackLen;
    const events: MidiEvent[] = [];
    let runningStatus = 0;
    while (r.off < trackEnd) {
      const delta = r.readVLQ();
      let status = r.buf[r.off];
      if (status < 0x80) {
        if (runningStatus === 0) throw new Error('running status with no prior status');
        status = runningStatus;
      } else {
        r.off++;
      }
      if (status === 0xff) {
        const metaType = r.readUint8();
        const len = r.readVLQ();
        const data = r.readBytes(len);
        events.push({ delta, kind: 'meta', status, metaType, data: new Uint8Array(data) });
        // Meta events do not affect running status (per spec, but most parsers reset).
        runningStatus = 0;
      } else if (status === 0xf0 || status === 0xf7) {
        const len = r.readVLQ();
        const data = r.readBytes(len);
        events.push({ delta, kind: 'sysex', status, data: new Uint8Array(data) });
        runningStatus = 0;
      } else {
        runningStatus = status;
        const channel = status & 0x0f;
        const high = status & 0xf0;
        let payloadLen: number;
        if (high === 0xc0 || high === 0xd0) payloadLen = 1;
        else payloadLen = 2;
        const data = r.readBytes(payloadLen);
        events.push({ delta, kind: 'midi', status, channel, data: new Uint8Array(data) });
      }
    }
    tracks.push(events);
  }
  return { format, ntrks, division, tracks };
}

function eventBytes(e: MidiEvent): number[] {
  const out: number[] = [];
  out.push(e.status);
  if (e.kind === 'meta') {
    out.push(e.metaType ?? 0);
    out.push(...writeVLQ(e.data.length));
    for (let i = 0; i < e.data.length; i++) out.push(e.data[i]);
  } else if (e.kind === 'sysex') {
    out.push(...writeVLQ(e.data.length));
    for (let i = 0; i < e.data.length; i++) out.push(e.data[i]);
  } else {
    for (let i = 0; i < e.data.length; i++) out.push(e.data[i]);
  }
  return out;
}

export function serializeSmf(smf: ParsedSmf): Uint8Array {
  const bytes: number[] = [];
  bytes.push(...HEADER_MAGIC, 0, 0, 0, 6);
  bytes.push((smf.format >> 8) & 0xff, smf.format & 0xff);
  bytes.push((smf.ntrks >> 8) & 0xff, smf.ntrks & 0xff);
  bytes.push((smf.division >> 8) & 0xff, smf.division & 0xff);
  for (const track of smf.tracks) {
    const trackBytes: number[] = [];
    for (const e of track) {
      trackBytes.push(...writeVLQ(e.delta));
      trackBytes.push(...eventBytes(e));
    }
    bytes.push(...TRACK_MAGIC);
    const len = trackBytes.length;
    bytes.push((len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);
    for (let i = 0; i < trackBytes.length; i++) bytes.push(trackBytes[i]);
  }
  return Uint8Array.from(bytes);
}

export function rewriteProgramChanges(midi: ArrayBuffer | Uint8Array, resolve: Resolver): Uint8Array {
  const smf = parseSmf(midi);
  for (let t = 0; t < smf.tracks.length; t++) {
    const out: MidiEvent[] = [];
    for (const e of smf.tracks[t]) {
      if (e.kind === 'midi' && (e.status & 0xf0) === 0xc0) {
        const channel = e.channel ?? e.status & 0x0f;
        const program = e.data[0];
        const choice = resolve(program, channel);
        out.push({
          delta: e.delta,
          kind: 'midi',
          status: 0xb0 | channel,
          channel,
          data: Uint8Array.from([0, choice.bankMSB & 0x7f]),
        });
        out.push({
          delta: 0,
          kind: 'midi',
          status: 0xc0 | channel,
          channel,
          data: Uint8Array.from([choice.program & 0x7f]),
        });
      } else {
        out.push(e);
      }
    }
    smf.tracks[t] = out;
  }
  return serializeSmf(smf);
}

// Useful for tests: counts program-change events per track.
export function countProgramChanges(midi: ArrayBuffer | Uint8Array): number {
  const smf = parseSmf(midi);
  let n = 0;
  for (const t of smf.tracks) for (const e of t) if (e.kind === 'midi' && (e.status & 0xf0) === 0xc0) n++;
  return n;
}

export function countBankSelectMSB(midi: ArrayBuffer | Uint8Array): number {
  const smf = parseSmf(midi);
  let n = 0;
  for (const t of smf.tracks)
    for (const e of t) if (e.kind === 'midi' && (e.status & 0xf0) === 0xb0 && e.data[0] === 0) n++;
  return n;
}

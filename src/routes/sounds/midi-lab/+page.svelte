<script lang="ts">
  import { FlaskConical, Loader2, Music, Pause, Play, RefreshCw, Upload } from '@lucide/svelte';
  import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { parseSmf, rewriteProgramChanges } from '$lib/midi-lab/midi-rewrite';
  import { loadOverrides, saveOverride } from '$lib/midi-lab/overrides';
  import { autoMap, listPresets, type MappingChoice, type SfPreset } from '$lib/midi-lab/preset-map';
  import { hashVoicegroup, type ParsedVoicegroup, parseVoicegroup, type VoiceEntry } from '$lib/midi-lab/voicegroup';
  import type { PageData } from './$types';

  const SF2_URL = 'https://cdn.hexhive.app/soundfonts/Pokemon-FireRed-LeafGreen-VGK.sf2';
  const WORKLET_URL = '/spessasynth_processor.min.js';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    songId: string;
    label: string;
    midiBytes: ArrayBuffer;
    incText: string;
    voicegroup: ParsedVoicegroup;
    vgHash: string;
    mp3Url: string | null;
    usedSlots: ReadonlySet<number>;
    usedChannels: ReadonlySet<number>;
  };

  let loaded = $state<Loaded | null>(null);
  let presets = $state<readonly SfPreset[]>([]);
  let overrides = $state<Record<number, MappingChoice>>({});
  let warnings = $state<string[]>([]);
  let mutedChannels = $state<Set<number>>(new Set());

  // Engine state mirrors SoundPlayer.svelte's lifecycle.
  let engineState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let ctx: AudioContext | null = null;
  let synth: WorkletSynthesizer | null = null;
  let seq: Sequencer | null = null;
  let rafId = 0;

  let sfBytesPromise: Promise<ArrayBuffer> | null = null;
  let libPromise: Promise<typeof import('spessasynth_lib')> | null = null;

  function prewarm(): void {
    if (typeof window === 'undefined') return;
    if (!sfBytesPromise) sfBytesPromise = fetch(SF2_URL).then((r) => r.arrayBuffer());
    if (!libPromise) libPromise = import('spessasynth_lib');
  }

  async function initEngine(): Promise<void> {
    if (engineState === 'ready' || engineState === 'loading') return;
    engineState = 'loading';
    try {
      prewarm();
      const audioCtx = new AudioContext();
      await audioCtx.audioWorklet.addModule(WORKLET_URL);
      const lib = await (libPromise as Promise<typeof import('spessasynth_lib')>);
      const s = new lib.WorkletSynthesizer(audioCtx);
      s.connect(audioCtx.destination);
      const sf = await (sfBytesPromise as Promise<ArrayBuffer>);
      await s.soundBankManager.addSoundBank(sf, 'vgk-frlg');
      await s.isReady;
      const sq = new lib.Sequencer(s);
      sq.eventHandler.addEvent('songEnded', 'midilab-end', () => {
        isPlaying = false;
      });
      ctx = audioCtx;
      synth = s;
      seq = sq;
      presets = listPresets(s);
      engineState = 'ready';
    } catch (err) {
      console.error('midi-lab: engine init failed', err);
      engineState = 'error';
    }
  }

  function awaitSongLoaded(s: Sequencer, id: string): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const tag = `midilab-load-${id}`;
      const finish = (): void => {
        if (done) return;
        done = true;
        s.eventHandler.removeEvent('songChange', tag);
        resolve();
      };
      s.eventHandler.addEvent('songChange', tag, finish);
      setTimeout(finish, 5000);
    });
  }

  function buildMappings(vg: ParsedVoicegroup, ovr: Record<number, MappingChoice>, ps: readonly SfPreset[]) {
    const out: Record<number, MappingChoice> = {};
    for (let slot = 0; slot < 128; slot++) {
      out[slot] = ovr[slot] ?? autoMap(vg.entries[slot], slot, ps);
    }
    return out;
  }

  // Slots actually referenced by at least one program-change in the MIDI.
  function usedSlotsOf(midi: ArrayBuffer): Set<number> {
    const used = new Set<number>();
    const smf = parseSmf(midi);
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && (e.status & 0xf0) === 0xc0) used.add(e.data[0]);
      }
    }
    return used;
  }

  // Channels (0-15) that have any MIDI event in the song. Useful for the
  // per-channel mute strip — only show buttons for channels actually used.
  function usedChannelsOf(midi: ArrayBuffer): Set<number> {
    const used = new Set<number>();
    const smf = parseSmf(midi);
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && e.channel !== undefined) used.add(e.channel);
      }
    }
    return used;
  }

  async function loadIntoSequencer(restoreTime = 0): Promise<void> {
    if (!seq || !loaded) return;
    const ps = presets;
    const merged = buildMappings(loaded.voicegroup, overrides, ps);
    const rewritten = rewriteProgramChanges(loaded.midiBytes, (slot, _ch) => merged[slot]);
    const wasPlaying = isPlaying;
    const id = `${loaded.songId}-${Date.now()}`;
    const loadedP = awaitSongLoaded(seq, id);
    const buf = new ArrayBuffer(rewritten.byteLength);
    new Uint8Array(buf).set(rewritten);
    seq.loadNewSongList([{ binary: buf, fileName: id }]);
    await loadedP;
    duration = seq.duration;
    if (restoreTime > 0) seq.currentTime = Math.min(restoreTime, seq.duration);
    if (wasPlaying) {
      seq.play();
      isPlaying = true;
    }
  }

  async function loadFixture(f: (typeof data.fixtures)[number]): Promise<void> {
    const [midiBuf, incText] = await Promise.all([
      fetch(f.midiUrl).then((r) => r.arrayBuffer()),
      fetch(f.voicegroupUrl).then((r) => r.text()),
    ]);
    await ingest(f.id, f.label, midiBuf, incText, f.mp3Url);
  }

  async function ingest(
    id: string,
    label: string,
    midiBytes: ArrayBuffer,
    incText: string,
    mp3Url: string | null,
  ): Promise<void> {
    const vg = parseVoicegroup(incText);
    const vgHash = hashVoicegroup(vg);
    const used = usedSlotsOf(midiBytes);
    const usedCh = usedChannelsOf(midiBytes);
    loaded = {
      songId: id,
      label,
      midiBytes,
      incText,
      voicegroup: vg,
      vgHash,
      mp3Url,
      usedSlots: used,
      usedChannels: usedCh,
    };
    // Reset mutes when switching songs and unmute on the synth (the previous
    // song may have left some channels muted on this synth instance).
    if (synth) for (const ch of mutedChannels) synth.muteChannel(ch, false);
    mutedChannels = new Set();
    overrides = loadOverrides(vgHash);
    warnings = vg.warnings.slice();
    if (engineState !== 'ready') await initEngine();
    if (engineState === 'ready' && ctx?.state === 'suspended') await ctx.resume();
    isPlaying = false;
    currentTime = 0;
    await loadIntoSequencer();
  }

  function play(): void {
    if (!seq || !ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    seq.play();
    isPlaying = true;
  }
  function pause(): void {
    seq?.pause();
    isPlaying = false;
  }
  function togglePlay(): void {
    if (isPlaying) pause();
    else play();
  }
  function seek(t: number): void {
    if (!seq) return;
    seq.currentTime = t;
    currentTime = t;
  }

  function toggleChannelMute(ch: number): void {
    if (!synth) return;
    const next = new Set(mutedChannels);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    mutedChannels = next;
    synth.muteChannel(ch, next.has(ch));
  }

  async function setOverride(slot: number, choice: MappingChoice | null): Promise<void> {
    if (!loaded) return;
    saveOverride(loaded.vgHash, slot, choice);
    overrides = loadOverrides(loaded.vgHash);
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  $effect(() => {
    if (!isPlaying) return;
    const tick = (): void => {
      if (seq) currentTime = seq.currentHighResolutionTime;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  onMount(() => () => {
    cancelAnimationFrame(rafId);
    seq?.pause();
    void ctx?.close();
    seq = null;
    synth = null;
    ctx = null;
  });

  // ── Drag-and-drop ─────────────────────────────────────────────────────
  let dragOver = $state(false);
  async function onDrop(ev: DragEvent): Promise<void> {
    ev.preventDefault();
    dragOver = false;
    const files = ev.dataTransfer?.files;
    if (!files) return;
    let midi: File | null = null;
    let inc: File | null = null;
    let mp3: File | null = null;
    for (const f of Array.from(files)) {
      const n = f.name.toLowerCase();
      if (n.endsWith('.mid') || n.endsWith('.midi')) midi = f;
      else if (n.endsWith('.inc')) inc = f;
      else if (n.endsWith('.mp3')) mp3 = f;
    }
    if (!midi || !inc) {
      warnings = ['drop must include both a .mid and a matching .inc voicegroup'];
      return;
    }
    const [midiBytes, incText] = await Promise.all([midi.arrayBuffer(), inc.text()]);
    const url = mp3 ? URL.createObjectURL(mp3) : null;
    await ingest(midi.name.replace(/\.[^.]+$/, ''), midi.name, midiBytes, incText, url);
  }

  function fmtTime(t: number): string {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Mapping table rows: only slots referenced by the loaded MIDI.
  type Row = { slot: number; entry: VoiceEntry; current: MappingChoice; auto: MappingChoice };
  const rows = $derived<Row[]>(
    loaded
      ? [...loaded.usedSlots]
          .sort((a, b) => a - b)
          .map((slot) => {
            const entry = (loaded as Loaded).voicegroup.entries[slot];
            const auto = autoMap(entry, slot, presets);
            const current = overrides[slot] ?? auto;
            return { slot, entry, current, auto };
          })
      : [],
  );

  function entryLabel(e: VoiceEntry): string {
    switch (e.kind) {
      case 'directsound':
      case 'directsound_no_resample':
        return `${e.kind} ${e.sampleName}`;
      case 'wave':
      case 'wave_alt':
        return `${e.kind} ${e.dataName}`;
      case 'keysplit':
        return `keysplit ${e.subgroupName} / ${e.tableName}`;
      case 'keysplit_all':
        return `keysplit_all ${e.subgroupName}`;
      case 'unknown':
        return `unknown ${e.raw}`;
      default:
        return e.kind;
    }
  }

  function presetKey(p: { bankMSB: number; program: number }): string {
    return `${p.bankMSB}:${p.program}`;
  }

  function onSelect(slot: number, key: string): void {
    if (key === 'auto') {
      void setOverride(slot, null);
      return;
    }
    const [bStr, pStr] = key.split(':');
    const b = Number.parseInt(bStr, 10);
    const p = Number.parseInt(pStr, 10);
    const hit = presets.find((q) => q.bankMSB === b && q.program === p);
    if (!hit) return;
    void setOverride(slot, {
      bankMSB: hit.bankMSB,
      program: hit.program,
      label: `${hit.bankMSB}:${hit.program} ${hit.name}`,
      reason: 'manual override',
    });
  }
</script>

<svelte:head>
  <title>MIDI lab · HexHive</title>
  <link rel="preconnect" href="https://cdn.hexhive.app" crossorigin="anonymous" />
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-8 space-y-6">
  <header class="space-y-2">
    <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-display">
      <FlaskConical class="size-4" /> beta
    </div>
    <h1 class="text-2xl md:text-3xl font-display">MIDI lab</h1>
    <p class="text-sm text-muted-foreground max-w-2xl">
      Test how a Pokémon GBA MIDI sounds when its program-changes are remapped to the right VGK SF2 presets via its
      voicegroup <code class="text-xs">.inc</code>. A/B against the vanilla recording. Override any slot live.
    </p>
  </header>

  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs uppercase tracking-wider text-muted-foreground mr-2">Fixtures:</span>
    {#each data.fixtures as f}
      <Button variant="outline" size="sm" onclick={() => void loadFixture(f)}>
        <Music class="size-4" /> {f.label}
        <span class="text-muted-foreground font-mono text-xs">[{f.game}]</span>
      </Button>
    {/each}
  </div>

  <div
    class="border border-dashed rounded-lg p-6 text-sm text-muted-foreground opacity-40 cursor-not-allowed select-none"
    aria-label="Custom file drop (coming soon)"
  >
    <div class="flex items-center gap-3">
      <Upload class="size-5" />
      <div>
        Drop a <code>.mid</code> and matching voicegroup <code>.inc</code> here (optional reference <code>.mp3</code>).
        <span class="ml-1 italic">(coming soon)</span>
      </div>
    </div>
  </div>

  {#if warnings.length > 0}
    <div class="border border-amber-500/40 bg-amber-500/5 rounded-md p-3 text-xs">
      <div class="font-medium mb-1 text-amber-300">Parser warnings</div>
      <ul class="list-disc pl-5 space-y-0.5">
        {#each warnings as w}<li>{w}</li>{/each}
      </ul>
    </div>
  {/if}

  {#if loaded}
    <section class="border rounded-lg p-4 space-y-4">
      <div>
        <div class="text-sm text-muted-foreground">Now loaded</div>
        <div class="font-medium">{loaded.label}</div>
        <div class="text-xs text-muted-foreground font-mono">
          voicegroup: {loaded.voicegroup.name} · {loaded.usedSlots.size} slots used · vgHash {loaded.vgHash}
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">Synth (remapped MIDI)</div>
        <div class="flex items-center gap-3">
          <Button onclick={togglePlay} disabled={engineState !== 'ready'} size="sm">
            {#if engineState === 'loading'}
              <Loader2 class="size-4 animate-spin" /> loading…
            {:else if isPlaying}
              <Pause class="size-4" /> Pause
            {:else}
              <Play class="size-4" /> Play
            {/if}
          </Button>
          <span class="text-xs font-mono w-12 tabular-nums">{fmtTime(currentTime)}</span>
          <input
            type="range"
            class="flex-1"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            oninput={(e) => seek(Number.parseFloat((e.currentTarget as HTMLInputElement).value))}
            disabled={engineState !== 'ready'}
            aria-label="MIDI scrub"
          />
          <span class="text-xs font-mono w-12 tabular-nums text-right">{fmtTime(duration)}</span>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">Channel mutes</div>
        <div class="flex flex-wrap gap-1.5 justify-end">
          {#each [...loaded.usedChannels].sort((a, b) => a - b) as ch}
            <button
              type="button"
              onclick={() => toggleChannelMute(ch)}
              disabled={engineState !== 'ready'}
              class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] tabular-nums {mutedChannels.has(ch)
                ? 'bg-destructive/20 border-destructive/60 text-destructive line-through'
                : 'border-border hover:border-foreground/40'}"
              aria-pressed={mutedChannels.has(ch)}
              title="Channel {ch + 1} {mutedChannels.has(ch) ? '(muted)' : ''}"
            >
              ch{ch + 1}
            </button>
          {/each}
        </div>
      </div>

      {#if loaded.mp3Url}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wider text-muted-foreground">Reference recording (vanilla MP3)</div>
          {#key loaded.songId}
            <audio controls preload="none" class="w-full">
              <source src={loaded.mp3Url} />
              <track kind="captions" />
            </audio>
          {/key}
        </div>
      {/if}
    </section>

    <section class="border rounded-lg overflow-hidden">
      <header class="px-4 py-2 border-b text-xs uppercase tracking-wider text-muted-foreground">
        Voicegroup → SF2 mapping ({rows.length} slots)
      </header>
      {#if presets.length === 0}
        <div class="p-4 text-sm text-muted-foreground">Loading SF2 preset list…</div>
      {:else}
        <ul class="divide-y">
          {#each rows as row (row.slot)}
            <li class="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span class="font-mono text-xs w-10 text-muted-foreground tabular-nums">#{row.slot}</span>
              <span class="font-mono text-xs flex-1 min-w-[16rem] truncate" title={entryLabel(row.entry)}>
                {entryLabel(row.entry)}
              </span>
              <select
                class="bg-background border rounded px-2 py-1 text-xs font-mono min-w-[14rem]"
                value={overrides[row.slot] ? presetKey(overrides[row.slot]) : 'auto'}
                onchange={(e) => onSelect(row.slot, (e.currentTarget as HTMLSelectElement).value)}
              >
                <option value="auto">auto · {row.auto.label}</option>
                {#each presets as p}
                  <option value={presetKey(p)}>
                    {p.bankMSB}:{p.program} · {p.name}{p.isAnyDrums ? ' (drum)' : ''}
                  </option>
                {/each}
              </select>
              {#if overrides[row.slot]}
                <Button variant="ghost" size="sm" onclick={() => void setOverride(row.slot, null)}>
                  <RefreshCw class="size-3" /> auto
                </Button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {:else}
    <div class="text-sm text-muted-foreground">
      Pick a fixture above or drop your own files to start. The synth uses the FRLG VGK SF2 self-hosted on
      <code>cdn.hexhive.app</code>.
    </div>
  {/if}
</section>

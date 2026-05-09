<script lang="ts">
  import { FlaskConical, Loader2, Music, Pause, Play, RefreshCw, Repeat, Upload } from '@lucide/svelte';
  import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { detectDrumChannels, parseSmf, rewriteProgramChanges } from '$lib/midi-lab/midi-rewrite';
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
  let mutedSlots = $state<Set<number>>(new Set());
  let loopOn = $state(true);
  let mp3El = $state<HTMLAudioElement | null>(null);
  // Track which song the Sequencer currently has loaded so we don't
  // re-process the MIDI on every override/mute change unnecessarily, and
  // so we know whether the first Play click needs to do the initial load.
  let seqLoadedFor = $state<string | null>(null);

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
    seqLoadedFor = null;
    const ps = presets;
    const merged = buildMappings(loaded.voicegroup, overrides, ps);
    const muted = mutedSlots;
    const resolver = (slot: number, _ch: number) => merged[slot];
    const rewritten = rewriteProgramChanges(
      loaded.midiBytes,
      resolver,
      muted.size > 0 ? (slot) => muted.has(slot) : undefined,
    );
    // Drum kits live at SF2 bank 128 — a value MIDI's 7-bit CC0 can't
    // transmit. Tell the synth which channels should be drum-mode so the
    // program-change selects the kit instead of a melodic preset.
    const drumChannels = detectDrumChannels(loaded.midiBytes, resolver);
    if (synth) {
      for (let ch = 0; ch < 16; ch++) synth.setDrums(ch, drumChannels.has(ch));
    }
    const wasPlaying = isPlaying;
    const id = `${loaded.songId}-${Date.now()}`;
    const loadedP = awaitSongLoaded(seq, id);
    const buf = new ArrayBuffer(rewritten.byteLength);
    new Uint8Array(buf).set(rewritten);
    seq.loadNewSongList([{ binary: buf, fileName: id }]);
    await loadedP;
    seq.loopCount = loopOn ? Number.POSITIVE_INFINITY : 0;
    duration = seq.duration;
    if (restoreTime > 0) seq.currentTime = Math.min(restoreTime, seq.duration);
    seqLoadedFor = loaded.songId;
    if (wasPlaying) {
      seq.play();
      isPlaying = true;
    }
  }

  function toggleLoop(): void {
    loopOn = !loopOn;
    if (seq) seq.loopCount = loopOn ? Number.POSITIVE_INFINITY : 0;
    if (mp3El) mp3El.loop = loopOn;
  }

  async function loadFixture(f: (typeof data.fixtures)[number]): Promise<void> {
    const [midiBuf, incText] = await Promise.all([
      fetch(f.midiUrl).then((r) => r.arrayBuffer()),
      fetch(f.voicegroupUrl).then((r) => r.text()),
    ]);
    await ingest(f.id, f.label, midiBuf, incText, f.mp3Url);
    // Sync the URL so reload + share land on the same fixture without
    // adding history entries on every flip.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('song') !== f.id) {
        url.searchParams.set('song', f.id);
        replaceState(url, page.state);
      }
    }
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
    mutedSlots = new Set();
    overrides = loadOverrides(vgHash);
    warnings = vg.warnings.slice();
    isPlaying = false;
    currentTime = 0;
    duration = 0;
    seqLoadedFor = null;
    // If the engine is already running (because the user has played at
    // least once and is just switching fixtures), reload immediately so
    // the new song is ready to play. Otherwise defer to the first Play
    // click, when we'll have a real user gesture to resume the
    // AudioContext — loading a song while the context is suspended makes
    // the worklet treat it as already-ended and Play silently no-ops.
    if (engineState === 'ready' && ctx?.state === 'running') {
      await loadIntoSequencer();
    }
  }

  async function play(): Promise<void> {
    if (!loaded) return;
    // Lazy engine init on first user gesture. Creating the AudioContext
    // before a click leaves it suspended, and any song loaded into the
    // sequencer while suspended is treated as already-ended — so the
    // first Play would blink to Pause and back to Play with no audio.
    if (engineState !== 'ready') await initEngine();
    if (!ctx || !seq) return;
    if (ctx.state === 'suspended') await ctx.resume();
    if (seqLoadedFor !== loaded.songId) await loadIntoSequencer();
    seq.play();
    isPlaying = true;
  }
  function pause(): void {
    seq?.pause();
    isPlaying = false;
  }
  function togglePlay(): void {
    if (isPlaying) pause();
    else void play();
  }
  function seek(t: number): void {
    if (!seq) return;
    seq.currentTime = t;
    currentTime = t;
  }

  async function toggleSlotMute(slot: number): Promise<void> {
    const next = new Set(mutedSlots);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    mutedSlots = next;
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  async function isolateSlot(slot: number): Promise<void> {
    if (!loaded) return;
    const allOthersMuted =
      mutedSlots.size === loaded.usedSlots.size - 1 && [...loaded.usedSlots].every((s) => s === slot || mutedSlots.has(s));
    if (allOthersMuted) {
      // Toggle off: this slot was already isolated → unmute everything.
      mutedSlots = new Set();
    } else {
      const next = new Set<number>(loaded.usedSlots);
      next.delete(slot);
      mutedSlots = next;
    }
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  async function muteAllSlots(mute: boolean): Promise<void> {
    if (!loaded) return;
    mutedSlots = mute ? new Set(loaded.usedSlots) : new Set();
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
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

  onMount(() => {
    // Auto-load on first visit. Honour ?song=<id> if present, fall back
    // to the first fixture so the page is never empty for new visitors.
    const requested = page.url.searchParams.get('song');
    const target = data.fixtures.find((f) => f.id === requested) ?? data.fixtures[0];
    if (target) void loadFixture(target);
    return () => {
      cancelAnimationFrame(rafId);
      seq?.pause();
      void ctx?.close();
      seq = null;
      synth = null;
      ctx = null;
    };
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

      <!-- ── SYNTH PANEL ─────────────────────────────────────────── -->
      <div
        class="relative rounded-md border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-slate-950/70 to-slate-950/40 p-4 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.06)]"
      >
        <!-- circuit grid overlay -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-md opacity-[0.07] [background-image:linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] [background-size:8px_8px]"
        ></div>
        <!-- viewfinder corner brackets -->
        <span aria-hidden="true" class="absolute size-2 border-emerald-400/60 top-1.5 left-1.5 border-l border-t"></span>
        <span aria-hidden="true" class="absolute size-2 border-emerald-400/60 top-1.5 right-1.5 border-r border-t"></span>
        <span
          aria-hidden="true"
          class="absolute size-2 border-emerald-400/60 bottom-1.5 left-1.5 border-l border-b"
        ></span>
        <span
          aria-hidden="true"
          class="absolute size-2 border-emerald-400/60 bottom-1.5 right-1.5 border-r border-b"
        ></span>

        <!-- header chip -->
        <div class="relative mb-2 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span
              aria-hidden="true"
              class="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.65)] animate-pulse"
            ></span>
            <span class="font-display text-[0.6rem] tracking-[0.25em] text-emerald-300">
              <span class="sr-only">Synth (remapped MIDI)</span>
              <span aria-hidden="true">[ LIVE · MIDI ]</span>
            </span>
          </div>
          <span class="font-display text-[0.5rem] tracking-[0.3em] text-emerald-500/60">
            vg:{loaded.voicegroup.name}
          </span>
        </div>

        <!-- transport -->
        <div class="relative flex items-center gap-3">
          <Button
            onclick={togglePlay}
            disabled={engineState !== 'ready'}
            size="sm"
            variant="outline"
            class="border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10"
          >
            {#if engineState === 'loading'}
              <Loader2 class="size-4 animate-spin" /> loading…
            {:else if isPlaying}
              <Pause class="size-4" /> Pause
            {:else}
              <Play class="size-4" /> Play
            {/if}
          </Button>
          <span
            class="font-display text-[0.6rem] tabular-nums tracking-wider text-white rounded bg-emerald-950/70 border border-emerald-500/30 px-2 py-1 shadow-[inset_0_0_6px_rgba(16,185,129,0.25)] min-w-[3.25rem] text-center"
          >
            {fmtTime(currentTime)}
          </span>
          <input
            type="range"
            class="flex-1 accent-emerald-400"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            oninput={(e) => seek(Number.parseFloat((e.currentTarget as HTMLInputElement).value))}
            disabled={engineState !== 'ready'}
            aria-label="Synth MIDI scrub"
          />
          <span
            class="font-display text-[0.6rem] tabular-nums tracking-wider text-white/80 rounded bg-emerald-950/70 border border-emerald-500/30 px-2 py-1 shadow-[inset_0_0_6px_rgba(16,185,129,0.2)] min-w-[3.25rem] text-center"
          >
            {fmtTime(duration)}
          </span>
          <button
            type="button"
            onclick={toggleLoop}
            class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] flex items-center gap-1 {loopOn
              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
              : 'border-border hover:border-foreground/40'}"
            aria-pressed={loopOn}
            title="Loop"
          >
            <Repeat class="size-3" /> loop
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">Channel mutes</div>
        <div class="flex flex-wrap gap-1.5">
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

      <!-- ── TAPE PANEL ──────────────────────────────────────────── -->
      {#if loaded.mp3Url}
        <div
          class="relative rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-stone-950/60 to-stone-950/40 p-4 shadow-[inset_0_1px_0_rgba(245,158,11,0.15)]"
        >
          <!-- magnetic tape striations -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.08] [background-image:repeating-linear-gradient(0deg,#f59e0b_0_1px,transparent_1px_4px)]"
          ></div>

          <!-- header chip -->
          <div class="relative mb-3 flex items-center justify-between gap-3">
            <span class="font-display text-[0.6rem] tracking-[0.25em] text-amber-300">
              <span class="sr-only">Reference recording (vanilla MP3)</span>
              <span aria-hidden="true">▷ FINAL · MP3 ◁</span>
            </span>
            <span
              class="font-display text-[0.5rem] tracking-[0.3em] text-amber-600/70 rounded border border-amber-500/30 px-1.5 py-0.5"
            >
              side a
            </span>
          </div>

          <!-- transport: reel · audio · reel · loop -->
          <div class="relative flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              class="size-8 shrink-0 text-amber-400/80 animate-[spin_8s_linear_infinite]"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="0.6" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.7" />
              <g stroke="currentColor" stroke-width="0.5" opacity="0.7">
                <line x1="12" y1="3" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="21" />
                <line x1="3" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="21" y2="12" />
                <line x1="5.5" y1="5.5" x2="7.5" y2="7.5" />
                <line x1="16.5" y1="16.5" x2="18.5" y2="18.5" />
                <line x1="18.5" y1="5.5" x2="16.5" y2="7.5" />
                <line x1="7.5" y1="16.5" x2="5.5" y2="18.5" />
              </g>
            </svg>
            {#key loaded.songId}
              <audio
                bind:this={mp3El}
                controls
                preload="none"
                class="flex-1 sepia-[0.25] saturate-[0.85] contrast-[0.95]"
                loop={loopOn}
              >
                <source src={loaded.mp3Url} />
                <track kind="captions" />
              </audio>
            {/key}
            <svg
              viewBox="0 0 24 24"
              class="size-8 shrink-0 text-amber-400/80 animate-[spin_8s_linear_infinite_reverse]"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="0.6" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.7" />
              <g stroke="currentColor" stroke-width="0.5" opacity="0.7">
                <line x1="12" y1="3" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="21" />
                <line x1="3" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="21" y2="12" />
                <line x1="5.5" y1="5.5" x2="7.5" y2="7.5" />
                <line x1="16.5" y1="16.5" x2="18.5" y2="18.5" />
                <line x1="18.5" y1="5.5" x2="16.5" y2="7.5" />
                <line x1="7.5" y1="16.5" x2="5.5" y2="18.5" />
              </g>
            </svg>
            <button
              type="button"
              onclick={toggleLoop}
              class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] flex items-center gap-1 {loopOn
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
                : 'border-border hover:border-foreground/40'}"
              aria-pressed={loopOn}
              title="Loop"
            >
              <Repeat class="size-3" /> loop
            </button>
          </div>
        </div>
      {/if}
    </section>

    <section class="border rounded-lg overflow-hidden">
      <header class="px-4 py-2 border-b flex items-center justify-between gap-3">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">
          Voicegroup → SF2 mapping ({rows.length} slots)
        </div>
        <button
          type="button"
          onclick={() => void muteAllSlots(mutedSlots.size < (loaded?.usedSlots.size ?? 0))}
          disabled={engineState !== 'ready'}
          class="font-mono text-xs px-2 py-1 rounded border hover:border-foreground/40"
        >
          {mutedSlots.size > 0 && loaded && mutedSlots.size >= loaded.usedSlots.size ? 'unmute all' : 'mute all'}
        </button>
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
              {#if overrides[row.slot]}
                <Button variant="ghost" size="sm" onclick={() => void setOverride(row.slot, null)}>
                  <RefreshCw class="size-3" /> auto
                </Button>
              {/if}
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
              <button
                type="button"
                onclick={() => void toggleSlotMute(row.slot)}
                disabled={engineState !== 'ready'}
                class="font-mono text-xs px-2 py-1 rounded border min-w-[3rem] {mutedSlots.has(row.slot)
                  ? 'bg-destructive/20 border-destructive/60 text-destructive line-through'
                  : 'border-border hover:border-foreground/40'}"
                aria-pressed={mutedSlots.has(row.slot)}
                title={mutedSlots.has(row.slot) ? 'Unmute slot' : 'Mute slot'}
              >
                {mutedSlots.has(row.slot) ? 'muted' : 'mute'}
              </button>
              <button
                type="button"
                onclick={() => void isolateSlot(row.slot)}
                disabled={engineState !== 'ready'}
                class="font-mono text-xs px-2 py-1 rounded border min-w-[3.5rem] {!mutedSlots.has(row.slot) &&
                mutedSlots.size > 0 &&
                loaded &&
                mutedSlots.size === loaded.usedSlots.size - 1
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-border hover:border-foreground/40'}"
                title="Solo this slot (mute everything else)"
              >
                solo
              </button>
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

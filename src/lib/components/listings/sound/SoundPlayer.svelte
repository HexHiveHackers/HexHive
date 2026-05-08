<script lang="ts">
  import {
    ArrowDownAZ,
    ArrowDownUp,
    Download,
    FileArchive,
    FileMusic,
    Loader2,
    Music,
    Pause,
    Play,
    Search,
  } from '@lucide/svelte';
  import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { audioMimeType, type FileKind, fileKind } from '$lib/utils/preview';

  // ──── Soundfont ────────────────────────────────────────────────────────
  // Self-hosted on Cloudflare R2 (cdn.hexhive.app). Single ~1 MB
  // download replaces the ~175 small Magenta JSONs html-midi-player
  // would otherwise stream over the network; cached by the browser for
  // the session so subsequent tracks in the same pack play instantly.
  //
  // Currently shipping Braedon Mills' "Pokemon Ruby/Sapphire/Emerald/
  // FireRed/LeafGreen Soundfont" because the samples are GBA-derived
  // (better tonal match for romhack content than a generic GM bank).
  // The author has remapped them onto General MIDI program numbers so
  // any GM-authored MIDI plays with the right instrument families.
  // Note: this is not a faithful 1:1 voicegroup-preserving extraction
  // from any single ROM — see commit message for details. To swap back
  // to a generic GM bank, point SOUNDFONT_URL at
  // https://cdn.hexhive.app/soundfonts/GeneralUser-GS.sf2 (still hosted).
  const SOUNDFONT_URL = 'https://cdn.hexhive.app/soundfonts/Pok_mon_GBA.sf2';
  const SOUNDFONT_LABEL = 'Pokémon GBA';
  // SpessaSynth's AudioWorklet processor; copied to static/ at build
  // time so it lives at the site origin (audioWorklet.addModule needs a
  // same-origin URL). Updated whenever spessasynth_lib bumps.
  const WORKLET_URL = '/spessasynth_processor.min.js';

  type FileRow = {
    id: string;
    originalFilename: string;
    size: number;
  };

  let { files }: { files: FileRow[] } = $props();

  // ──── Toolbar state ────────────────────────────────────────────────────
  type SortKey = 'name' | 'size';
  let sort = $state<SortKey>('name');
  let sortAsc = $state(true);
  let query = $state('');

  // ──── MIDI engine state ────────────────────────────────────────────────
  // One AudioContext + one Synthesizer + one Sequencer for the whole page.
  // The soundbank is loaded once and reused across every track in the
  // pack. Switching tracks just calls loadNewSongList — no soundfont
  // re-download, no AudioContext churn.
  const hasMidi = $derived(files.some((f) => fileKind(f.originalFilename) === 'midi'));
  let engineState = $state<'idle' | 'loading-engine' | 'ready' | 'error'>('idle');
  let activeFileId = $state<string | null>(null);
  let loadingFileId = $state<string | null>(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);

  let ctx: AudioContext | null = null;
  let synth: WorkletSynthesizer | null = null;
  let seq: Sequencer | null = null;
  let rafId = 0;

  // Prewarm caches: the heavy network downloads can start as soon as the
  // user signals intent (hover/focus). Crucially, NEITHER of these
  // touches AudioContext — browsers refuse to resume an AudioContext
  // that wasn't created in a user-gesture handler, so the actual
  // context creation has to wait for the click.
  let sfBytesPromise: Promise<ArrayBuffer> | null = null;
  let libPromise: Promise<typeof import('spessasynth_lib')> | null = null;
  function prewarmEngine(): void {
    if (typeof window === 'undefined') return;
    if (!sfBytesPromise) sfBytesPromise = fetch(SOUNDFONT_URL).then((r) => r.arrayBuffer());
    if (!libPromise) libPromise = import('spessasynth_lib');
  }

  // Must be called inside a click handler (or other user gesture) so
  // the AudioContext is allowed to start. Reuses the prewarmed sf2
  // bytes and library import if they're already in flight or done.
  async function initEngine(): Promise<void> {
    if (engineState === 'ready' || engineState === 'loading-engine') return;
    engineState = 'loading-engine';
    try {
      prewarmEngine();
      const audioCtx = new AudioContext();
      await audioCtx.audioWorklet.addModule(WORKLET_URL);
      const lib = await (libPromise as Promise<typeof import('spessasynth_lib')>);
      const s = new lib.WorkletSynthesizer(audioCtx);
      // WorkletSynthesizer is created floating — nothing routes its
      // audio out by default. Without this connect call the sequencer
      // will happily play (currentTime advances) but the speakers stay
      // silent, which is what you'd see as "playbar moves, no audio".
      s.connect(audioCtx.destination);
      const sf = await (sfBytesPromise as Promise<ArrayBuffer>);
      await s.soundBankManager.addSoundBank(sf, 'main');
      await s.isReady;
      const sq = new lib.Sequencer(s);
      sq.eventHandler.addEvent('songEnded', 'soundplayer-end', () => {
        isPlaying = false;
      });
      ctx = audioCtx;
      synth = s;
      seq = sq;
      engineState = 'ready';
    } catch (err) {
      console.error('MIDI engine init failed', err);
      engineState = 'error';
    }
  }

  // loadNewSongList posts to the worklet asynchronously; calling play()
  // before the song is actually loaded gets ignored ("No songs loaded
  // in the sequencer. Ignoring the play call."). Wait for the songChange
  // event with a one-shot listener before resolving, with a safety
  // timeout in case the event never fires.
  function awaitSongLoaded(s: Sequencer, id: string): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const tag = `soundplayer-load-${id}`;
      const finish = () => {
        if (done) return;
        done = true;
        s.eventHandler.removeEvent('songChange', tag);
        resolve();
      };
      s.eventHandler.addEvent('songChange', tag, finish);
      setTimeout(finish, 5000);
    });
  }

  async function playFile(id: string): Promise<void> {
    // Same track, currently playing → pause toggle.
    if (id === activeFileId && isPlaying) {
      seq?.pause();
      isPlaying = false;
      return;
    }
    // Same track, paused with the song already loaded → resume.
    if (id === activeFileId && !isPlaying && seq && ctx) {
      if (ctx.state === 'suspended') await ctx.resume();
      seq.play();
      isPlaying = true;
      return;
    }
    // New track: lazy-init the engine on first ever play, fetch the
    // .mid bytes, hand them to the sequencer, start playback.
    loadingFileId = id;
    activeFileId = id;
    if (engineState !== 'ready') await initEngine();
    if (engineState !== 'ready' || !seq || !ctx) {
      loadingFileId = null;
      return;
    }
    if (ctx.state === 'suspended') await ctx.resume();
    try {
      const bytes = await fetchMidiBytes(id);
      const loaded = awaitSongLoaded(seq, id);
      seq.loadNewSongList([{ binary: bytes, fileName: id }]);
      await loaded;
    } catch (err) {
      console.error('failed to load MIDI', err);
      loadingFileId = null;
      return;
    }
    duration = seq.duration;
    seq.play();
    isPlaying = true;
    loadingFileId = null;
  }

  // Fetch the .mid bytes with a single retry on transient failure. Turso
  // occasionally 500s in this dev configuration; rather than handing the
  // resulting `{"message":"Internal Error"}` JSON to the synth as if it
  // were MIDI bytes (which crashes deep inside the worklet with
  // "Expected MThd, got '{"me'"), validate status + content-type and
  // retry once before giving up.
  async function fetchMidiBytes(id: string): Promise<ArrayBuffer> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/preview/${id}`, { cache: attempt === 0 ? 'default' : 'reload' });
        if (!res.ok) throw new Error(`preview ${id}: HTTP ${res.status}`);
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('json') || ct.includes('html')) {
          throw new Error(`preview ${id}: unexpected content-type ${ct}`);
        }
        return await res.arrayBuffer();
      } catch (err) {
        lastErr = err;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 250));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('preview fetch failed');
  }

  function pauseActive(): void {
    seq?.pause();
    isPlaying = false;
  }

  function seekActive(t: number): void {
    if (!seq) return;
    seq.currentTime = t;
    currentTime = t;
  }

  function formatTime(t: number): string {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Prefetch the .mid bytes on hover so click-to-play hits warm cache.
  const prefetched = new Set<string>();
  function prefetchMidi(id: string): void {
    if (typeof window === 'undefined' || prefetched.has(id)) return;
    prefetched.add(id);
    fetch(`/api/preview/${id}`).catch(() => {});
  }


  // Drive currentTime via rAF while playing. Stops itself when paused
  // and on component teardown.
  $effect(() => {
    if (!isPlaying) return;
    const tick = (): void => {
      if (seq) currentTime = seq.currentHighResolutionTime;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  // Tear down on component unmount: stop sequencer, close AudioContext,
  // free the soundbank. Critical to silence MIDI when navigating away
  // from the listing page.
  onMount(() => () => {
    cancelAnimationFrame(rafId);
    seq?.pause();
    void ctx?.close();
    seq = null;
    synth = null;
    ctx = null;
  });

  // ──── Derived list ─────────────────────────────────────────────────────
  type Annotated = FileRow & { kind: FileKind; mime: string | null };
  const annotated = $derived<Annotated[]>(
    files.map((f) => ({
      ...f,
      kind: fileKind(f.originalFilename),
      mime: audioMimeType(f.originalFilename),
    })),
  );

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    let arr = q ? annotated.filter((f) => f.originalFilename.toLowerCase().includes(q)) : annotated;
    arr = [...arr].sort((a, b) => {
      const cmp =
        sort === 'name'
          ? a.originalFilename.localeCompare(b.originalFilename, undefined, { numeric: true })
          : a.size - b.size;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  });

  function fmtSize(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  function iconFor(kind: FileKind) {
    if (kind === 'audio') return Music;
    if (kind === 'midi') return FileMusic;
    if (kind === 'archive') return FileArchive;
    return FileMusic;
  }
</script>

<svelte:head>
  {#if hasMidi}
    <!-- Open the TLS handshake to the soundfont CDN ahead of the first
         sf2 fetch. Cuts ~100-200 ms off cold first-play latency. -->
    <link rel="preconnect" href="https://cdn.hexhive.app" crossorigin="anonymous" />
    <link rel="dns-prefetch" href="https://cdn.hexhive.app" />
  {/if}
</svelte:head>

<section class="border rounded-lg p-4 mb-6">
  <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
    <h2 class="text-sm font-medium">
      Tracks
      <span class="text-muted-foreground font-normal">
        ({filtered.length}{filtered.length !== files.length ? ` of ${files.length}` : ''})
      </span>
    </h2>

    <div class="flex items-center gap-2 flex-wrap">
      <div class="relative">
        <Search size={14} class="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter…"
          value={query}
          oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)}
          class="pl-8 h-8 w-48 text-xs"
        />
      </div>
      {#if hasMidi}
        <span class="h-8 inline-flex items-center rounded-md border bg-background px-2 text-[11px] text-muted-foreground">
          {SOUNDFONT_LABEL}
        </span>
      {/if}
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          if (sort === 'name') sortAsc = !sortAsc;
          else {
            sort = 'name';
            sortAsc = true;
          }
        }}
        aria-pressed={sort === 'name'}
      >
        <ArrowDownAZ size={14} />
        Name {sort === 'name' ? (sortAsc ? '↑' : '↓') : ''}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          if (sort === 'size') sortAsc = !sortAsc;
          else {
            sort = 'size';
            sortAsc = true;
          }
        }}
        aria-pressed={sort === 'size'}
      >
        <ArrowDownUp size={14} />
        Size {sort === 'size' ? (sortAsc ? '↑' : '↓') : ''}
      </Button>
    </div>
  </div>

  <ul class="grid gap-3">
    {#each filtered as f (f.id)}
      {@const Icon = iconFor(f.kind)}
      {@const isActive = activeFileId === f.id}
      {@const isLoading = loadingFileId === f.id}
      <li class="rounded-md border p-3">
        <div class="flex items-center justify-between gap-3 mb-2">
          <span class="flex items-center gap-2 min-w-0 text-sm">
            <Icon size={14} class="text-muted-foreground shrink-0" />
            <span class="truncate font-medium">{f.originalFilename}</span>
            <span class="text-xs text-muted-foreground shrink-0">{fmtSize(f.size)}</span>
          </span>
          <a href={`/api/downloads/${f.id}`}>
            <Button size="sm" variant="outline">
              <Download size={12} />
              Download
            </Button>
          </a>
        </div>

        {#if f.kind === 'audio'}
          <audio class="w-full" controls preload="metadata">
            <source src={`/api/preview/${f.id}`} type={f.mime ?? undefined} />
            <track kind="captions" />
            Your browser doesn't support this audio format.
          </audio>
        {:else if f.kind === 'midi'}
          {#if isActive}
            <!-- Custom amber LCD player: same engine, re-rendered per
                 track based on the shared activeFileId so seek and time
                 reflect the currently-loaded MIDI. -->
            <div class="midi-bar" role="region" aria-label="MIDI player">
              <button
                type="button"
                class="midi-play"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onclick={() => (isPlaying ? pauseActive() : playFile(f.id))}
              >
                {#if isLoading}
                  <Loader2 size={14} class="animate-spin" />
                {:else if isPlaying}
                  <Pause size={14} />
                {:else}
                  <Play size={14} />
                {/if}
              </button>
              <span class="midi-time">
                <span class="midi-time-current">{formatTime(currentTime)}</span>
                <span class="midi-time-sep">/</span>
                <span class="midi-time-total">{formatTime(duration)}</span>
              </span>
              <input
                type="range"
                class="midi-seek"
                aria-label="Playback position"
                min="0"
                max={Math.max(duration, 0.001)}
                step="any"
                value={currentTime}
                disabled={!duration || isLoading}
                style={`--midi-progress: ${duration > 0 ? Math.min(1, currentTime / duration) : 0}`}
                oninput={(e) => seekActive(Number((e.currentTarget as HTMLInputElement).value))}
              />
              {#if isLoading}
                <span class="midi-status">
                  {engineState === 'loading-engine' ? 'Loading soundfont…' : 'Loading track…'}
                </span>
              {/if}
            </div>
          {:else}
            <Button
              size="sm"
              variant="outline"
              onclick={() => playFile(f.id)}
              onmouseenter={() => {
                prewarmEngine();
                prefetchMidi(f.id);
              }}
              onfocus={() => {
                prewarmEngine();
                prefetchMidi(f.id);
              }}
            >
              <Play size={12} />
              Play MIDI
            </Button>
          {/if}
        {:else if f.kind === 'archive'}
          <p class="text-xs text-muted-foreground">
            Archive file — download to inspect or play locally.
          </p>
        {:else}
          <p class="text-xs text-muted-foreground">
            No in-browser preview for this file type — download to use locally.
          </p>
        {/if}
      </li>
    {/each}
  </ul>

  {#if filtered.length === 0}
    <p class="text-sm text-muted-foreground text-center py-8">No files match "{query}".</p>
  {/if}

  {#if engineState === 'error'}
    <p class="mt-3 text-xs text-red-400">
      MIDI engine failed to start. Try reloading the page.
    </p>
  {/if}
</section>

<style>
  /* Custom amber-LCD MIDI player. Built on top of native elements (no
   * shadow DOM, no third-party UI) so styling reaches everywhere
   * without ::part() gymnastics, and the look is identical on Chromium
   * and Firefox. Deliberately inherits the dark card surface so it
   * sits on the listing without floating. */
  .midi-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    color: hsl(var(--foreground));
  }
  .midi-play {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgba(251, 191, 36, 0.12);
    color: #fbbf24;
    border: none;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      transform 120ms ease;
  }
  .midi-play:hover {
    background: rgba(251, 191, 36, 0.22);
  }
  .midi-play:active {
    background: rgba(251, 191, 36, 0.32);
    transform: scale(0.96);
  }
  .midi-play:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
  }
  .midi-time {
    flex-shrink: 0;
    font-family: ui-monospace, "SFMono-Regular", "JetBrains Mono", "Menlo", monospace;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    color: hsl(var(--muted-foreground));
    min-width: 5.5rem;
    text-align: center;
  }
  .midi-time-current {
    color: #fbbf24;
  }
  .midi-time-sep {
    margin: 0 0.2em;
    opacity: 0.6;
  }
  .midi-seek {
    flex: 1;
    min-width: 0;
    appearance: none;
    -webkit-appearance: none;
    height: 6px;
    background: transparent;
    cursor: pointer;
  }
  .midi-seek:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  /* Track painted with the played-portion gradient driven by
   * --midi-progress (0..1). Same gradient on both engines so Chromium
   * and Firefox match exactly. */
  .midi-seek::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    border: 1px solid rgba(251, 191, 36, 0.3);
    background: linear-gradient(
      to right,
      #fbbf24 0%,
      #fbbf24 calc(var(--midi-progress, 0) * 100%),
      rgba(251, 191, 36, 0.12) calc(var(--midi-progress, 0) * 100%),
      rgba(251, 191, 36, 0.12) 100%
    );
  }
  .midi-seek::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    border: 1px solid rgba(251, 191, 36, 0.3);
    background: linear-gradient(
      to right,
      #fbbf24 0%,
      #fbbf24 calc(var(--midi-progress, 0) * 100%),
      rgba(251, 191, 36, 0.12) calc(var(--midi-progress, 0) * 100%),
      rgba(251, 191, 36, 0.12) 100%
    );
  }
  .midi-seek::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 50%;
    background: #fbbf24;
    border: 2px solid hsl(var(--background));
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
  }
  .midi-seek::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fbbf24;
    border: 2px solid hsl(var(--background));
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
  }
  .midi-seek:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 2px hsl(var(--background)),
      0 0 0 4px #fbbf24;
  }
  .midi-seek:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 2px hsl(var(--background)),
      0 0 0 4px #fbbf24;
  }
  .midi-status {
    font-size: 11px;
    color: #fbbf24;
    flex-shrink: 0;
  }
</style>

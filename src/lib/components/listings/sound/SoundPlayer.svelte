<script lang="ts">
  import {
    ArrowDownAZ,
    ArrowDownUp,
    Download,
    FileArchive,
    FileMusic,
    Loader2,
    Music,
    Play,
    Search,
  } from '@lucide/svelte';
  import type { MidiPlayerElement } from 'html-midi-player';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { audioMimeType, type FileKind, fileKind } from '$lib/utils/preview';

  // Magenta-hosted soundfonts; we preconnect/prefetch against this origin
  // so the first instrument download isn't gated on a cold TLS handshake.
  const SOUNDFONT_ORIGIN = 'https://storage.googleapis.com';

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

  // ──── Lazy-load html-midi-player only when there's a MIDI file in the
  // pack. The component registers a custom <midi-player> element once
  // imported. Keeps the JS bundle off other pages.
  let midiReady = $state(false);
  const hasMidi = $derived(files.some((f) => fileKind(f.originalFilename) === 'midi'));
  onMount(() => {
    if (!hasMidi) return;
    import('html-midi-player').then(() => {
      midiReady = true;
    });
  });

  // Soundfont selector for MIDI playback. All Magenta-hosted soundfonts
  // implement the General MIDI program table, so any GM-targeting MIDI
  // (the all-instruments-patch convention used by most pret/decomp hacks)
  // sounds reasonable in any of them. The Pokemon-stock-instrument SF2s
  // are not yet hosted; once they are, add their URLs here.
  type Soundfont = { id: string; label: string; url: string };
  const SOUNDFONTS: Soundfont[] = [
    {
      id: 'sgm-plus',
      label: 'General MIDI (sgm_plus)',
      url: 'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus',
    },
    {
      id: 'salamander',
      label: 'Salamander Grand Piano',
      url: 'https://storage.googleapis.com/magentadata/js/soundfonts/salamander',
    },
    {
      id: 'jazz',
      label: 'Jazz combo',
      url: 'https://storage.googleapis.com/magentadata/js/soundfonts/jazz',
    },
  ];
  let soundfont = $state<Soundfont>(SOUNDFONTS[0]);

  // Only one MIDI player exists at a time. Each <midi-player> mount loads
  // the full ~30 MB soundfont and spins up its own AudioContext, so
  // mounting one per file in a 30-track pack would push browser memory
  // past 1 GB and crash the tab. The user clicks Play on a track to
  // mount the player for that file; clicking another track stops the
  // current player, lets it unmount, and mounts a fresh one for the new
  // file. (The element's disconnectedCallback doesn't suspend its own
  // AudioContext, so we have to call .stop() ourselves before swapping.)
  let activeFileId = $state<string | null>(null);
  let activePlayerEl = $state<MidiPlayerElement | null>(null);
  // Tracks "user has clicked Play but the player isn't audibly going yet"
  // so the button can show a spinner instead of vanishing into the
  // not-yet-ready player chrome (closes the perceptual gap during the
  // first-soundfont-fetch window).
  let loadingFileId = $state<string | null>(null);

  // One-shot flag: prewarm the GM soundfont manifests on the first user
  // interaction with any track. Doing it on page load would burn data for
  // visitors who never play; doing it once per click would re-fetch
  // (cached, but still wasteful in dev tools / SW pass-through scenarios).
  let soundfontPrewarmed = false;
  function prewarmSoundfont(url: string): void {
    if (soundfontPrewarmed || typeof window === 'undefined') return;
    soundfontPrewarmed = true;
    // Manifest of the active soundfont; the per-instrument JSONs cascade
    // from this once the player needs them. Best-effort.
    fetch(`${url}/soundfont.json`).catch(() => {});
  }

  function playFile(id: string): void {
    if (id === activeFileId) return;
    activePlayerEl?.stop();
    activeFileId = id;
    loadingFileId = id;
    prewarmSoundfont(soundfont.url);
  }

  // Prefetch the .mid bytes on hover/focus of the Play button so that by
  // the time the user actually clicks, the file is already in the browser
  // HTTP cache and the player's own GET hits warm. Best-effort: a stale
  // presigned URL after 10 minutes just means the prefetch was wasted.
  const prefetched = new Set<string>();
  function prefetchMidi(id: string): void {
    if (typeof window === 'undefined' || prefetched.has(id)) return;
    prefetched.add(id);
    fetch(`/api/preview/${id}`).catch(() => {});
  }

  // Auto-start the player as soon as the freshly-mounted element finishes
  // loading the MIDI. Without this the user has to click Play twice (once
  // to mount, once on the player). The 'load' event fires when the
  // NoteSequence is parsed; if duration is already populated the load
  // happened in the same tick and we just call start() directly. Once
  // started we clear the loading-button state so the spinner gives way
  // to the playing player chrome.
  $effect(() => {
    const el = activePlayerEl;
    if (!el) return;
    const ready = (): void => {
      el.start();
      loadingFileId = null;
    };
    if (el.duration > 0) {
      ready();
      return;
    }
    el.addEventListener('load', ready);
    return () => el.removeEventListener('load', ready);
  });

  // Drive the seek-track fill via a CSS custom property so the played
  // portion renders identically on Chromium and Firefox. Native range
  // inputs only expose progress fill on Firefox (::-moz-range-progress)
  // and not on Chromium, so we paint a linear-gradient on the track
  // pseudo-element using --midi-progress (0..1) and update it from
  // currentTime / duration via rAF while the player exists.
  $effect(() => {
    const el = activePlayerEl;
    if (!el) return;
    let rafId = 0;
    const tick = () => {
      if (el.duration > 0) {
        const p = Math.min(1, Math.max(0, el.currentTime / el.duration));
        el.style.setProperty('--midi-progress', p.toString());
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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
         instrument fetch. Cuts ~100-200 ms off the initial play latency. -->
    <link rel="preconnect" href={SOUNDFONT_ORIGIN} crossorigin="anonymous" />
    <link rel="dns-prefetch" href={SOUNDFONT_ORIGIN} />
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
        <select
          aria-label="MIDI soundfont"
          class="h-8 rounded-md border bg-background px-2 text-xs"
          value={soundfont.id}
          onchange={(e) => {
            const next = SOUNDFONTS.find((s) => s.id === (e.currentTarget as HTMLSelectElement).value);
            if (next) soundfont = next;
          }}
        >
          {#each SOUNDFONTS as s (s.id)}
            <option value={s.id}>{s.label}</option>
          {/each}
        </select>
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
          {#if !midiReady}
            <p class="text-xs text-muted-foreground">Loading MIDI player…</p>
          {:else if activeFileId === f.id}
            <!-- Single mounted player (don't tear down for the loading
                 caption — that would re-trigger the whole soundfont
                 fetch). The caption renders above the player chrome
                 while loadingFileId still equals this file id. -->
            {#if loadingFileId === f.id}
              <div class="mb-2 flex items-center gap-2 text-[11px] text-amber-400">
                <Loader2 size={12} class="animate-spin" />
                Warming up… fetching soundfont samples for first playback
              </div>
            {/if}
            <midi-player
              bind:this={activePlayerEl}
              src={`/api/preview/${f.id}`}
              sound-font={soundfont.url}
              style="width: 100%;"
            ></midi-player>
          {:else}
            <Button
              size="sm"
              variant="outline"
              onclick={() => playFile(f.id)}
              onmouseenter={() => prefetchMidi(f.id)}
              onfocus={() => prefetchMidi(f.id)}
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
</section>

<style>
  /* MIDI player dark-mode skin.
   *
   * html-midi-player ships a light-grey pill (#f2f5f6) that looks like a
   * scar on the dark hive page. Re-skin it to feel like a recessed
   * amber-glow LCD that nods to the GBA sound provenance: muted card
   * surface, hairline border, monospace tabular-nums clock, amber play
   * button and progress thumb. Reaches into the shadow DOM via the
   * ::part() hooks the package documents.
   */
  :global(midi-player) {
    width: 100%;
  }
  :global(midi-player::part(control-panel)) {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    padding: 0 0.625rem;
    color: hsl(var(--foreground));
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      sans-serif;
  }
  :global(midi-player::part(play-button)) {
    color: #fbbf24; /* amber-400 */
    background: rgba(251, 191, 36, 0.08);
    border-radius: 9999px;
    transition:
      background-color 160ms ease,
      transform 120ms ease;
  }
  :global(midi-player::part(play-button):hover) {
    background: rgba(251, 191, 36, 0.18);
  }
  :global(midi-player::part(play-button):active) {
    background: rgba(251, 191, 36, 0.28);
    transform: scale(0.96);
  }
  :global(midi-player::part(time)) {
    color: hsl(var(--muted-foreground));
    font-family: ui-monospace, "SFMono-Regular", "JetBrains Mono", "Menlo", monospace;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }
  :global(midi-player::part(current-time)) {
    color: #fbbf24;
  }
  :global(midi-player::part(seek-bar)) {
    appearance: none;
    -webkit-appearance: none;
    height: 6px;
    background: transparent;
  }
  /* Track: amber wash on the unplayed portion, solid amber on the played
   * portion, separated by --midi-progress (0..1). Set on the host element
   * by an effect that ticks currentTime/duration via rAF; cascades into
   * the shadow DOM through normal CSS variable inheritance.
   *
   * The same gradient is duplicated on the moz pseudo so Firefox renders
   * identically to Chromium. We deliberately do NOT use
   * ::-moz-range-progress (Firefox-only) because that would double-fill
   * on top of the gradient. */
  :global(midi-player::part(seek-bar))::-webkit-slider-runnable-track {
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
  :global(midi-player::part(seek-bar))::-moz-range-track {
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
  :global(midi-player::part(seek-bar))::-webkit-slider-thumb {
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
  :global(midi-player::part(seek-bar))::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fbbf24;
    border: 2px solid hsl(var(--background));
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
  }
  :global(midi-player::part(seek-bar):focus-visible) {
    outline: none;
  }
  :global(midi-player::part(seek-bar):focus-visible)::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px #fbbf24;
  }
  :global(midi-player::part(seek-bar):focus-visible)::-moz-range-thumb {
    box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px #fbbf24;
  }
  :global(midi-player::part(loading-overlay)) {
    background: linear-gradient(
      110deg,
      rgba(251, 191, 36, 0) 5%,
      rgba(251, 191, 36, 0.18) 25%,
      rgba(251, 191, 36, 0) 45%
    );
  }
</style>

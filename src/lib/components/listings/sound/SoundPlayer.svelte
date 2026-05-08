<script lang="ts">
  import { ArrowDownAZ, ArrowDownUp, Download, FileArchive, FileMusic, Music, Play, Search } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { audioMimeType, type FileKind, fileKind } from '$lib/utils/preview';

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
  // mount the player for that file; clicking another track re-points the
  // single instance instead of stacking another one.
  let activeFileId = $state<string | null>(null);

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
            <midi-player
              src={`/api/preview/${f.id}`}
              sound-font={soundfont.url}
              style="width: 100%;"
            ></midi-player>
          {:else}
            <Button
              size="sm"
              variant="outline"
              onclick={() => (activeFileId = f.id)}
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

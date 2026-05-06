<script lang="ts">
  import { ArrowDownAZ, ArrowDownUp, Download, FileArchive, Search } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { fileKind } from '$lib/utils/preview';
  import SpriteLightbox from './SpriteLightbox.svelte';

  type FileRow = {
    id: string;
    originalFilename: string;
    size: number;
  };

  let { files }: { files: FileRow[] } = $props();

  // ──── Toolbar state ────────────────────────────────────────────────────
  type Bg = 'checker' | 'dark' | 'light' | 'magenta';
  type Tile = 1 | 2 | 3 | 4;
  type SortKey = 'name' | 'size';

  const BG_OPTIONS: Bg[] = ['checker', 'dark', 'light', 'magenta'];
  const TILE_OPTIONS: Tile[] = [1, 2, 3, 4];

  let bg = $state<Bg>('checker');
  let tile = $state<Tile>(2);
  let sort = $state<SortKey>('name');
  let sortAsc = $state(true);
  let query = $state('');
  let lightboxIndex = $state<number | null>(null);

  // ──── Derived collections ──────────────────────────────────────────────
  const imageFiles = $derived(files.filter((f) => fileKind(f.originalFilename) === 'image'));
  const otherFiles = $derived(files.filter((f) => fileKind(f.originalFilename) !== 'image'));

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    let arr = q ? imageFiles.filter((f) => f.originalFilename.toLowerCase().includes(q)) : imageFiles;
    arr = [...arr].sort((a, b) => {
      const cmp =
        sort === 'name'
          ? a.originalFilename.localeCompare(b.originalFilename, undefined, { numeric: true })
          : a.size - b.size;
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  });

  // ──── Layout maths ─────────────────────────────────────────────────────
  // Tile size step: each step doubles the floor of the grid item width.
  const tileClass = $derived(
    {
      1: 'grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
      2: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
      3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
      4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    }[tile],
  );

  const bgClass = $derived(
    {
      checker: 'bg-checker',
      dark: 'bg-black',
      light: 'bg-white',
      magenta: 'bg-fuchsia-500',
    }[bg],
  );

  // ──── Lightbox controls ────────────────────────────────────────────────
  function openLightbox(i: number) {
    lightboxIndex = i;
  }
  function closeLightbox() {
    lightboxIndex = null;
  }
  function navLightbox(d: number) {
    if (lightboxIndex === null) return;
    const next = (lightboxIndex + d + filtered.length) % filtered.length;
    lightboxIndex = next;
  }

  function fmtSize(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

{#if imageFiles.length > 0}
  <section class="border rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
      <h2 class="text-sm font-medium">
        Gallery
        <span class="text-muted-foreground font-normal">
          ({filtered.length}{filtered.length !== imageFiles.length ? ` of ${imageFiles.length}` : ''})
        </span>
      </h2>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Search within pack -->
        <div class="relative">
          <Search size={14} class="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter…"
            value={query}
            oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)}
            class="pl-8 h-8 w-48 text-xs"
          />
        </div>

        <!-- Background swatch toggle -->
        <div class="flex items-center gap-1" aria-label="Background">
          {#each BG_OPTIONS as b}
            <button
              type="button"
              aria-label={`Background ${b}`}
              aria-pressed={bg === b}
              onclick={() => (bg = b)}
              class="size-6 rounded-md border transition-all
                {bg === b ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'}
                {b === 'checker' ? 'bg-checker' : b === 'dark' ? 'bg-black' : b === 'light' ? 'bg-white' : 'bg-fuchsia-500'}"
            ></button>
          {/each}
        </div>

        <!-- Tile size -->
        <div class="flex items-center gap-1">
          {#each TILE_OPTIONS as t}
            <button
              type="button"
              aria-label={`Tile size ${t}`}
              aria-pressed={tile === t}
              onclick={() => (tile = t)}
              class="h-7 w-7 text-xs rounded-md border transition-colors
                {tile === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
            >
              {t}
            </button>
          {/each}
        </div>

        <!-- Sort -->
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

    <!-- Grid -->
    <div class="grid gap-2 {tileClass}">
      {#each filtered as f, i (f.id)}
        <button
          type="button"
          class="group relative flex flex-col items-center justify-end overflow-hidden rounded-md border transition-all hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary outline-none"
          onclick={() => openLightbox(i)}
          aria-label={`View ${f.originalFilename}`}
        >
          <div class="aspect-square w-full {bgClass} flex items-center justify-center">
            <img
              src={`/api/preview/${f.id}`}
              alt={f.originalFilename}
              loading="lazy"
              decoding="async"
              class="pixelated max-h-full max-w-full"
            />
          </div>
          <span
            class="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {f.originalFilename.split('/').pop()}
          </span>
        </button>
      {/each}
    </div>

    {#if filtered.length === 0}
      <p class="text-sm text-muted-foreground text-center py-8">No images match "{query}".</p>
    {/if}
  </section>
{/if}

{#if otherFiles.length > 0}
  <section class="border rounded-lg p-4 mb-6">
    <h2 class="text-sm font-medium mb-3">
      Other files
      <span class="text-muted-foreground font-normal">({otherFiles.length})</span>
    </h2>
    <ul class="grid gap-2">
      {#each otherFiles as f (f.id)}
        <li class="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2">
          <span class="flex items-center gap-2 min-w-0">
            <FileArchive size={14} class="text-muted-foreground shrink-0" />
            <span class="truncate">{f.originalFilename}</span>
            <span class="text-xs text-muted-foreground shrink-0">{fmtSize(f.size)}</span>
          </span>
          <a href={`/api/downloads/${f.id}`}>
            <Button size="sm" variant="outline">
              <Download size={12} />
              Download
            </Button>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if lightboxIndex !== null}
  <SpriteLightbox
    files={filtered}
    index={lightboxIndex}
    {bg}
    onClose={closeLightbox}
    onNav={navLightbox}
  />
{/if}

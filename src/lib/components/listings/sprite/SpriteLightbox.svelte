<script lang="ts">
  import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { Button } from '$lib/components/ui/button';

  type FileRow = { id: string; originalFilename: string; size: number };

  let {
    files,
    index,
    bg,
    onClose,
    onNav,
  }: {
    files: FileRow[];
    index: number;
    bg: 'checker' | 'dark' | 'light' | 'magenta';
    onClose: () => void;
    onNav: (delta: number) => void;
  } = $props();

  // Lightbox-local controls
  type Bg = 'checker' | 'dark' | 'light' | 'magenta';
  const BG_OPTIONS: Bg[] = ['checker', 'dark', 'light', 'magenta'];

  let localBg = $state<Bg>(untrack(() => bg));
  let zoom = $state(1);
  let imgEl = $state<HTMLImageElement | null>(null);
  let stageEl = $state<HTMLElement | null>(null);
  let naturalW = $state(0);
  let naturalH = $state(0);
  // Hide the image until onLoad has computed the auto-zoom, so we don't
  // see it flash at scale(1) and animate up to its target size.
  let ready = $state(false);
  // Transitions are deliberately delayed one paint past `ready` so the
  // first frame with the auto-zoomed scale lands without animation; only
  // subsequent user-driven zoom changes animate.
  let animate = $state(false);

  // Reset readiness whenever we navigate to a different file.
  $effect(() => {
    void index;
    ready = false;
    animate = false;
    naturalW = 0;
    naturalH = 0;
  });

  const file = $derived(files[index]);
  const bgClass = $derived(
    {
      checker: 'bg-checker',
      dark: 'bg-black',
      light: 'bg-white',
      magenta: 'bg-fuchsia-500',
    }[localBg],
  );

  // Pick a starting zoom that fills most of the stage. For pixel art,
  // displaying at 1× is almost always too small to be useful; this targets
  // ~85% of stage width or height (whichever fits), capped at 16× so we
  // don't over-zoom enormous sprites and rounded down to integer powers of
  // 2 (1, 2, 4, 8, 16) so pixels remain perfectly aligned.
  function autoZoom(): number {
    if (!stageEl || naturalW === 0 || naturalH === 0) return 1;
    const sw = stageEl.clientWidth;
    const sh = stageEl.clientHeight;
    if (sw === 0 || sh === 0) return 1;
    const fit = Math.min((sw * 0.85) / naturalW, (sh * 0.85) / naturalH);
    if (fit <= 1) return Math.max(0.25, fit);
    // Snap to integer power of two so pixels stay crisp on the grid.
    const power = Math.floor(Math.log2(fit));
    return Math.min(16, 2 ** power);
  }

  function fitZoom() {
    zoom = autoZoom();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowLeft') onNav(-1);
    else if (e.key === 'ArrowRight') onNav(1);
    else if (e.key === '+' || e.key === '=') zoom = Math.min(zoom * 1.5, 32);
    else if (e.key === '-' || e.key === '_') zoom = Math.max(zoom / 1.5, 0.25);
    else if (e.key === '0') fitZoom();
  }

  function onLoad() {
    if (imgEl) {
      naturalW = imgEl.naturalWidth;
      naturalH = imgEl.naturalHeight;
    }
    // Auto-zoom when (re)loading. Pixel-art sprites are typically tiny;
    // showing them at 1× wastes the lightbox.
    zoom = autoZoom();
    ready = true;
    // Wait two animation frames before enabling the transition: one for
    // Svelte to commit the visibility/scale update, one for the browser
    // to paint it. Only then turn on `transition-transform`.
    requestAnimationFrame(() => requestAnimationFrame(() => (animate = true)));
  }

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoom = Math.max(0.25, Math.min(32, zoom * factor));
  }
</script>

<svelte:window onkeydown={handleKey} />

<div
  class="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
  role="dialog"
  aria-modal="true"
  aria-label="Image preview"
>
  <!-- Toolbar -->
  <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs text-white">
    <div class="flex items-center gap-2 min-w-0">
      <span class="font-medium truncate">{file?.originalFilename ?? ''}</span>
      {#if naturalW && naturalH}
        <span class="text-white/60 shrink-0">{naturalW} × {naturalH}</span>
      {/if}
      <span class="text-white/60 shrink-0">· {index + 1} / {files.length}</span>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <!-- Background swatches -->
      <div class="flex items-center gap-1">
        {#each BG_OPTIONS as b}
          <button
            type="button"
            aria-label={`Background ${b}`}
            aria-pressed={localBg === b}
            onclick={() => (localBg = b)}
            class="size-5 rounded border border-white/20 transition-all
              {localBg === b ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/50'}
              {b === 'checker' ? 'bg-checker' : b === 'dark' ? 'bg-black' : b === 'light' ? 'bg-white' : 'bg-fuchsia-500'}"
          ></button>
        {/each}
      </div>

      <!-- Zoom controls -->
      <Button size="icon-sm" variant="ghost" aria-label="Zoom out" onclick={() => (zoom = Math.max(zoom / 1.5, 0.25))}>
        <ZoomOut size={14} />
      </Button>
      <span class="tabular-nums w-12 text-center text-white/80">{Math.round(zoom * 100)}%</span>
      <Button size="icon-sm" variant="ghost" aria-label="Zoom in" onclick={() => (zoom = Math.min(zoom * 1.5, 32))}>
        <ZoomIn size={14} />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Reset zoom" onclick={fitZoom}>
        {#if zoom > 1}
          <Minimize2 size={14} />
        {:else}
          <Maximize2 size={14} />
        {/if}
      </Button>

      <a href={`/api/downloads/${file?.id ?? ''}`}>
        <Button size="sm" variant="outline">
          <Download size={12} />
          Download
        </Button>
      </a>
      <Button size="icon-sm" variant="ghost" aria-label="Close" onclick={onClose}>
        <X size={16} />
      </Button>
    </div>
  </div>

  <!-- Image stage -->
  <div
    bind:this={stageEl}
    class="flex-1 flex items-center justify-center overflow-auto {bgClass} relative"
    role="presentation"
    onwheel={onWheel}
  >
    {#if files.length > 1}
      <button
        type="button"
        class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm"
        aria-label="Previous"
        onclick={() => onNav(-1)}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm"
        aria-label="Next"
        onclick={() => onNav(1)}
      >
        <ChevronRight size={20} />
      </button>
    {/if}

    {#if file}
      <img
        bind:this={imgEl}
        src={`/api/preview/${file.id}`}
        alt={file.originalFilename}
        onload={onLoad}
        class="pixelated max-w-none max-h-none {animate ? 'transition-transform' : ''}"
        style="transform: scale({zoom}); transform-origin: center; visibility: {ready ? 'visible' : 'hidden'};"
      />
    {/if}
  </div>

  <!-- Hint footer -->
  <div class="border-t border-white/10 px-4 py-2 text-[10px] text-white/50 text-center">
    ← / → navigate · + / − or Ctrl+wheel to zoom · 0 reset · Esc close
  </div>
</div>

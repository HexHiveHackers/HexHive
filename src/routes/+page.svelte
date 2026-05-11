<script lang="ts">
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import TypeIcon from '$lib/components/listings/TypeIcon.svelte';

  let { data } = $props();
</script>

<section class="relative overflow-hidden border-b">
  <div class="absolute inset-0 pointer-events-none opacity-[0.06]"
       style="background-image: repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 3px);"></div>
  <div class="mx-auto max-w-6xl px-4 py-20 relative">
    <h1 class="font-display text-3xl md:text-5xl leading-tight">HEXHIVE</h1>
    <p class="mt-4 max-w-xl text-muted-foreground">
      Share and discover Pokemon ROM hack assets — full hacks, sprites, sounds, and scripts.
    </p>
    <div class="mt-6 flex gap-2 flex-wrap">
      <TypeBadge type="sprite" />
      <TypeBadge type="sound" />
      <TypeBadge type="script" />
      <TypeBadge type="romhack" />
    </div>
  </div>
</section>

<section class="mx-auto max-w-6xl px-4 py-12 grid gap-12">
  <!-- Sprites -->
  <div>
    <div class="flex items-end justify-between mb-4">
      <h2 class="font-display text-xl flex items-center gap-2 text-white">
        <TypeIcon type="sprite" size={20} class="text-rose-400" /> Sprites
      </h2>
      <a href="/sprites" class="text-sm underline">Browse all</a>
    </div>
    {#if data.sprites.length === 0}
      <p class="text-sm text-muted-foreground">Nothing yet.</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.sprites as item}
          <AssetHiveCard {item} type="sprite" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Sounds -->
  <div>
    <div class="flex items-end justify-between mb-4">
      <h2 class="font-display text-xl flex items-center gap-2 text-white">
        <TypeIcon type="sound" size={20} class="text-amber-500" /> Sounds
      </h2>
      <a href="/sounds" class="text-sm underline">Browse all</a>
    </div>
    {#if data.sounds.length === 0}
      <p class="text-sm text-muted-foreground">Nothing yet.</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.sounds as item}
          <AssetHiveCard {item} type="sound" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Scripts -->
  <div>
    <div class="flex items-end justify-between mb-4">
      <h2 class="font-display text-xl flex items-center gap-2 text-white">
        <TypeIcon type="script" size={20} class="text-emerald-500" /> Scripts
      </h2>
      <a href="/scripts" class="text-sm underline">Browse all</a>
    </div>
    {#if data.scripts.length === 0}
      <p class="text-sm text-muted-foreground">Nothing yet.</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.scripts as item}
          <AssetHiveCard {item} type="script" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Tools -->
  <div>
    <div class="flex items-end justify-between mb-4">
      <h2 class="font-display text-xl flex items-center gap-2 text-white">
        <TypeIcon type="tool" size={20} class="text-sky-400" /> Tools
      </h2>
      <a href="/tools" class="text-sm underline">Browse all</a>
    </div>
    {#if data.tools.length === 0}
      <p class="text-sm text-muted-foreground">Nothing yet.</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.tools as tool (tool.slug)}
          <a
            href="/tools/{tool.slug}"
            class="flex flex-col h-full border rounded-lg bg-card hover:bg-accent/40 transition-colors p-4"
          >
            <div class="font-medium line-clamp-2">{tool.name}</div>
            <p class="mt-2 text-sm text-muted-foreground line-clamp-3 min-h-[3lh]">{tool.tagline}</p>
            <div class="mt-auto pt-3 text-xs text-muted-foreground">by {tool.author}</div>
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Romhacks -->
  <div>
    <div class="flex items-end justify-between mb-4">
      <h2 class="font-display text-xl flex items-center gap-2 text-white">
        <TypeIcon type="romhack" size={20} class="text-violet-400" /> Romhacks
      </h2>
      <a href="/romhacks" class="text-sm underline">Browse all</a>
    </div>
    {#if data.romhacks.length === 0}
      <p class="text-sm text-muted-foreground">Nothing yet.</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.romhacks as item}
          <RomhackCard {item} />
        {/each}
      </div>
    {/if}
  </div>
</section>

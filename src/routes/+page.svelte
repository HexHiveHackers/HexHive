<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';

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
    <div class="mt-6 flex gap-2">
      <TypeBadge type="romhack" />
      <TypeBadge type="sprite" />
      <TypeBadge type="sound" />
      <TypeBadge type="script" />
    </div>
  </div>
</section>

<section class="mx-auto max-w-6xl px-4 py-12">
  <div class="flex items-end justify-between mb-4">
    <h2 class="font-display text-xl">Recent romhacks</h2>
    <a href="/romhacks" class="text-sm underline">Browse all</a>
  </div>
  {#if data.recent.length === 0}
    <p class="text-sm text-muted-foreground">No listings yet. Sign in and upload the first one.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.recent as item}
        <RomhackCard {item} />
      {/each}
    </div>
  {/if}
</section>

<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
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
  <p class="text-sm text-muted-foreground">No listings yet. Sign in and upload the first one.</p>
</section>

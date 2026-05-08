<script lang="ts">
  import { Upload } from '@lucide/svelte';
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  import MatureFilterToggle from '$lib/components/listings/MatureFilterToggle.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6 gap-3 flex-wrap">
    <h1 class="font-display text-2xl">Sounds</h1>
    <div class="flex items-center gap-3">
      <a href="/sounds/midi-lab" class="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        MIDI lab (beta)
      </a>
      <a href="/upload?type=sound"><Button><Upload size={14} />Upload</Button></a>
    </div>
  </header>
  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={data.filters.q ?? ''} />
    <MatureFilterToggle showing={data.filters.mature} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>
  {#if data.items.length === 0}
    <p class="text-sm text-muted-foreground">No sounds yet.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.items as item (item.id)}
        <AssetHiveCard {item} type="sound" />
      {/each}
    </div>
  {/if}
</section>

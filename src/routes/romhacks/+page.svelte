<script lang="ts">
  import { Upload } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import MatureFilterToggle from '$lib/components/listings/MatureFilterToggle.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';

  let { data } = $props();
  // One-time seed of the filter form from URL-derived data.
  let q = $state(untrack(() => data.filters.q ?? ''));
  let baseRom = $state(untrack(() => data.filters.baseRom ?? ''));
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Romhacks</h1>
    <a href="/upload?type=romhack"><Button><Upload size={14} />Upload</Button></a>
  </header>

  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={q} oninput={(e) => (q = e.currentTarget.value)} />
    <select
      name="baseRom"
      bind:value={baseRom}
      class="border rounded-md px-3 py-2 bg-background text-sm"
    >
      <option value="">Any base ROM</option>
      {#each SUPPORTED_BASE_ROM as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <MatureFilterToggle showing={data.filters.mature} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>

  {#if data.items.length === 0}
    <p class="text-sm text-muted-foreground">No romhacks match your filters yet.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.items as item (item.id)}
        <RomhackCard {item} />
      {/each}
    </div>
  {/if}
</section>

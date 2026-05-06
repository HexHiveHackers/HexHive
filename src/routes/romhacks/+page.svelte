<script lang="ts">
  import ListingsGrid from '$lib/components/listings/ListingsGrid.svelte';
  import MatureFilterToggle from '$lib/components/listings/MatureFilterToggle.svelte';
  import RomhackCard from '$lib/components/listings/RomhackCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';
  import type { RomhackListItem } from '$lib/server/listings';

  let { data } = $props();
  let q = $state(data.filters.q ?? '');
  let baseRom = $state(data.filters.baseRom ?? '');
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Romhacks</h1>
    <a href="/upload?type=romhack"><Button>Upload</Button></a>
  </header>

  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={q} oninput={(e) => (q = e.currentTarget.value)} />
    <select name="baseRom" bind:value={baseRom}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      <option value="">Any base ROM</option>
      {#each SUPPORTED_BASE_ROM as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <MatureFilterToggle showing={data.filters.mature} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>

  {#snippet card(it: RomhackListItem)}
    <RomhackCard item={it} />
  {/snippet}

  <ListingsGrid items={data.items} item={card}>
    {#snippet empty()}
      <p class="text-sm text-muted-foreground">No romhacks match your filters yet.</p>
    {/snippet}
  </ListingsGrid>
</section>

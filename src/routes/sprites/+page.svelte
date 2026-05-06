<script lang="ts">
  import type { AssetHiveListItem } from '$lib/server/listings';
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  import ListingsGrid from '$lib/components/listings/ListingsGrid.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  let { data } = $props();
</script>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Sprites</h1>
    <a href="/upload/sprite"><Button>Upload</Button></a>
  </header>
  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={data.filters.q ?? ''} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>
  {#snippet card(it: AssetHiveListItem)}
    <AssetHiveCard item={it} type="sprite" />
  {/snippet}
  <ListingsGrid items={data.items} item={card}>
    {#snippet empty()}<p class="text-sm text-muted-foreground">No sprites yet.</p>{/snippet}
  </ListingsGrid>
</section>

<script lang="ts">
  import { Upload } from '@lucide/svelte';
  import { page } from '$app/state';
  import AssetHiveCard from '$lib/components/listings/AssetHiveCard.svelte';
  import MatureFilterToggle from '$lib/components/listings/MatureFilterToggle.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
  const ogImage = `${page.url.origin}/og-sprites.jpg`;
</script>

<svelte:head>
  <title>Sprites · HexHive</title>
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10">
  <header class="flex items-end justify-between mb-6">
    <h1 class="font-display text-2xl">Sprites</h1>
    <a href="/upload?type=sprite"><Button><Upload size={14} />Upload</Button></a>
  </header>
  <form method="get" class="grid gap-3 sm:grid-cols-[1fr_auto_auto] mb-6">
    <Input name="q" placeholder="Search title…" value={data.filters.q ?? ''} />
    <MatureFilterToggle showing={data.filters.mature} />
    <Button type="submit" variant="outline">Filter</Button>
  </form>
  {#if data.items.length === 0}
    <p class="text-sm text-muted-foreground">No sprites yet.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.items as item (item.id)}
        <AssetHiveCard {item} type="sprite" />
      {/each}
    </div>
  {/if}
</section>

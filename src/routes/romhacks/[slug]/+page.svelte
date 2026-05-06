<script lang="ts">
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  const { listing, meta, files, authorName } = data.detail;
</script>

<article class="mx-auto max-w-4xl px-4 py-10">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="romhack" />
      <span>by {authorName}</span>
      <span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    <p class="mt-3 text-muted-foreground whitespace-pre-line">{listing.description}</p>
  </header>

  <section class="grid sm:grid-cols-2 gap-4 mb-8">
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Base ROM</h2>
      <div class="flex flex-wrap gap-1">
        <Badge>{meta.baseRom}</Badge>
        <Badge variant="outline">{meta.baseRomVersion}</Badge>
        <Badge variant="outline">{meta.baseRomRegion}</Badge>
      </div>
    </div>
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Release</h2>
      <Badge variant="secondary">v{meta.release}</Badge>
    </div>
    {#if meta.categories.length}
      <div class="border rounded-lg p-4 sm:col-span-2">
        <h2 class="text-sm font-medium mb-2">Categories</h2>
        <div class="flex flex-wrap gap-1">
          {#each meta.categories as c}<Badge variant="outline">{c}</Badge>{/each}
        </div>
      </div>
    {/if}
  </section>

  <section class="border rounded-lg p-4">
    <h2 class="text-sm font-medium mb-3">Files</h2>
    <ul class="grid gap-2">
      {#each files as f}
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate">{f.originalFilename}</span>
          <a href={`/api/downloads/${f.id}`}>
            <Button size="sm">Download</Button>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</article>

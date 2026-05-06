<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
  const route = (t: string) => (t === 'romhack' ? 'romhacks' : `${t}s`);

  function pageHref(nextOffset: number) {
    const params = new URLSearchParams();
    if (data.q) params.set('q', data.q);
    if (data.type) params.set('type', data.type);
    if (nextOffset > 0) params.set('offset', String(nextOffset));
    return `/search?${params.toString()}`;
  }

  function facetHref(t: string) {
    const params = new URLSearchParams();
    if (data.q) params.set('q', data.q);
    params.set('type', t);
    return `/search?${params.toString()}`;
  }

  const totalFromFacets = $derived(
    data.facets
      ? data.facets.romhack + data.facets.sprite + data.facets.sound + data.facets.script
      : 0
  );

  const showPrev = $derived(data.offset > 0);
  const showNext = $derived(data.hits.length === data.limit);
</script>

<section class="mx-auto max-w-3xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Search</h1>

  <form method="get" class="flex gap-2 mb-6">
    <Input name="q" value={data.q} placeholder="Search title, description, tags, categories…" />
    <select
      name="type"
      value={data.type ?? ''}
      class="border rounded-md px-3 py-2 bg-background text-sm"
    >
      <option value="">All types</option>
      <option value="romhack">Romhacks</option>
      <option value="sprite">Sprites</option>
      <option value="sound">Sounds</option>
      <option value="script">Scripts</option>
    </select>
    <Button type="submit">Go</Button>
  </form>

  {#if data.facets && totalFromFacets > 0}
    <div class="flex flex-wrap gap-3 text-sm mb-6">
      <span class="text-muted-foreground">Filter:</span>
      {#each ['romhack', 'sprite', 'sound', 'script'] as t}
        <a href={facetHref(t)}
           class="hover:underline {data.type === t ? 'font-medium underline' : ''}">
          {t === 'romhack' ? 'Romhacks' : t === 'sprite' ? 'Sprites' : t === 'sound' ? 'Sounds' : 'Scripts'}
          ({(data.facets as Record<string, number>)[t]})
        </a>
      {/each}
    </div>
  {/if}

  {#if data.q && data.hits.length === 0 && data.didYouMean.length > 0}
    <div class="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-3 mb-4 text-sm">
      No exact matches for <strong>"{data.q}"</strong>. Did you mean…
    </div>
    <ul class="grid gap-3 mb-6">
      {#each data.didYouMean as hit}
        <li class="border rounded p-3">
          <div class="flex items-center justify-between mb-1">
            <a href={`/${route(hit.type)}/${hit.slug}`} class="font-medium hover:underline">{hit.title}</a>
            <Badge variant="outline">{hit.type}</Badge>
          </div>
          {#if hit.snippet}<p class="text-sm text-muted-foreground">{@html hit.snippet}</p>{/if}
        </li>
      {/each}
    </ul>
  {:else if data.q && data.hits.length === 0}
    <p class="text-sm text-muted-foreground">No matches for "{data.q}".</p>
  {:else}
    <ul class="grid gap-3 mb-6">
      {#each data.hits as hit}
        <li class="border rounded p-3">
          <div class="flex items-center justify-between mb-1">
            <a href={`/${route(hit.type)}/${hit.slug}`} class="font-medium hover:underline">{hit.title}</a>
            <Badge variant="outline">{hit.type}</Badge>
          </div>
          {#if hit.snippet}<p class="text-sm text-muted-foreground">{@html hit.snippet}</p>{/if}
        </li>
      {/each}
    </ul>

    {#if showPrev || showNext}
      <div class="flex justify-between text-sm">
        {#if showPrev}
          <a href={pageHref(Math.max(0, data.offset - data.limit))} class="hover:underline">← Previous</a>
        {:else}
          <span></span>
        {/if}
        {#if showNext}
          <a href={pageHref(data.offset + data.limit)} class="hover:underline">Next →</a>
        {/if}
      </div>
    {/if}
  {/if}
</section>

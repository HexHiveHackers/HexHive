<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-3xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Search</h1>
  <form method="get" class="flex gap-2 mb-6">
    <Input name="q" value={data.q} placeholder="Search title or description…" />
    <select name="type" value={data.type ?? ''}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      <option value="">All types</option>
      <option value="romhack">Romhacks</option>
      <option value="sprite">Sprites</option>
      <option value="sound">Sounds</option>
      <option value="script">Scripts</option>
    </select>
    <Button type="submit">Go</Button>
  </form>

  {#if data.q && data.hits.length === 0}
    <p class="text-sm text-muted-foreground">No matches for "{data.q}".</p>
  {:else}
    <ul class="grid gap-3">
      {#each data.hits as hit}
        <li class="border rounded p-3">
          <div class="flex items-center justify-between mb-1">
            <a href={`/${route(hit.type)}/${hit.slug}`} class="font-medium hover:underline">{hit.title}</a>
            <Badge variant="outline">{hit.type}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">{@html hit.snippet}</p>
        </li>
      {/each}
    </ul>
  {/if}
</section>

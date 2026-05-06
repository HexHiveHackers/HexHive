<script lang="ts" generics="T">
  import { type Snippet } from 'svelte';
  let { items, item, empty }: {
    items: T[];
    item: Snippet<[T]>;
    empty?: Snippet;
  } = $props();
</script>

{#if items.length === 0}
  {#if empty}{@render empty()}{:else}
    <p class="text-sm text-muted-foreground">No results.</p>
  {/if}
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each items as it}
      {@render item(it)}
    {/each}
  </div>
{/if}

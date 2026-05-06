<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import MatureWrap from './MatureWrap.svelte';
  import TypeBadge from './TypeBadge.svelte';

  let { item }: {
    item: {
      slug: string; title: string; description: string;
      baseRom: string; baseRomVersion: string; release: string;
      categories: string[]; downloads: number; authorName: string;
      mature: boolean;
    }
  } = $props();
</script>

<MatureWrap mature={item.mature}>
  <a class="block border rounded-lg bg-card hover:bg-accent/40 transition-colors p-4"
     href={`/romhacks/${item.slug}`}>
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="font-medium line-clamp-2">{item.title}</h3>
      <TypeBadge type="romhack" />
    </div>
    <p class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{item.description}</p>
    <div class="mt-3 flex flex-wrap gap-1">
      <Badge variant="secondary">{item.baseRom} {item.baseRomVersion}</Badge>
      <Badge variant="outline">v{item.release}</Badge>
      {#each item.categories.slice(0, 3) as c}
        <Badge variant="outline">{c}</Badge>
      {/each}
    </div>
    <div class="mt-3 text-xs text-muted-foreground flex justify-between">
      <span>by {item.authorName}</span>
      <span>{item.downloads} ↓</span>
    </div>
  </a>
</MatureWrap>

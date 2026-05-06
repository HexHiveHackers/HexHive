<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import { Badge } from '$lib/components/ui/badge';

  type Type = 'sprite' | 'sound' | 'script';

  let { item, type }: {
    item: {
      slug: string; title: string; description: string;
      targetedRoms: string[]; fileCount: number; totalSize: number;
      downloads: number; authorName: string;
    };
    type: Type;
  } = $props();

  const route = type === 'sprite' ? 'sprites' : type === 'sound' ? 'sounds' : 'scripts';
  const sizeKb = Math.round(item.totalSize / 1024);
</script>

<a class="block border rounded-lg bg-card hover:bg-accent/40 transition-colors p-4"
   href={`/${route}/${item.slug}`}>
  <div class="flex items-start justify-between gap-2 mb-2">
    <h3 class="font-medium line-clamp-2">{item.title}</h3>
    <TypeBadge {type} />
  </div>
  <p class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{item.description}</p>
  <div class="mt-3 flex flex-wrap gap-1">
    {#each item.targetedRoms as r}<Badge variant="secondary">{r}</Badge>{/each}
    <Badge variant="outline">{item.fileCount} files</Badge>
    <Badge variant="outline">{sizeKb} KB</Badge>
  </div>
  <div class="mt-3 text-xs text-muted-foreground flex justify-between">
    <span>by {item.authorName}</span>
    <span>{item.downloads} ↓</span>
  </div>
</a>

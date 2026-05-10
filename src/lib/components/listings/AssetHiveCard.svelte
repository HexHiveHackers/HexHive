<script lang="ts">
  import { Image as ImageIcon } from '@lucide/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import MatureWrap from './MatureWrap.svelte';
  import TypeBadge from './TypeBadge.svelte';

  type Type = 'sprite' | 'sound' | 'script';

  let {
    item,
    type,
  }: {
    item: {
      slug: string;
      title: string;
      description: string;
      targetedRoms: string[];
      fileCount: number;
      totalSize: number;
      downloads: number;
      authorName: string;
      mature: boolean;
      thumbnailFileId: string | null;
    };
    type: Type;
  } = $props();

  const route = $derived(type === 'sprite' ? 'sprites' : type === 'sound' ? 'sounds' : 'scripts');
  const sizeKb = $derived(Math.round(item.totalSize / 1024));
</script>

<MatureWrap mature={item.mature}>
  <a
    class="flex flex-col h-full border rounded-lg bg-card hover:bg-accent/40 transition-colors overflow-hidden"
    href={`/${route}/${item.slug}`}
  >
    {#if type === 'sprite'}
      <div class="bg-checker aspect-[4/3] flex items-center justify-center border-b">
        {#if item.thumbnailFileId}
          <img
            src={`/api/preview/${item.thumbnailFileId}`}
            alt=""
            loading="lazy"
            decoding="async"
            class="pixelated max-h-full max-w-full"
          />
        {:else}
          <ImageIcon size={32} class="text-muted-foreground/40" />
        {/if}
      </div>
    {/if}
    <div class="p-4 flex flex-col flex-1">
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
      <div class="mt-auto pt-3 text-xs text-muted-foreground flex justify-between">
        <span>by {item.authorName}</span>
        <span>{item.downloads} ↓</span>
      </div>
    </div>
  </a>
</MatureWrap>

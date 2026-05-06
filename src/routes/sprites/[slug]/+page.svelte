<script lang="ts">
  import { Upload } from '@lucide/svelte';
  import { page } from '$app/state';
  import SpriteGallery from '$lib/components/listings/sprite/SpriteGallery.svelte';
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import VersionTimeline from '$lib/components/listings/VersionTimeline.svelte';
  import ReportButton from '$lib/components/moderation/ReportButton.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  const listing = $derived(data.detail.listing);
  const base = $derived(data.detail.base);
  const meta = $derived(data.detail.meta);
  const files = $derived(data.detail.files);
  const versions = $derived(data.detail.versions);
  const authorName = $derived(data.detail.authorName);
  const sprite = $derived(meta.kind === 'sprite' ? meta.data : null);
  const isAuthor = $derived(page.data.user?.id === listing.authorId);

  // Narrow the JSON `category` field for the badge. Sprite category may be
  // a single SpriteEntry, an array, or a record — we only render a badge
  // for the simple single-entry case.
  function singleEntry(category: unknown): { type: string; subtype: string; variant?: string } | null {
    if (!category || typeof category !== 'object' || Array.isArray(category)) return null;
    if (!('type' in category) || !('subtype' in category)) return null;
    const { type, subtype } = category;
    if (typeof type !== 'string' || typeof subtype !== 'string') return null;
    const variant =
      'variant' in category && typeof category.variant === 'string' ? category.variant : undefined;
    return { type, subtype, variant };
  }
  const cat = $derived(sprite ? singleEntry(sprite.category) : null);
</script>

<svelte:head>
  <title>{data.og.title}</title>
  <meta name="description" content={data.og.description} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.og.title} />
  <meta property="og:description" content={data.og.description} />
  <meta property="og:url" content={data.og.url} />
  <meta property="og:image" content={data.og.image} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<article class="mx-auto max-w-6xl px-4 py-8">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="sprite" />
      <span>by {authorName}</span><span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    {#if listing.description}
      <p class="mt-3 text-muted-foreground whitespace-pre-line max-w-3xl">{listing.description}</p>
    {/if}

    <div class="mt-4 flex flex-wrap gap-1.5">
      {#each base.targetedRoms as r}<Badge variant="outline">{r}</Badge>{/each}
      <Badge variant="outline">{base.fileCount} files</Badge>
      <Badge variant="outline">{Math.round(base.totalSize / 1024)} KB</Badge>
      {#if cat}
        <Badge>{cat.type} / {cat.subtype}{cat.variant ? ` / ${cat.variant}` : ''}</Badge>
      {/if}
    </div>
  </header>

  <SpriteGallery
    {files}
    listingId={listing.id}
    coverFileId={listing.thumbnailFileId}
    canEdit={isAuthor}
  />

  <section class="border rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-medium">Versions</h2>
      {#if isAuthor}
        <a href={`/upload/${listing.type}/version?id=${listing.id}`}>
          <Button size="sm" variant="outline"><Upload size={12} />Upload new version</Button>
        </a>
      {/if}
    </div>
    <VersionTimeline {versions} />
  </section>

  <div class="flex justify-end">
    <ReportButton listingId={listing.id} />
  </div>
</article>

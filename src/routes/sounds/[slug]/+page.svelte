<script lang="ts">
  import { Upload } from '@lucide/svelte';
  import { page } from '$app/state';
  import CreditLine from '$lib/components/credit-line.svelte';
  import SoundPlayer from '$lib/components/listings/sound/SoundPlayer.svelte';
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
  const isAuthor = $derived(page.data.user?.id === listing.authorId);
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

<article class="mx-auto max-w-4xl px-4 py-8">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="sound" />
      <CreditLine
        displayName={data.detail.authorName}
        username={data.detail.authorUsername ?? ''}
        homepageUrl={data.detail.authorHomepageUrl}
        isPlaceholder={data.detail.authorIsPlaceholder}
      />
      <span>·</span>
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
      {#if meta.kind === 'sound'}
        <Badge>{meta.data.category}</Badge>
      {/if}
    </div>
  </header>

  <SoundPlayer {files} />

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

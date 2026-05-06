<script lang="ts">
  import { page } from '$app/state';
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import VersionTimeline from '$lib/components/listings/VersionTimeline.svelte';
  import ReportButton from '$lib/components/moderation/ReportButton.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  const { listing, base, meta, files, versions, authorName } = data.detail;
  const isAuthor = page.data.user?.id === listing.authorId;
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

<article class="mx-auto max-w-4xl px-4 py-10">
  <header class="mb-6">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <TypeBadge type="script" />
      <span>by {authorName}</span><span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    <p class="mt-3 text-muted-foreground whitespace-pre-line">{listing.description}</p>
  </header>

  <section class="grid sm:grid-cols-2 gap-4 mb-8">
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Targets</h2>
      <div class="flex flex-wrap gap-1">
        {#each base.targetedRoms as r}<Badge>{r}</Badge>{/each}
      </div>
    </div>
    <div class="border rounded-lg p-4">
      <h2 class="text-sm font-medium mb-2">Pack</h2>
      <div class="flex flex-wrap gap-1">
        <Badge variant="outline">{base.fileCount} files</Badge>
        <Badge variant="outline">{Math.round(base.totalSize / 1024)} KB</Badge>
      </div>
    </div>
    {#if meta.kind === 'script'}
      <div class="border rounded-lg p-4 sm:col-span-2 grid gap-3">
        <div>
          <h3 class="text-sm font-medium">Categories</h3>
          <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.categories as c}<Badge variant="outline">{c}</Badge>{/each}</div>
        </div>
        <div>
          <h3 class="text-sm font-medium">Features</h3>
          <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.features as c}<Badge variant="outline">{c}</Badge>{/each}</div>
        </div>
        <div>
          <h3 class="text-sm font-medium">Targets</h3>
          <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.targetedVersions as c}<Badge variant="secondary">{c}</Badge>{/each}</div>
        </div>
        <div>
          <h3 class="text-sm font-medium">Tools</h3>
          <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.tools as c}<Badge variant="outline">{c}</Badge>{/each}</div>
        </div>
        {#if meta.data.prerequisites?.length}
          <div>
            <h3 class="text-sm font-medium">Prerequisites</h3>
            <div class="flex flex-wrap gap-1 mt-1">{#each meta.data.prerequisites as c}<Badge variant="outline">{c}</Badge>{/each}</div>
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <section class="border rounded-lg p-4">
    <h2 class="text-sm font-medium mb-3">Files</h2>
    <ul class="grid gap-2">
      {#each files as f}
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate">{f.originalFilename}</span>
          <a href={`/api/downloads/${f.id}`}><Button size="sm">Download</Button></a>
        </li>
      {/each}
    </ul>
    <div class="mt-4 flex justify-end">
      <ReportButton listingId={listing.id} />
    </div>
  </section>

  <section class="border rounded-lg p-4 mt-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-medium">Versions</h2>
      {#if isAuthor}
        <a href={`/upload/${listing.type}/version?id=${listing.id}`}>
          <Button size="sm" variant="outline">Upload new version</Button>
        </a>
      {/if}
    </div>
    <VersionTimeline {versions} />
  </section>
</article>

<script lang="ts">
  import { ChevronDown, Upload } from '@lucide/svelte';
  import { page } from '$app/state';
  import CreditLine from '$lib/components/credit-line.svelte';
  import TypeBadge from '$lib/components/listings/TypeBadge.svelte';
  import VersionTimeline from '$lib/components/listings/VersionTimeline.svelte';
  import HostIcon from '$lib/components/profile/HostIcon.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { linkifySegments } from '$lib/utils/linkify';

  let { data } = $props();
  const listing = $derived(data.detail.listing);
  const descriptionSegments = $derived(linkifySegments(listing.description ?? ''));
  const meta = $derived(data.detail.meta);
  const files = $derived(data.detail.files);
  const versions = $derived(data.detail.versions);
  const authorName = $derived(data.detail.authorName);
  const isAuthor = $derived(page.data.user?.id === listing.authorId);
  // Versions are returned newest-first; show the head as the always-visible
  // summary and tuck the rest behind an expand button.
  const currentVersion = $derived(versions[0]);
  const olderVersions = $derived(versions.slice(1));
  let showAllVersions = $state(false);
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
      <TypeBadge type="romhack" />
      <CreditLine
        displayName={authorName}
        username={data.detail.authorUsername ?? ''}
        homepageUrl={data.detail.authorHomepageUrl}
        isPlaceholder={data.detail.authorIsPlaceholder}
      />
      <span>·</span>
      <span>{listing.downloads} downloads</span>
    </div>
    <h1 class="font-display text-3xl mt-2">{listing.title}</h1>
    <p class="mt-3 text-muted-foreground whitespace-pre-line">
      {#each descriptionSegments as seg, i (i)}
        {#if seg.kind === 'link'}
          <a
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            class="text-foreground hover:text-primary underline-offset-2 hover:underline"
          >
            {seg.value}
          </a>
        {:else}
          {seg.value}
        {/if}
      {/each}
    </p>
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
    {#if meta.discordUrl || meta.sourceUrl}
      <div class="border rounded-lg p-4 sm:col-span-2">
        <h2 class="text-sm font-medium mb-2">Community &amp; source</h2>
        <div class="flex flex-wrap gap-2">
          {#if meta.discordUrl}
            <a
              href={meta.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-full border bg-card/40 px-3 py-1 text-xs hover:border-primary/50 hover:bg-card hover:text-primary transition-colors"
            >
              <HostIcon url={meta.discordUrl} size={12} />
              <span>Discord</span>
            </a>
          {/if}
          {#if meta.sourceUrl}
            <a
              href={meta.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-full border bg-card/40 px-3 py-1 text-xs hover:border-primary/50 hover:bg-card hover:text-primary transition-colors"
            >
              <HostIcon url={meta.sourceUrl} size={12} />
              <span>Source</span>
            </a>
          {/if}
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

  <section class="border rounded-lg p-4 mt-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-medium">Versions</h2>
      {#if isAuthor}
        <a href={`/upload/${listing.type}/version?id=${listing.id}`}>
          <Button size="sm" variant="outline"><Upload size={12} />Upload new version</Button>
        </a>
      {/if}
    </div>
    {#if currentVersion}
      <VersionTimeline versions={[currentVersion]} />
      {#if olderVersions.length > 0}
        <button
          type="button"
          onclick={() => (showAllVersions = !showAllVersions)}
          class="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showAllVersions}
        >
          <ChevronDown size={14} class="transition-transform {showAllVersions ? 'rotate-180' : ''}" />
          {showAllVersions ? 'Hide' : 'Show'} {olderVersions.length} previous version{olderVersions.length === 1 ? '' : 's'}
        </button>
        {#if showAllVersions}
          <div class="mt-3 max-h-96 overflow-y-auto rounded-lg border bg-card/30 p-3 [scrollbar-gutter:stable]">
            <VersionTimeline versions={olderVersions} />
          </div>
        {/if}
      {/if}
    {/if}
  </section>
</article>

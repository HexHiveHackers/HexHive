<script lang="ts">
  import { SiGithub } from '@icons-pack/svelte-simple-icons';
  import { ChevronLeft, ExternalLink, GitBranch, Wrench } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { TOOL_PLATFORM_LABEL, TOOL_STATUS_LABEL, TOOL_SUBTYPE_LABEL } from '$lib/data/tools';

  let { data } = $props();
  const tool = $derived(data.tool);

  const STATUS_TONE: Record<string, string> = {
    active: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    beta: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    archived: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
  };
</script>

<svelte:head>
  <title>{tool.name} · Tools · HexHive</title>
</svelte:head>

<section class="mx-auto max-w-4xl px-4 py-10 space-y-8">
  <a href="/tools" class="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-foreground">
    <ChevronLeft class="size-4" /> All tools
  </a>

  <header class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-sm uppercase tracking-widest text-zinc-200 font-display">
      <Wrench class="size-4 text-sky-300" />
      <span class="text-sky-300">{TOOL_SUBTYPE_LABEL[tool.subtypes[0]] ?? 'Tool'}</span>
      <span class="rounded-sm border px-2 py-0.5 text-[0.7rem] tracking-[0.18em] {STATUS_TONE[tool.status]}">
        {TOOL_STATUS_LABEL[tool.status]}
      </span>
    </div>
    <h1 class="font-display text-3xl md:text-4xl text-foreground">{tool.name}</h1>
    <p class="text-base text-zinc-200 leading-relaxed">{tool.tagline}</p>
    <div class="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
      <span>by
        {#if tool.authorUrl}
          <a href={tool.authorUrl} target="_blank" rel="noopener noreferrer" class="text-foreground hover:text-sky-300 underline-offset-2 hover:underline">
            {tool.author}
          </a>
        {:else}
          <span class="text-foreground">{tool.author}</span>
        {/if}
      </span>
      {#if tool.branch}
        <span class="inline-flex items-center gap-1 font-mono text-sm text-zinc-300">
          <GitBranch class="size-3.5" /> {tool.branch}
        </span>
      {/if}
      {#if tool.license}
        <span class="font-mono text-sm">· {tool.license}</span>
      {/if}
    </div>

    <div class="flex flex-wrap gap-2 pt-2">
      <a href={tool.repoUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="default" size="sm">
          <SiGithub size={16} /> Source
        </Button>
      </a>
      {#if tool.releasesUrl}
        <a href={tool.releasesUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink class="size-4" /> Releases
          </Button>
        </a>
      {/if}
      {#if tool.homepageUrl}
        <a href={tool.homepageUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink class="size-4" /> Homepage
          </Button>
        </a>
      {/if}
    </div>
  </header>

  <!-- Metadata grid -->
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
      <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Subtypes</div>
      <div class="flex flex-wrap gap-1.5">
        {#each tool.subtypes as st}
          <span class="rounded-sm border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-sm text-sky-200">
            {TOOL_SUBTYPE_LABEL[st]}
          </span>
        {/each}
      </div>
    </div>
    <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
      <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Platforms</div>
      <div class="flex flex-wrap gap-1.5">
        {#each tool.platforms as p}
          <span class="rounded-sm border border-border/60 bg-slate-900/70 px-2 py-0.5 font-mono text-sm text-foreground/90">
            {TOOL_PLATFORM_LABEL[p]}
          </span>
        {/each}
      </div>
    </div>
    <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
      <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Languages</div>
      <div class="flex flex-wrap gap-1.5">
        {#each tool.languages as l}
          <span class="rounded-sm border border-border/60 bg-slate-900/70 px-2 py-0.5 font-mono text-sm text-foreground/90">
            {l}
          </span>
        {/each}
      </div>
    </div>
    <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
      <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Targets</div>
      <div class="flex flex-wrap gap-1.5">
        {#each tool.targetedSystems as ts}
          <span class="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-sm text-emerald-200">
            {ts}
          </span>
        {/each}
      </div>
    </div>
  </div>

  {#if tool.dependencies && tool.dependencies.length > 0}
    <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
      <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Dependencies</div>
      <ul class="grid gap-1 sm:grid-cols-2 text-sm text-zinc-200 font-mono">
        {#each tool.dependencies as d}
          <li class="flex items-start gap-2">
            <span class="text-zinc-500">·</span>
            <span>{d}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="space-y-3">
    <h2 class="font-display text-xl text-foreground">About</h2>
    {#each tool.description as para}
      <p class="text-base text-zinc-200 leading-relaxed">{para}</p>
    {/each}
  </div>

  <div class="space-y-3">
    <h2 class="font-display text-xl text-foreground">Highlights</h2>
    <ul class="space-y-2">
      {#each tool.highlights as h}
        <li class="flex items-start gap-2 text-base text-zinc-200 leading-relaxed">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400"></span>
          <span>{h}</span>
        </li>
      {/each}
    </ul>
  </div>

  {#if tool.featureGroups && tool.featureGroups.length > 0}
    <div class="space-y-5">
      <h2 class="font-display text-xl text-foreground">Features</h2>
      {#each tool.featureGroups as g}
        <div class="rounded-md border border-border/70 bg-slate-950/50 p-4 space-y-2">
          <div class="font-display text-sm tracking-wider text-sky-300">{g.title}</div>
          <ul class="space-y-1.5">
            {#each g.items as item}
              <li class="flex items-start gap-2 text-sm text-zinc-200 leading-relaxed">
                <span class="mt-2 size-1 shrink-0 rounded-full bg-zinc-500"></span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}

  {#if tool.supportedGames && tool.supportedGames.length > 0}
    <div class="space-y-3">
      <h2 class="font-display text-xl text-foreground">Supported games</h2>
      <ul class="space-y-3">
        {#each tool.supportedGames as g}
          <li class="rounded-md border border-border/70 bg-slate-950/50 p-3">
            <div class="text-base font-medium text-foreground">{g.title}</div>
            {#if g.note}
              <div class="mt-1 text-sm text-zinc-300 leading-relaxed">{g.note}</div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if tool.tags.length > 0}
    <div class="space-y-2">
      <h2 class="font-display text-xl text-foreground">Tags</h2>
      <div class="flex flex-wrap gap-1.5">
        {#each tool.tags as t}
          <span class="rounded-sm border border-border/60 bg-slate-900/70 px-2 py-0.5 font-mono text-sm text-foreground/80">
            {t}
          </span>
        {/each}
      </div>
    </div>
  {/if}

  {#if (tool.extraLinks && tool.extraLinks.length > 0) || (tool.inspiredBy && tool.inspiredBy.length > 0)}
    <div class="grid gap-4 sm:grid-cols-2">
      {#if tool.extraLinks && tool.extraLinks.length > 0}
        <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
          <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Related</div>
          <ul class="space-y-1.5">
            {#each tool.extraLinks as l}
              <li>
                <a href={l.href} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm text-zinc-200 hover:text-sky-300 underline-offset-2 hover:underline">
                  <ExternalLink class="size-3.5" /> {l.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if tool.inspiredBy && tool.inspiredBy.length > 0}
        <div class="rounded-md border border-border/70 bg-slate-950/70 p-4 space-y-2">
          <div class="text-sm uppercase tracking-wider text-zinc-200 font-medium">Inspired by</div>
          <ul class="space-y-1.5">
            {#each tool.inspiredBy as l}
              <li>
                <a href={l.href} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm text-zinc-200 hover:text-sky-300 underline-offset-2 hover:underline">
                  <ExternalLink class="size-3.5" /> {l.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</section>

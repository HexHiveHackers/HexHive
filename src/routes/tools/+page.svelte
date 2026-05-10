<script lang="ts">
  import { Wrench } from '@lucide/svelte';
  import { page } from '$app/state';
  import { TOOL_PLATFORM_LABEL, TOOL_STATUS_LABEL, TOOL_SUBTYPE_LABEL } from '$lib/data/tools';

  let { data } = $props();

  const STATUS_TONE: Record<string, string> = {
    active: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    beta: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    archived: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
  };
  const ogImage = `${page.url.origin}/og-tools.jpg`;
</script>

<svelte:head>
  <title>Tools · HexHive</title>
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 space-y-6">
  <header class="space-y-3">
    <div class="flex items-center gap-2 text-sm uppercase tracking-widest text-zinc-200 font-display">
      <Wrench class="size-4" /> directory
    </div>
    <h1 class="font-display text-3xl md:text-4xl">Tools</h1>
    <p class="text-base text-zinc-200 leading-relaxed max-w-2xl">
      External ROM-hacking tools — hex editors, disassemblers, map editors, asset injectors, music
      and script editors, patchers and full ROM builders. Curated; clicking through takes you to
      the source repo or release page.
    </p>
  </header>

  {#if data.tools.length === 0}
    <p class="text-base text-zinc-300">No tools indexed yet.</p>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.tools as tool (tool.slug)}
        <a
          href="/tools/{tool.slug}"
          class="group relative overflow-hidden rounded-md border border-border/70 bg-slate-950/70 p-4 transition-all hover:border-sky-400/60 hover:bg-slate-900/70"
        >
          <span aria-hidden="true" class="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400/80 via-cyan-300/70 to-sky-500/60"></span>

          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:8px_8px]"
          ></span>

          <div class="relative flex items-start justify-between gap-2 mb-2">
            <span class="font-display text-[0.75rem] tracking-[0.25em] text-sky-300">
              {TOOL_SUBTYPE_LABEL[tool.subtypes[0]] ?? 'Tool'}
            </span>
            <span class="rounded-sm border px-1.5 py-0.5 font-display text-[0.7rem] tracking-[0.18em] {STATUS_TONE[tool.status]}">
              {TOOL_STATUS_LABEL[tool.status]}
            </span>
          </div>

          <div class="relative flex items-center gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-slate-900/70 text-zinc-300">
              {#if tool.iconUrl}
                <img src={tool.iconUrl} alt="" class="size-full object-contain" loading="lazy" />
              {:else}
                <Wrench class="size-5" />
              {/if}
            </span>
            <div class="min-w-0">
              <div class="text-lg font-medium leading-snug text-foreground truncate">
                {tool.name}
              </div>
              <div class="font-mono text-sm text-zinc-300 truncate">by {tool.author}</div>
            </div>
          </div>
          <p class="relative mt-3 text-sm text-zinc-200 leading-relaxed line-clamp-3">
            {tool.tagline}
          </p>

          {#if tool.subtypes.length > 1}
            <div class="relative mt-3 flex flex-wrap gap-1">
              {#each tool.subtypes.slice(1) as st}
                <span class="rounded-sm border border-border/60 bg-slate-900/70 px-1.5 py-0.5 font-mono text-[0.75rem] text-foreground/80">
                  {TOOL_SUBTYPE_LABEL[st]}
                </span>
              {/each}
            </div>
          {/if}

          <div class="relative mt-3 flex flex-wrap gap-1">
            {#each tool.platforms as p}
              <span class="rounded-sm border border-sky-500/30 bg-sky-500/5 px-1.5 py-0.5 font-mono text-[0.75rem] text-sky-200">
                {TOOL_PLATFORM_LABEL[p]}
              </span>
            {/each}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>

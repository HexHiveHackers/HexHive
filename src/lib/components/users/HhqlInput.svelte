<script lang="ts">
  import { CircleHelp } from '@lucide/svelte';
  import { parseHhql } from '$lib/hhql';
  import { tokenize } from '$lib/hhql/tokens';

  interface Props {
    value: string;
  }
  let { value = $bindable() }: Props = $props();

  const tokens = $derived(tokenize(value));
  const parseRes = $derived(parseHhql(value));
  const error = $derived(!parseRes.ok && parseRes.errors.length > 0 ? parseRes.errors[0] : null);

  let showHelp = $state(false);
  let helpRoot: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!showHelp) return;
    function onDown(e: MouseEvent): void {
      if (!helpRoot) return;
      if (e.target instanceof Node && !helpRoot.contains(e.target)) showHelp = false;
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  });

  function classFor(kind: string): string {
    switch (kind) {
      case 'ident':
        return 'text-primary';
      case 'kw':
        return 'text-muted-foreground font-bold';
      case 'op':
        return 'text-muted-foreground';
      case 'string':
      case 'date':
      case 'reldate':
      case 'number':
        return 'text-amber-300';
      default:
        return '';
    }
  }
</script>

<div
  class="relative rounded-md border border-input bg-input/30 font-mono text-sm leading-6 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40"
>
  <pre
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 m-0 whitespace-pre-wrap break-words p-2 pr-9 text-muted-foreground/40"
  >{#if value.length === 0}<span class="text-muted-foreground/60">creates IN (sprite, sound) AND hasBio AND active &gt; -30d</span>{:else if tokens.length === 0}{value}{:else}{value.slice(0, tokens[0].start)}{#each tokens as t, i (t.start)}<span class={classFor(t.kind)}>{value.slice(t.start, t.end)}</span>{value.slice(t.end, tokens[i + 1]?.start ?? value.length)}{/each}<span>&#8203;</span>{/if}</pre>
  <textarea
    class="relative w-full bg-transparent p-2 pr-9 text-transparent caret-primary outline-none resize-none"
    rows="2"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    bind:value
  ></textarea>

  <div bind:this={helpRoot} class="absolute right-1 top-1">
    <button
      type="button"
      class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
      aria-haspopup="dialog"
      aria-expanded={showHelp}
      title="HHQL syntax reference"
      onclick={() => (showHelp = !showHelp)}
    >
      <CircleHelp aria-hidden="true" class="size-4" />
    </button>
    {#if showHelp}
      <div
        role="dialog"
        aria-label="HHQL syntax reference"
        class="absolute right-0 top-full z-20 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-4 shadow-md font-sans"
      >
        <h4 class="mb-3 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">HHQL reference</h4>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Comparisons</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">downloads</span> <span class="font-bold">&gt;=</span> <span class="text-amber-300">100</span></p>
            <p><span class="text-primary">alias</span> <span class="font-bold">!=</span> <span class="text-amber-300">"some name"</span></p>
            <p><span class="text-primary">bio</span> <span class="font-bold">~</span> <span class="text-amber-300">shiny</span> <span class="opacity-50">(contains)</span></p>
          </div>
        </section>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Logical operators</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">hasBio</span> <span class="font-bold">AND</span> <span class="text-primary">active</span> <span class="font-bold">&gt;</span> <span class="text-amber-300">-7d</span></p>
            <p><span class="text-primary">creates</span> <span class="font-bold">=</span> <span class="text-amber-300">sprite</span> <span class="font-bold">OR</span> <span class="text-primary">creates</span> <span class="font-bold">=</span> <span class="text-amber-300">sound</span></p>
            <p><span class="font-bold">NOT</span> <span class="text-primary">placeholder</span></p>
            <p class="opacity-70">Adjacent clauses are implicit AND.</p>
          </div>
        </section>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Lists</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">creates</span> <span class="font-bold">IN</span> (<span class="text-amber-300">sprite</span>, <span class="text-amber-300">sound</span>)</p>
            <p><span class="text-primary">affiliation</span> <span class="font-bold">NOT IN</span> (<span class="text-amber-300">"team aqua"</span>)</p>
          </div>
        </section>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Existence</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">alias</span> <span class="font-bold">IS EMPTY</span></p>
            <p><span class="text-primary">affiliation</span> <span class="font-bold">IS NOT EMPTY</span></p>
          </div>
        </section>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Dates</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">active</span> <span class="font-bold">&gt;</span> <span class="text-amber-300">-30d</span> <span class="opacity-50">(d / w / m / y)</span></p>
            <p><span class="text-primary">joined</span> <span class="font-bold">&gt;</span> <span class="text-amber-300">2026-01-01</span></p>
          </div>
        </section>

        <section class="mb-3">
          <h5 class="mb-1 text-xs font-medium">Bare booleans</h5>
          <div class="space-y-0.5 font-mono text-xs text-muted-foreground">
            <p><span class="text-primary">hasBio</span> <span class="opacity-50">≡ hasBio = true</span></p>
            <p><span class="font-bold">NOT</span> <span class="text-primary">admin</span> <span class="opacity-50">≡ admin = false</span></p>
          </div>
        </section>

        <section>
          <h5 class="mb-1 text-xs font-medium">Fields</h5>
          <p class="text-xs text-muted-foreground leading-relaxed">
            <span class="text-primary">username</span>, <span class="text-primary">alias</span>, <span class="text-primary">bio</span>,
            <span class="text-primary">creates</span>, <span class="text-primary">listings</span>,
            <span class="text-primary">romhacks</span> · <span class="text-primary">sprites</span> · <span class="text-primary">sounds</span> · <span class="text-primary">scripts</span>,
            <span class="text-primary">downloads</span>,
            <span class="text-primary">active</span>, <span class="text-primary">joined</span>,
            <span class="text-primary">hasBio</span> · <span class="text-primary">hasAlias</span> · <span class="text-primary">hasAvatar</span> · <span class="text-primary">hasLinks</span> · <span class="text-primary">hasAffiliations</span>,
            <span class="text-primary">affiliation</span>, <span class="text-primary">role</span>, <span class="text-primary">aka</span>,
            <span class="text-primary">placeholder</span>, <span class="text-primary">admin</span>
          </p>
        </section>
      </div>
    {/if}
  </div>
</div>
{#if error}
  <p class="mt-1 text-xs text-destructive">{error.message}</p>
{/if}

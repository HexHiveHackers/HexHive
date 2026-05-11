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
  class="relative rounded-md border border-input bg-input/30 font-mono text-sm leading-6 transition-colors hover:border-ring/60 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40"
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
        <h4 class="mb-3 text-sm font-medium text-foreground">HHQL Reference</h4>

        <div class="space-y-3 text-xs">
          <section>
            <h5 class="mb-1 font-medium text-foreground/80">Comparisons</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">downloads</span> <span class="text-amber-400">&gt;=</span> <span class="text-orange-400">100</span></p>
              <p><span class="text-sky-400">alias</span> <span class="text-amber-400">!=</span> <span class="text-green-400">"some name"</span></p>
              <p><span class="text-sky-400">bio</span> <span class="text-amber-400">~</span> <span class="text-emerald-400">shiny</span> <span class="opacity-50">(contains)</span></p>
            </div>
          </section>

          <section>
            <h5 class="mb-1 font-medium text-foreground/80">Logical Operators</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">hasBio</span> <span class="text-purple-400 font-semibold">AND</span> <span class="text-sky-400">active</span> <span class="text-amber-400">&gt;</span> <span class="text-pink-400">-7d</span></p>
              <p><span class="text-sky-400">creates</span> <span class="text-amber-400">=</span> <span class="text-emerald-400">sprite</span> <span class="text-purple-400 font-semibold">OR</span> <span class="text-sky-400">creates</span> <span class="text-amber-400">=</span> <span class="text-emerald-400">sound</span></p>
              <p><span class="text-purple-400 font-semibold">NOT</span> <span class="text-sky-400">placeholder</span></p>
              <p class="opacity-70">Adjacent clauses are implicit AND.</p>
            </div>
          </section>

          <section>
            <h5 class="mb-1 font-medium text-foreground/80">List Operators</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">creates</span> <span class="text-purple-400 font-semibold">IN</span> <span class="text-zinc-500">(</span><span class="text-emerald-400">sprite</span><span class="text-zinc-500">,</span> <span class="text-emerald-400">sound</span><span class="text-zinc-500">)</span></p>
              <p><span class="text-sky-400">affiliation</span> <span class="text-purple-400 font-semibold">NOT IN</span> <span class="text-zinc-500">(</span><span class="text-green-400">"team aqua"</span><span class="text-zinc-500">)</span></p>
            </div>
          </section>

          <section>
            <h5 class="mb-1 font-medium text-foreground/80">Empty Checks</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">alias</span> <span class="text-purple-400 font-semibold">IS EMPTY</span></p>
              <p><span class="text-sky-400">affiliation</span> <span class="text-purple-400 font-semibold">IS NOT EMPTY</span></p>
            </div>
          </section>

          <section>
            <h5 class="mb-1 font-medium text-foreground/80">Date Comparisons</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">active</span> <span class="text-amber-400">&gt;</span> <span class="text-pink-400">-30d</span> <span class="opacity-50">(d / w / m / y)</span></p>
              <p><span class="text-sky-400">joined</span> <span class="text-amber-400">&gt;</span> <span class="text-pink-400">2026-01-01</span></p>
            </div>
          </section>

          <section>
            <h5 class="mb-1 font-medium text-foreground/80">Bare Booleans</h5>
            <div class="space-y-0.5 font-mono text-muted-foreground">
              <p><span class="text-sky-400">hasBio</span> <span class="opacity-50">≡ hasBio = true</span></p>
              <p><span class="text-purple-400 font-semibold">NOT</span> <span class="text-sky-400">admin</span> <span class="opacity-50">≡ admin = false</span></p>
            </div>
          </section>
        </div>
      </div>
    {/if}
  </div>
</div>
{#if error}
  <p class="mt-1 text-xs text-destructive">{error.message}</p>
{/if}

<script lang="ts">
  import { parseHhql } from '$lib/hhql';
  import { tokenize } from '$lib/hhql/tokens';

  interface Props {
    value: string;
  }
  let { value = $bindable() }: Props = $props();

  const tokens = $derived(tokenize(value));
  const parseRes = $derived(parseHhql(value));
  const error = $derived(!parseRes.ok && parseRes.errors.length > 0 ? parseRes.errors[0] : null);

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

<div class="relative font-mono text-sm leading-6">
  <pre
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words p-2"
  >{#if tokens.length === 0}{value}{:else}{value.slice(0, tokens[0].start)}{#each tokens as t, i (t.start)}<span class={classFor(t.kind)}>{value.slice(t.start, t.end)}</span>{value.slice(t.end, tokens[i + 1]?.start ?? value.length)}{/each}<span>&#8203;</span>{/if}</pre>
  <textarea
    class="relative w-full bg-transparent caret-primary outline-none p-2 text-transparent resize-none"
    rows="2"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    bind:value
  ></textarea>
</div>
{#if error}
  <p class="mt-1 text-xs text-destructive">{error.message}</p>
{/if}

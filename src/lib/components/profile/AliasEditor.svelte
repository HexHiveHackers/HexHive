<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  type Item = { id: string; value: string };

  let { initial }: { initial: Item[] } = $props();
  let items = $state<Item[]>(untrack(() => initial));

  let value = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function add(e: SubmitEvent) {
    e.preventDefault();
    err = null; busy = true;
    try {
      const res = await fetch('/api/profile/aliases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { item }: { item: Item } = await res.json();
      if (!items.some((i) => i.id === item.id)) items = [...items, item];
      value = '';
      await invalidateAll();
    } catch (e: unknown) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function remove(id: string) {
    busy = true;
    try {
      const res = await fetch(`/api/profile/aliases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      items = items.filter((i) => i.id !== id);
      await invalidateAll();
    } catch (e: unknown) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="grid gap-3">
  {#if items.length > 0}
    <ul class="flex flex-wrap gap-2">
      {#each items as a (a.id)}
        <li class="inline-flex items-center gap-1.5 rounded-full border bg-card/40 pl-3 pr-1 py-0.5 text-xs">
          <span>{a.value}</span>
          <button
            type="button"
            class="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            disabled={busy}
            aria-label={`Remove alias ${a.value}`}
            onclick={() => remove(a.id)}
          >
            <X size={12} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={add} class="flex gap-2 max-w-md">
    <Input placeholder="Add an alias…" bind:value maxlength={80} required />
    <Button type="submit" disabled={busy || !value.trim()}>
      <Plus size={14} />
      Add
    </Button>
  </form>
  {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
</div>

<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import HostIcon from '$lib/components/profile/HostIcon.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  type Item = { id: string; name: string; url: string | null; role: string | null };

  let { initial }: { initial: Item[] } = $props();
  let items = $state<Item[]>(untrack(() => initial));

  let name = $state('');
  let role = $state('');
  let url = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function add(e: SubmitEvent) {
    e.preventDefault();
    err = null; busy = true;
    try {
      const res = await fetch('/api/profile/affiliations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, role: role || undefined, url: url || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { item }: { item: Item } = await res.json();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items = [...items, item];
      name = ''; role = ''; url = '';
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
      const res = await fetch(`/api/profile/affiliations/${id}`, { method: 'DELETE' });
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

<div class="grid gap-4">
  {#if items.length > 0}
    <ul class="grid gap-2">
      {#each items as a (a.id)}
        <li class="flex items-center justify-between gap-3 rounded-md border bg-card/40 px-3 py-2 text-sm">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              {#if a.url}
                <span class="shrink-0 text-muted-foreground"><HostIcon url={a.url} /></span>
                <a href={a.url} target="_blank" rel="noopener noreferrer" class="font-medium hover:text-primary hover:underline truncate">{a.name}</a>
              {:else}
                <span class="font-medium truncate">{a.name}</span>
              {/if}
              {#if a.role}<span class="text-xs text-muted-foreground">— {a.role}</span>{/if}
            </div>
          </div>
          <Button size="sm" variant="ghost" disabled={busy} onclick={() => remove(a.id)} title="Remove">
            <X size={14} />
          </Button>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={add} class="grid gap-3 rounded-md border p-3">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="grid gap-1.5">
        <Label for="aff-name">Name</Label>
        <Input id="aff-name" placeholder="Team or project name" bind:value={name} required maxlength={120} />
      </div>
      <div class="grid gap-1.5">
        <Label for="aff-role">Role <span class="text-xs text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="aff-role" placeholder="Your role" bind:value={role} maxlength={120} />
      </div>
      <div class="grid gap-1.5">
        <Label for="aff-url">URL <span class="text-xs text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="aff-url" type="url" placeholder="https://…" bind:value={url} maxlength={300} />
      </div>
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <div>
      <Button type="submit" disabled={busy || !name.trim()}>
        <Plus size={14} />
        {busy ? 'Adding…' : 'Add affiliation'}
      </Button>
    </div>
  </form>
</div>

<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import HostIcon from '$lib/components/profile/HostIcon.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { detectLinkHost, hostLabel } from '$lib/utils/link-host';

  type Item = { id: string; url: string; label: string | null };

  let { initial }: { initial: Item[] } = $props();
  let items = $state<Item[]>(untrack(() => initial));

  let url = $state('');
  let label = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);

  function displayLabel(item: Item): string {
    if (item.label) return item.label;
    const host = detectLinkHost(item.url);
    if (host) return hostLabel(host);
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return item.url;
    }
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    err = null; busy = true;
    try {
      const res = await fetch('/api/profile/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, label: label || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { item }: { item: Item } = await res.json();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items = [...items, item];
      url = ''; label = '';
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
      const res = await fetch(`/api/profile/links/${id}`, { method: 'DELETE' });
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
      {#each items as l (l.id)}
        <li class="flex items-center justify-between gap-3 rounded-md border bg-card/40 px-3 py-2 text-sm">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="shrink-0 text-muted-foreground"><HostIcon url={l.url} /></span>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium hover:text-primary hover:underline truncate"
            >
              {displayLabel(l)}
            </a>
            <span class="text-xs text-muted-foreground truncate">{l.url}</span>
          </div>
          <Button size="sm" variant="ghost" disabled={busy} onclick={() => remove(l.id)} title="Remove">
            <X size={14} />
          </Button>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={add} class="grid gap-3 rounded-md border p-3">
    <div class="grid gap-3 sm:grid-cols-[2fr_1fr]">
      <div class="grid gap-1.5">
        <Label for="link-url">URL</Label>
        <Input
          id="link-url"
          type="url"
          placeholder="https://www.pokecommunity.com/members/yourname"
          bind:value={url}
          required
          maxlength={300}
        />
      </div>
      <div class="grid gap-1.5">
        <Label for="link-label">Label <span class="text-xs text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="link-label" placeholder="auto from host" bind:value={label} maxlength={80} />
      </div>
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <div>
      <Button type="submit" disabled={busy || !url.trim()}>
        <Plus size={14} />
        {busy ? 'Adding…' : 'Add link'}
      </Button>
    </div>
  </form>
</div>

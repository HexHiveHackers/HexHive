<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { invalidateAll } from '$app/navigation';
  import Avatar from './Avatar.svelte';

  let { avatarKey, name }: { avatarKey: string | null; name: string } = $props();
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function pick() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/gif,image/webp';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      busy = true; err = null;
      try {
        const presignRes = await fetch('/api/avatars/presign', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size })
        });
        if (!presignRes.ok) throw new Error(await presignRes.text());
        const { key, url } = await presignRes.json();

        const putRes = await fetch(url, { method: 'PUT', headers: { 'content-type': f.type }, body: f });
        if (!putRes.ok) throw new Error('Upload to storage failed');

        const patchRes = await fetch('/api/profile', {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ avatarKey: key })
        });
        if (!patchRes.ok) throw new Error(await patchRes.text());
        await invalidateAll();
      } catch (e: unknown) { err = (e as Error).message; }
      finally { busy = false; }
    };
    inp.click();
  }

  async function clear() {
    busy = true; err = null;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatarKey: null })
      });
      if (!res.ok) throw new Error(await res.text());
      await invalidateAll();
    } catch (e: unknown) { err = (e as Error).message; }
    finally { busy = false; }
  }
</script>

<div class="flex items-center gap-4">
  <Avatar {avatarKey} {name} size={64} />
  <div class="flex flex-col gap-1">
    <div class="flex gap-2">
      <Button size="sm" variant="outline" onclick={pick} disabled={busy}>{busy ? 'Uploading…' : 'Change'}</Button>
      {#if avatarKey}
        <Button size="sm" variant="ghost" onclick={clear} disabled={busy}>Remove</Button>
      {/if}
    </div>
    {#if err}<p class="text-xs text-destructive">{err}</p>{/if}
    <p class="text-xs text-muted-foreground">PNG / JPEG / GIF / WebP, ≤ 2 MB.</p>
  </div>
</div>

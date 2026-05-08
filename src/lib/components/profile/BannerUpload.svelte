<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import Banner from './Banner.svelte';

  let { bannerKey, name }: { bannerKey: string | null; name: string } = $props();
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function pick(): Promise<void> {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/apng,image/jpeg,image/gif,image/webp';
    inp.onchange = async (): Promise<void> => {
      const f = inp.files?.[0];
      if (!f) return;
      busy = true;
      err = null;
      try {
        const presignRes = await fetch('/api/banners/presign', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
        });
        if (!presignRes.ok) throw new Error(await presignRes.text());
        const { key, url } = await presignRes.json();

        const putRes = await fetch(url, { method: 'PUT', headers: { 'content-type': f.type }, body: f });
        if (!putRes.ok) throw new Error('Upload to storage failed');

        const patchRes = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bannerKey: key }),
        });
        if (!patchRes.ok) throw new Error(await patchRes.text());
        await invalidateAll();
      } catch (e: unknown) {
        err = (e as Error).message;
      } finally {
        busy = false;
      }
    };
    inp.click();
  }

  async function clear(): Promise<void> {
    busy = true;
    err = null;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bannerKey: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await invalidateAll();
    } catch (e: unknown) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex flex-col gap-2">
  {#if bannerKey}
    <Banner {bannerKey} alt={`${name}'s banner`} />
  {:else}
    <div class="flex aspect-[3/1] w-full max-h-48 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground">
      No banner uploaded
    </div>
  {/if}
  <div class="flex items-center gap-2">
    <Button size="sm" variant="outline" onclick={pick} disabled={busy}>{busy ? 'Uploading…' : 'Change banner'}</Button>
    {#if bannerKey}
      <Button size="sm" variant="ghost" onclick={clear} disabled={busy}>Remove</Button>
    {/if}
  </div>
  {#if err}<p class="text-xs text-destructive">{err}</p>{/if}
  <p class="text-xs text-muted-foreground">PNG / JPEG / GIF / WebP / APNG, ≤ 5 MB. Animated GIF/WebP/APNG OK. Recommended 3:1 aspect.</p>
</div>

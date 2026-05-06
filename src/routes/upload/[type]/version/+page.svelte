<script lang="ts">
  import { goto } from '$app/navigation';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let { data } = $props();
  let version = $state('');
  let changelog = $state('');
  let files = $state<File[]>([]);
  let busy = $state(false);
  let err = $state<string | null>(null);

  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    err = null;
    if (!version) { err = 'Version label required'; return; }
    if (!files.length) { err = 'Pick at least one file'; return; }
    busy = true;
    try {
      const presignRes = await fetch(`/api/listings/${data.listing.id}/versions/presign`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version,
          changelog: changelog || undefined,
          files: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size }))
        })
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { versionId, uploads } = await presignRes.json();

      await Promise.all(uploads.map((u: any, i: number) =>
        fetch(u.url, { method: 'PUT', headers: { 'content-type': files[i].type || 'application/octet-stream' }, body: files[i] })
          .then((r) => { if (!r.ok) throw new Error(`R2 PUT failed for ${u.originalFilename}`); })
      ));

      const finalizeRes = await fetch(`/api/listings/${data.listing.id}/versions/finalize`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionId,
          files: uploads.map((u: any) => ({ r2Key: u.r2Key, filename: u.filename, originalFilename: u.originalFilename, size: u.size }))
        })
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());
      await goto(`/${route(data.listing.type)}/${data.listing.slug}`);
    } catch (e: any) { err = e?.message ?? 'Upload failed'; }
    finally { busy = false; }
  }
</script>

<section class="mx-auto max-w-2xl px-4 py-10">
  <h1 class="font-display text-2xl mb-2">Upload new version</h1>
  <p class="text-sm text-muted-foreground mb-6">{data.listing.title}</p>
  <form onsubmit={submit} class="grid gap-4">
    <div class="grid gap-1.5">
      <Label for="version">Version label</Label>
      <Input id="version" bind:value={version} placeholder="1.1.0" required />
    </div>
    <div class="grid gap-1.5">
      <Label for="changelog">Changelog</Label>
      <textarea id="changelog" rows="6" bind:value={changelog}
                class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
    </div>
    <div>
      <span class="text-sm font-medium block mb-2">Files</span>
      <FileDropzone bind:files />
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Publish version'}</Button>
  </form>
</section>

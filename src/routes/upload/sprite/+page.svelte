<script lang="ts">
  import { goto } from '$app/navigation';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';
  import SpriteForm from '$lib/components/forms/SpriteForm.svelte';
  import { Button } from '$lib/components/ui/button';

  let form = $state({
    title: '', description: '',
    permissions: ['Credit'] as string[],
    targetedRoms: ['Emerald'] as string[],
    type: 'Battle',
    subtype: 'Pokemon',
    variantText: 'Front'
  });
  let files = $state<File[]>([]);
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    err = null;
    if (!files.length) { err = 'Pick at least one file'; return; }
    busy = true;
    try {
      const input = {
        title: form.title, description: form.description,
        permissions: form.permissions,
        targetedRoms: form.targetedRoms,
        category: { type: form.type, subtype: form.subtype, variant: form.variantText || undefined }
      };

      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'sprite',
          input,
          files: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size }))
        })
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { listingId, versionId, slug, uploads } = await presignRes.json();

      await Promise.all(uploads.map((u: any, i: number) =>
        fetch(u.url, { method: 'PUT', headers: { 'content-type': files[i].type || 'application/octet-stream' }, body: files[i] })
          .then((r) => { if (!r.ok) throw new Error(`R2 PUT failed for ${u.originalFilename}`); })
      ));

      const finalizeRes = await fetch('/api/uploads/finalize', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'sprite', listingId, versionId,
          files: uploads.map((u: any) => ({ r2Key: u.r2Key, filename: u.filename, originalFilename: u.originalFilename, size: u.size }))
        })
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());
      await goto(`/sprites/${slug}`);
    } catch (e: any) { err = e?.message ?? 'Upload failed'; }
    finally { busy = false; }
  }
</script>

<section class="mx-auto max-w-2xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Upload Sprites</h1>
  <form onsubmit={submit} class="grid gap-6">
    <SpriteForm bind:value={form} />
    <div>
      <label class="text-sm font-medium block mb-2">Sprite files</label>
      <FileDropzone bind:files accept=".png,.gif,.bmp,.zip" />
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Publish'}</Button>
  </form>
</section>

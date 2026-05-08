<script lang="ts">
  // Header banner for profile pages. Wraps the underlying R2-presigned
  // GET behind a same-origin URL so animated formats (gif/apng/webp)
  // render directly via <img> without extra work.
  let { bannerKey, alt = '' }: { bannerKey: string | null; alt?: string } = $props();
</script>

{#if bannerKey}
  <div class="relative w-full overflow-hidden rounded-lg border bg-muted/30 aspect-[3/1] max-h-64">
    <img
      src={`/api/banners/${bannerKey.replace(/^banners\//, '')}`}
      alt={alt}
      class="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
    />
  </div>
{/if}

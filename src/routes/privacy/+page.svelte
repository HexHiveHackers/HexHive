<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Privacy Policy — HexHive</title>
  <meta
    name="description"
    content="How HexHive collects, uses, and protects information about its users, with explicit GDPR-aligned rights and disclosures."
  />
  <link rel="canonical" href="/privacy" />
</svelte:head>

<div class="mx-auto max-w-screen-lg px-6 py-6 sm:py-12">
  <div class="prose prose-invert max-w-none">
    {@html data.html}
  </div>
</div>

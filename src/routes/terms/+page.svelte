<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Terms of Service — HexHive</title>
  <meta
    name="description"
    content="The terms governing use of HexHive, an independent fan-made hub for Pokémon ROM-hack assets."
  />
  <link rel="canonical" href="/terms" />
</svelte:head>

<div class="mx-auto max-w-screen-lg px-6 py-6 sm:py-12">
  <div class="prose prose-invert max-w-none">
    {@html data.html}
  </div>
</div>

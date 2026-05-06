<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  let { data, children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-svh flex flex-col">
  <Header user={data.user} />
  <div class="flex-1">{@render children()}</div>
  <Footer />
</div>

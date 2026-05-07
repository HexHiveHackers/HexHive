<script lang="ts">
  import '../app.css';
  import Footer from '$lib/components/layout/Footer.svelte';
  import Header from '$lib/components/layout/Header.svelte';

  let { data, children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
</svelte:head>

<div class="min-h-svh flex flex-col">
  <Header user={data.user} />
  <div class="flex-1">{@render children()}</div>
  <Footer />
</div>

<script lang="ts">
  import { page } from '$app/state';
  import '../app.css';
  import Footer from '$lib/components/layout/Footer.svelte';
  import Header from '$lib/components/layout/Header.svelte';

  let { data, children } = $props();

  // Site-wide social-card defaults. Listing detail pages emit their own
  // og:title/description/image overrides; FB/Twitter parsers honor the
  // last value they see in <head>, so per-page tags win when present.
  const ogImage = `${page.url.origin}/og-default.png`;
</script>

<svelte:head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <meta property="og:site_name" content="HexHive" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="HexHive — Pokemon ROM-hack asset hub" />
  <meta property="og:description" content="Browse and upload Pokemon ROM hacks, sprites, sounds, and scripts." />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="HexHive — Pokemon ROM-hack asset hub" />
  <meta name="twitter:description" content="Browse and upload Pokemon ROM hacks, sprites, sounds, and scripts." />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

<div class="min-h-svh flex flex-col">
  <Header user={data.user} />
  <div class="flex-1">{@render children()}</div>
  <Footer />
</div>

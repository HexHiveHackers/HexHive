<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import { Button } from '$lib/components/ui/button';

  let { user }: { user: { name: string; image?: string | null } | null } = $props();

  let mobileMenuOpen = $state(false);

  async function signOut() {
    await authClient.signOut();
    location.href = '/';
  }

  // Lock the page and pin the nav while the mobile menu is open. Sticky
  // loses its anchor when overflow:hidden removes the scroll context, so
  // we swap to fixed positioning explicitly via :global() rules below.
  $effect(() => {
    if (typeof window === 'undefined') return;
    if (mobileMenuOpen) {
      document.documentElement.classList.add('menu-open');
      return () => document.documentElement.classList.remove('menu-open');
    }
  });

  const navLinks = [
    { href: '/romhacks', label: 'Romhacks' },
    { href: '/sprites', label: 'Sprites' },
    { href: '/sounds', label: 'Sounds' },
    { href: '/scripts', label: 'Scripts' }
  ];
</script>

<header class="site-nav border-b bg-background sticky top-0 z-40">
  <div class="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
    <a
      href="/"
      class="font-display text-lg tracking-wider shrink-0"
      onclick={() => (mobileMenuOpen = false)}
    >
      HEXHIVE
    </a>

    <!-- Desktop nav -->
    <nav class="hidden lg:flex items-center gap-1 text-sm">
      {#each navLinks as link (link.href)}
        <a class="px-3 py-1 hover:underline" href={link.href}>{link.label}</a>
      {/each}
    </nav>

    <SearchBar />

    <div class="hidden lg:flex items-center gap-1 text-sm shrink-0">
      <span class="mr-1 h-5 w-px bg-border"></span>
      {#if user}
        <a class="px-3 py-1 hover:underline" href="/me">{user.name}</a>
        <Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
      {:else}
        <a class="px-3 py-1" href="/login">
          <Button variant="default" size="sm">Sign in</Button>
        </a>
      {/if}
    </div>

    <!-- Mobile hamburger (animated bars → X) -->
    <button
      type="button"
      class="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-md transition-colors hover:bg-accent active:bg-accent lg:hidden"
      onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileMenuOpen}
    >
      <span class="hamburger-bar {mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}"></span>
      <span class="hamburger-bar {mobileMenuOpen ? 'opacity-0' : ''}"></span>
      <span class="hamburger-bar {mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}"></span>
    </button>
  </div>

  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <button
      type="button"
      class="fixed inset-0 top-14 z-30 bg-black/60 lg:hidden"
      onclick={() => (mobileMenuOpen = false)}
      aria-label="Close menu"
      tabindex={-1}
    ></button>
    <div
      class="fixed left-0 right-0 top-14 z-40 border-t bg-background px-4 pb-4 lg:hidden"
    >
      {#each navLinks as link (link.href)}
        <a
          href={link.href}
          class="flex min-h-12 select-none items-center justify-center font-display text-sm tracking-wider hover:text-foreground/80"
          onclick={() => (mobileMenuOpen = false)}
        >
          {link.label}
        </a>
      {/each}
      <div class="mt-2 border-t pt-3 flex flex-col items-stretch gap-2">
        {#if user}
          <a
            href="/me"
            class="flex min-h-12 items-center justify-center text-sm hover:underline"
            onclick={() => (mobileMenuOpen = false)}
          >
            {user.name}
          </a>
          <Button variant="ghost" onclick={signOut}>Sign out</Button>
        {:else}
          <a href="/login" onclick={() => (mobileMenuOpen = false)}>
            <Button variant="default" class="w-full">Sign in</Button>
          </a>
        {/if}
      </div>
    </div>
  {/if}
</header>

<style>
  .hamburger-bar {
    width: 1.25rem;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
    transform-origin: center;
  }

  /* Mobile menu open: lock the page and pin the nav to the viewport.
     overflow:hidden removes sticky's scroll context, so we explicitly
     fix the nav while the menu is open. */
  :global(html.menu-open),
  :global(html.menu-open body) {
    overflow: hidden;
    touch-action: none;
  }
  :global(html.menu-open header.site-nav) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  }
</style>

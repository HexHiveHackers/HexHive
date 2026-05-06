<script lang="ts">
  import { LogOut, Settings, Upload, User as UserIcon } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { authClient } from '$lib/auth-client';
  import TypeIcon from '$lib/components/listings/TypeIcon.svelte';
  import Avatar from '$lib/components/profile/Avatar.svelte';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';

  type HeaderUser = {
    id: string;
    name: string;
    username: string;
    avatarKey: string | null;
  };
  let { user }: { user: HeaderUser | null } = $props();

  // Display the HexHive username if set; otherwise fall back to whatever the
  // OAuth provider gave us during the brief window before /me/setup.
  const displayName = $derived(user ? user.username || user.name : '');
  const profileHref = $derived(user?.username ? `/u/${user.username}` : '/me');

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

  type NavLink = { href: string; label: string; type: 'romhack' | 'sprite' | 'sound' | 'script' };
  const navLinks: NavLink[] = [
    { href: '/romhacks', label: 'Romhacks', type: 'romhack' },
    { href: '/sprites', label: 'Sprites', type: 'sprite' },
    { href: '/sounds', label: 'Sounds', type: 'sound' },
    { href: '/scripts', label: 'Scripts', type: 'script' },
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
        <a
          class="flex items-center gap-1.5 px-3 py-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          href={link.href}
        >
          <TypeIcon type={link.type} size={14} />
          <span>{link.label}</span>
        </a>
      {/each}
    </nav>

    <SearchBar />

    <div class="hidden lg:flex items-center gap-2 text-sm shrink-0">
      {#if user}
        <a href="/upload">
          <Button variant="default" size="sm">
            <Upload size={14} />
            Upload
          </Button>
        </a>
        <span class="mx-1 h-5 w-px bg-border"></span>
        <DropdownMenu>
          <DropdownMenuTrigger
            class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-colors"
            aria-label="Account menu"
          >
            <Avatar avatarKey={user.avatarKey} name={displayName} size={24} />
            <span>{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel class="text-xs text-muted-foreground font-normal">
              Signed in as <span class="font-medium text-foreground">@{user.username}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => goto(profileHref)} class="cursor-pointer">
              <UserIcon size={16} />
              Public profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => goto('/me')} class="cursor-pointer">
              <Settings size={16} />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} class="cursor-pointer">
              <LogOut size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div class="fixed left-0 right-0 top-14 z-40 border-t bg-background px-4 pb-4 lg:hidden">
      {#each navLinks as link (link.href)}
        <a
          href={link.href}
          class="flex min-h-12 select-none items-center justify-center gap-2 font-display text-sm tracking-wider hover:text-foreground/80"
          onclick={() => (mobileMenuOpen = false)}
        >
          <TypeIcon type={link.type} size={16} />
          {link.label}
        </a>
      {/each}
      <div class="mt-2 border-t pt-3 flex flex-col items-stretch gap-2">
        {#if user}
          <a href="/upload" onclick={() => (mobileMenuOpen = false)}>
            <Button variant="default" class="w-full">
              <Upload size={14} />
              Upload
            </Button>
          </a>
          <a
            href={profileHref}
            class="flex min-h-12 items-center justify-center gap-2 text-sm hover:underline"
            onclick={() => (mobileMenuOpen = false)}
          >
            <Avatar avatarKey={user.avatarKey} name={displayName} size={24} />
            <span>{displayName}</span>
          </a>
          <a
            href="/me"
            class="flex min-h-10 items-center justify-center gap-2 text-sm text-muted-foreground hover:underline"
            onclick={() => (mobileMenuOpen = false)}
          >
            <Settings size={14} />
            Account settings
          </a>
          <Button variant="ghost" onclick={signOut}>
            <LogOut size={14} />
            Sign out
          </Button>
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

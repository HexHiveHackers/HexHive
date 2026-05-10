<script lang="ts">
  import { SiDiscord } from '@icons-pack/svelte-simple-icons';
  import { FlaskConical, LogOut, Settings, Upload, User as UserIcon } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
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

  const DISCORD_URL = 'https://discord.gg/YSVdnqjHE';

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

  type NavLink = {
    href: string;
    label: string;
    type: 'romhack' | 'sprite' | 'sound' | 'script' | 'tool';
    accent: string;
  };
  // Rainbow sweep across the nav: rose → amber → emerald → sky → violet,
  // with fuchsia for the trailing MIDI Lab icon button. The 404 portal
  // grid mirrors the same order and colors.
  const navLinks: NavLink[] = [
    { href: '/sprites', label: 'Sprites', type: 'sprite', accent: '#fb7185' },
    { href: '/sounds', label: 'Sounds', type: 'sound', accent: '#f59e0b' },
    { href: '/scripts', label: 'Scripts', type: 'script', accent: '#10b981' },
    { href: '/tools', label: 'Tools', type: 'tool', accent: '#38bdf8' },
    { href: '/romhacks', label: 'Romhacks', type: 'romhack', accent: '#a78bfa' },
  ];

  // Highlight a nav entry when the current path is the section root or any
  // child route ('/sounds' or '/sounds/anything'). Exact match for '/'.
  const currentPath = $derived(page.url.pathname);
  function isActive(href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(`${href}/`);
  }
  const midiLabActive = $derived(currentPath.startsWith('/sounds/midi-lab'));
</script>

<header class="site-nav border-b bg-background sticky top-0 z-40">
  <div class="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
    <a
      href="/"
      class="font-display text-lg tracking-wider shrink-0 inline-flex items-center gap-2"
      onclick={() => (mobileMenuOpen = false)}
    >
      <img src="/favicon.ico" alt="" width="24" height="24" class="h-6 w-6" />
      HEXHIVE
    </a>

    <!-- Desktop nav -->
    <nav class="hidden lg:flex items-center gap-1 text-sm">
      {#each navLinks as link (link.href)}
        {@const active = isActive(link.href)}
        <a
          class="nav-link relative flex items-center gap-1.5 px-3 py-1 transition-colors {active
            ? 'nav-link--active font-medium'
            : 'text-muted-foreground'}"
          style="--nav-accent: {link.accent}"
          href={link.href}
          aria-current={active ? 'page' : undefined}
        >
          <TypeIcon type={link.type} size={14} />
          <span>{link.label}</span>
        </a>
      {/each}
    </nav>

    <SearchBar />

    <div class="hidden lg:flex items-center gap-2 text-sm shrink-0">
      <a
        href="/sounds/midi-lab"
        class="midi-lab-link inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors {midiLabActive
          ? 'bg-fuchsia-400/15 text-fuchsia-300'
          : 'text-muted-foreground hover:bg-fuchsia-400/10 hover:text-fuchsia-300'}"
        aria-label="MIDI lab demo (WIP)"
        aria-current={midiLabActive ? 'page' : undefined}
        title="MIDI lab demo (WIP)"
      >
        <FlaskConical size={16} />
      </a>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="discord-link inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
        aria-label="Join HexHive on Discord"
        title="Join HexHive on Discord"
      >
        <SiDiscord size={16} title="Join HexHive on Discord" />
      </a>
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
        {@const active = isActive(link.href)}
        <a
          href={link.href}
          class="nav-link-mobile flex min-h-12 select-none items-center justify-center gap-2 font-display text-sm tracking-wider transition-colors {active
            ? 'nav-link-mobile--active'
            : 'text-muted-foreground'}"
          style="--nav-accent: {link.accent}"
          aria-current={active ? 'page' : undefined}
          onclick={() => (mobileMenuOpen = false)}
        >
          <TypeIcon type={link.type} size={16} />
          {link.label}
        </a>
      {/each}
      <a
        href="/sounds/midi-lab"
        class="flex min-h-12 select-none items-center justify-center gap-2 text-sm transition-colors {midiLabActive
          ? 'text-fuchsia-300'
          : 'text-muted-foreground hover:text-fuchsia-300'}"
        aria-current={midiLabActive ? 'page' : undefined}
        onclick={() => (mobileMenuOpen = false)}
      >
        <FlaskConical size={16} />
        MIDI lab
      </a>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="discord-link flex min-h-12 select-none items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[#5865F2]"
        onclick={() => (mobileMenuOpen = false)}
      >
        <SiDiscord size={16} title="Join HexHive on Discord" />
        Discord
      </a>
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
  /* Per-type tinted nav. Hover lifts the muted text to white with a soft
     accent glow; active draws a flat 2px underline in the type's accent
     color, label stays white. No pill, no rounded background.

     Selectors are ordered low→high specificity to keep biome's
     noDescendingSpecificity happy. */
  .nav-link {
    transition: color 0.18s ease, text-shadow 0.18s ease;
  }
  .nav-link--active {
    color: var(--foreground);
  }
  .nav-link--active :global(svg) {
    color: var(--nav-accent);
  }
  .nav-link--active::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 2px;
    background: var(--nav-accent);
  }
  .nav-link:hover {
    color: var(--foreground);
    text-shadow: 0 0 12px color-mix(in oklch, var(--nav-accent) 55%, transparent);
  }
  .nav-link:hover :global(svg) {
    color: var(--nav-accent);
  }

  .nav-link-mobile {
    transition: color 0.18s ease;
    position: relative;
  }
  .nav-link-mobile--active {
    color: var(--foreground);
  }
  .nav-link-mobile--active :global(svg) {
    color: var(--nav-accent);
  }
  .nav-link-mobile--active::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 6px;
    width: 32px;
    height: 2px;
    background: var(--nav-accent);
    transform: translateX(-50%);
  }
  .nav-link-mobile:hover {
    color: var(--foreground);
  }
  .nav-link-mobile:hover :global(svg) {
    color: var(--nav-accent);
  }

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

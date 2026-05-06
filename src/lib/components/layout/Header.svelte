<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import { Button } from '$lib/components/ui/button';

  let { user }: { user: { name: string; image?: string | null } | null } = $props();

  async function signOut() {
    await authClient.signOut();
    location.href = '/';
  }
</script>

<header class="border-b bg-background sticky top-0 z-10">
  <div class="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
    <a href="/" class="font-display text-lg tracking-wider shrink-0">HEXHIVE</a>
    <nav class="flex items-center gap-1 text-sm">
      <a class="px-3 py-1 hover:underline" href="/romhacks">Romhacks</a>
      <a class="px-3 py-1 hover:underline" href="/sprites">Sprites</a>
      <a class="px-3 py-1 hover:underline" href="/sounds">Sounds</a>
      <a class="px-3 py-1 hover:underline" href="/scripts">Scripts</a>
    </nav>
    <SearchBar />
    <div class="flex items-center gap-1 text-sm shrink-0">
      <span class="mr-1 h-5 w-px bg-border hidden sm:block"></span>
      {#if user}
        <a class="px-3 py-1 hover:underline" href="/me">{user.name}</a>
        <Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
      {:else}
        <a class="px-3 py-1" href="/login">
          <Button variant="default" size="sm">Sign in</Button>
        </a>
      {/if}
    </div>
  </div>
</header>

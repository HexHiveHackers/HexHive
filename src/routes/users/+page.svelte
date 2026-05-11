<script lang="ts">
  import { ChevronDown, Code2, Search, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { Input } from '$lib/components/ui/input';
  import FilterBar from '$lib/components/users/FilterBar.svelte';
  import HhqlInput from '$lib/components/users/HhqlInput.svelte';
  import UserCard from '$lib/components/users/UserCard.svelte';
  import { evaluate, parseHhql } from '$lib/hhql';
  import { type DirectoryRow, fieldsUsers } from '$lib/hhql/fields-users';

  let { data } = $props();

  let query = $state(untrack(() => data.q));
  let searchText = $state(untrack(() => data.text));
  let sort = $state(untrack(() => data.sort));
  let mode = $state<'text' | 'hhql'>(untrack(() => (data.q.length > 0 ? 'hhql' : 'text')));

  const ast = $derived(parseHhql(query));
  const hhqlFiltered = $derived(
    ast.ok && ast.ast
      ? data.users.filter((u: DirectoryRow) => {
          const a = ast.ast;
          if (!a) return true;
          return evaluate(a, u, fieldsUsers);
        })
      : data.users,
  );
  const filtered = $derived.by(() => {
    const t = searchText.trim().toLowerCase();
    if (!t) return hhqlFiltered;
    return hhqlFiltered.filter((u: DirectoryRow) => {
      if (u.username.toLowerCase().includes(t)) return true;
      if (u.alias?.toLowerCase().includes(t)) return true;
      if (u.bio?.toLowerCase().includes(t)) return true;
      return false;
    });
  });
  const sorted = $derived(applySort(filtered, sort));

  const byUsername = (a: DirectoryRow, b: DirectoryRow) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });

  const claimed = $derived(sorted.filter((u: DirectoryRow) => !u.isPlaceholder));
  const unclaimedContributors = $derived(
    sorted.filter((u: DirectoryRow) => u.isPlaceholder && u.placeholderKind === 'contributor').sort(byUsername),
  );
  const unclaimedUsers = $derived(
    sorted.filter((u: DirectoryRow) => u.isPlaceholder && u.placeholderKind === 'user').sort(byUsername),
  );

  const affiliations = $derived(
    Array.from(new Set(data.users.flatMap((u: DirectoryRow) => u.affiliations.map((x) => x.name)))).sort(),
  );

  // URL state sync (debounced)
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const q = query;
    const t = searchText;
    const s = sort;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const url = new URL(page.url);
      if (q.length > 0) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      if (t.length > 0) url.searchParams.set('text', t);
      else url.searchParams.delete('text');
      if (s !== 'active:desc') url.searchParams.set('sort', s);
      else url.searchParams.delete('sort');
      replaceState(url, {});
    }, 150);
  });

  function applySort(rows: DirectoryRow[], sortKey: string): DirectoryRow[] {
    const [field, dir] = sortKey.split(':');
    const sign = dir === 'asc' ? 1 : -1;
    const cmpNum = (a: number | null, b: number | null): number => {
      const aa = a ?? Number.NEGATIVE_INFINITY;
      const bb = b ?? Number.NEGATIVE_INFINITY;
      if (aa === bb) return 0;
      return aa > bb ? sign : -sign;
    };
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (field) {
        case 'joined':
          return cmpNum(a.joinedAt, b.joinedAt);
        case 'downloads':
          return cmpNum(a.totalDownloads, b.totalDownloads);
        case 'listings':
          return cmpNum(
            Object.values(a.listingsByType).reduce((x, y) => x + y, 0),
            Object.values(b.listingsByType).reduce((x, y) => x + y, 0),
          );
        case 'username':
          return sign * a.username.localeCompare(b.username);
        default:
          return cmpNum(a.lastActive, b.lastActive);
      }
    });
    return arr;
  }
</script>

<svelte:head><title>Users · HexHive</title></svelte:head>

<section class="mx-auto max-w-5xl px-4 py-10 grid gap-6">
  <header class="grid gap-2">
    <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Directory</span>
    <h1 class="font-display text-2xl">Users</h1>
    <p class="text-sm text-muted-foreground">Everyone with a HexHive account. Filter by what they make and how active they are.</p>
  </header>

  <div class="grid gap-2">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex-1 min-w-64">
        {#if mode === 'text'}
          <div class="relative">
            <Search aria-hidden="true" class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              class="pl-9 pr-9"
              placeholder="Search by username, alias, or bio…"
              bind:value={searchText}
            />
            {#if searchText.length > 0}
              <button
                type="button"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Clear search"
                onclick={() => (searchText = '')}
              >
                <X aria-hidden="true" class="size-3.5" />
              </button>
            {/if}
          </div>
        {:else}
          <HhqlInput bind:value={query} />
        {/if}
      </div>
      <div
        role="radiogroup"
        aria-label="Query mode"
        class="inline-flex h-8 items-center rounded-md border border-input bg-input/30 p-0.5 text-xs"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'text'}
          class="inline-flex h-full items-center gap-1 rounded px-2 transition-colors {mode === 'text'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (mode = 'text')}
        >
          <Search aria-hidden="true" class="size-3.5" />
          <span>Search</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'hhql'}
          class="inline-flex h-full items-center gap-1 rounded px-2 transition-colors {mode === 'hhql'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (mode = 'hhql')}
        >
          <Code2 aria-hidden="true" class="size-3.5" />
          <span>HHQL</span>
        </button>
      </div>
      <select class="rounded border bg-card text-xs px-2 py-1 shrink-0 h-8" bind:value={sort}>
        <option value="active:desc">Sort: recent</option>
        <option value="downloads:desc">Sort: downloads</option>
        <option value="listings:desc">Sort: listings</option>
        <option value="joined:desc">Sort: joined</option>
        <option value="username:asc">Sort: username</option>
      </select>
    </div>
    <FilterBar bind:query {affiliations} />
  </div>

  <details open class="group/users grid gap-3">
    <summary class="-mx-2 flex items-center gap-2 cursor-pointer list-none select-none rounded px-2 py-1 transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
      <ChevronDown class="size-4 text-muted-foreground transition-transform group-[&:not([open])]/users:-rotate-90" />
      <h2 class="font-display text-sm uppercase tracking-[0.14em] text-muted-foreground group-hover/users:text-foreground">
        Members <span class="text-foreground/60">· {claimed.length}</span>
      </h2>
    </summary>
    {#if data.users.length === 0}
      <p class="text-sm text-muted-foreground">No members yet.</p>
    {:else if claimed.length === 0 && unclaimedContributors.length === 0 && unclaimedUsers.length === 0}
      <p class="text-sm text-muted-foreground">
        No users match this query —
        <button type="button" class="underline" onclick={() => (query = '')}>clear</button>
      </p>
    {:else if claimed.length === 0}
      <p class="text-sm text-muted-foreground">No claimed users match this query.</p>
    {:else}
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each claimed as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    {/if}
  </details>

  {#if unclaimedContributors.length > 0}
    <details open class="group/contrib grid gap-3">
      <summary class="-mx-2 flex items-start gap-2 cursor-pointer list-none select-none rounded px-2 py-1 transition-colors hover:bg-amber-300/10 [&::-webkit-details-marker]:hidden">
        <ChevronDown class="size-4 mt-0.5 text-amber-300 transition-transform group-[&:not([open])]/contrib:-rotate-90" />
        <div class="grid gap-1">
          <h2 class="font-display text-sm uppercase tracking-[0.14em] text-amber-300">
            Unclaimed contributors <span class="text-amber-300/60">· {unclaimedContributors.length}</span>
          </h2>
          <p class="text-xs text-muted-foreground">
            Profiles HexHive created on behalf of original asset creators. If one is yours, sign in with the matching provider to claim it.
          </p>
        </div>
      </summary>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedContributors as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    </details>
  {/if}

  {#if unclaimedUsers.length > 0}
    <details open class="group/users2 grid gap-3">
      <summary class="-mx-2 flex items-start gap-2 cursor-pointer list-none select-none rounded px-2 py-1 transition-colors hover:bg-sky-300/10 [&::-webkit-details-marker]:hidden">
        <ChevronDown class="size-4 mt-0.5 text-sky-300 transition-transform group-[&:not([open])]/users2:-rotate-90" />
        <div class="grid gap-1">
          <h2 class="font-display text-sm uppercase tracking-[0.14em] text-sky-300">
            Unclaimed users <span class="text-sky-300/60">· {unclaimedUsers.length}</span>
          </h2>
          <p class="text-xs text-muted-foreground">
            People we wanted to credit or track but who don't have any assets attached yet. Tool developers, community figures, etc.
          </p>
        </div>
      </summary>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedUsers as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    </details>
  {/if}
</section>

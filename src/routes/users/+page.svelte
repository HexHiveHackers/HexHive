<script lang="ts">
  import { untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import FilterBar from '$lib/components/users/FilterBar.svelte';
  import HhqlInput from '$lib/components/users/HhqlInput.svelte';
  import UserCard from '$lib/components/users/UserCard.svelte';
  import { evaluate, parseHhql } from '$lib/hhql';
  import { type DirectoryRow, fieldsUsers } from '$lib/hhql/fields-users';

  let { data } = $props();

  let query = $state(untrack(() => data.q));
  let sort = $state(untrack(() => data.sort));
  let editorOpen = $state(untrack(() => data.q.length > 0));

  const ast = $derived(parseHhql(query));
  const filtered = $derived(
    ast.ok && ast.ast
      ? data.users.filter((u: DirectoryRow) => {
          const a = ast.ast;
          if (!a) return true;
          return evaluate(a, u, fieldsUsers);
        })
      : data.users,
  );
  const sorted = $derived(applySort(filtered, sort));
  const claimed = $derived(sorted.filter((u: DirectoryRow) => !u.isPlaceholder));
  const unclaimedContributors = $derived(
    sorted.filter((u: DirectoryRow) => u.isPlaceholder && u.placeholderKind === 'contributor'),
  );
  const unclaimedUsers = $derived(
    sorted.filter((u: DirectoryRow) => u.isPlaceholder && u.placeholderKind === 'user'),
  );

  const affiliations = $derived(
    Array.from(new Set(data.users.flatMap((u: DirectoryRow) => u.affiliations.map((x) => x.name)))).sort(),
  );

  // URL state sync (debounced)
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const q = query;
    const s = sort;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const url = new URL(page.url);
      if (q.length > 0) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
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
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <FilterBar bind:query {affiliations} />
      <div class="flex items-center gap-1">
        <select class="rounded border bg-card text-xs px-2 py-1" bind:value={sort}>
          <option value="active:desc">Sort: recent</option>
          <option value="downloads:desc">Sort: downloads</option>
          <option value="listings:desc">Sort: listings</option>
          <option value="joined:desc">Sort: joined</option>
          <option value="username:asc">Sort: username</option>
        </select>
        <button
          type="button"
          class="rounded border bg-card text-xs px-2 py-1 font-mono"
          onclick={() => (editorOpen = !editorOpen)}
          aria-pressed={editorOpen}
        >{editorOpen ? '×' : '</>'}</button>
      </div>
    </div>
    {#if editorOpen}
      <HhqlInput bind:value={query} />
    {/if}
  </div>

  <div class="grid gap-3">
    <h2 class="font-display text-sm uppercase tracking-[0.14em] text-muted-foreground">Members</h2>
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
  </div>

  {#if unclaimedContributors.length > 0}
    <div class="grid gap-3">
      <div class="grid gap-1">
        <h2 class="font-display text-sm uppercase tracking-[0.14em] text-amber-300">Unclaimed contributors</h2>
        <p class="text-xs text-muted-foreground">
          Profiles HexHive created on behalf of original asset creators. If one is yours, sign in with the matching provider to claim it.
        </p>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedContributors as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    </div>
  {/if}

  {#if unclaimedUsers.length > 0}
    <div class="grid gap-3">
      <div class="grid gap-1">
        <h2 class="font-display text-sm uppercase tracking-[0.14em] text-sky-300">Unclaimed users</h2>
        <p class="text-xs text-muted-foreground">
          People we wanted to credit or track but who don't have any assets attached yet. Tool developers, community figures, etc.
        </p>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedUsers as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    </div>
  {/if}
</section>

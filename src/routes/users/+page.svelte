<script lang="ts">
  import UserCard from '$lib/components/users/UserCard.svelte';

  let { data } = $props();

  type Row = (typeof data.users)[number];
  const claimed = $derived(data.users.filter((u) => !u.isPlaceholder));
  const unclaimedContributors = $derived(
    data.users.filter((u) => u.isPlaceholder && u.placeholderKind === 'contributor'),
  );
  const unclaimedUsers = $derived(
    data.users.filter((u) => u.isPlaceholder && u.placeholderKind === 'user'),
  );
</script>

<svelte:head><title>Users · HexHive</title></svelte:head>

<section class="mx-auto max-w-5xl px-4 py-10 grid gap-10">
  <header class="grid gap-2">
    <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Directory</span>
    <h1 class="font-display text-2xl">Users</h1>
    <p class="text-sm text-muted-foreground">Everyone with a HexHive account, sorted by most recent activity.</p>
  </header>

  <div class="grid gap-3">
    <h2 class="font-display text-sm uppercase tracking-[0.14em] text-muted-foreground">Members</h2>
    {#if claimed.length === 0}
      <p class="text-sm text-muted-foreground">No members yet.</p>
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

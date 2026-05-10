<script lang="ts">
  import Avatar from '$lib/components/profile/Avatar.svelte';

  let { data } = $props();

  function relative(ms: number): string {
    const diff = Date.now() - ms;
    const s = Math.max(1, Math.round(diff / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.round(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.round(mo / 12)}y ago`;
  }

  function joinedLabel(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }

  type Row = (typeof data.users)[number];
  const claimed = $derived(data.users.filter((u) => !u.isPlaceholder));
  const byUsername = (a: Row, b: Row) => a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
  const unclaimedContributors = $derived(
    data.users.filter((u) => u.isPlaceholder && u.placeholderKind === 'contributor').sort(byUsername),
  );
  const unclaimedUsers = $derived(
    data.users.filter((u) => u.isPlaceholder && u.placeholderKind === 'user').sort(byUsername),
  );
</script>

{#snippet card(u: Row)}
  <li>
    <a
      href={`/u/${u.username}`}
      class="group flex items-start gap-3 rounded-lg border bg-card/40 p-4 transition-colors hover:border-primary/50 hover:bg-card"
    >
      <Avatar avatarKey={u.avatarKey} name={u.name || u.username} size={48} />
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2 flex-wrap">
          {#if u.alias}
            <span class="font-display text-sm group-hover:text-primary">{u.alias}</span>
            <span class="text-xs text-muted-foreground">@{u.username}</span>
          {:else}
            <span class="font-display text-sm group-hover:text-primary">@{u.username}</span>
          {/if}
          {#if u.pronouns}
            <span class="text-xs text-muted-foreground">{u.pronouns}</span>
          {/if}
        </div>
        {#if u.bio}
          <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{u.bio}</p>
        {/if}
        <div class="mt-2 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
          {#if u.isPlaceholder}
            <span class="italic opacity-70">
              Awaiting {u.placeholderKind === 'user' ? 'user' : 'contributor'}
            </span>
          {:else if u.lastActive}
            <span title={new Date(u.lastActive).toLocaleString()}>Active {relative(u.lastActive)}</span>
          {:else}
            <span class="italic opacity-70">Activity hidden</span>
          {/if}
          <span aria-hidden="true">·</span>
          <span>{u.isPlaceholder ? 'Indexed' : 'Joined'} {joinedLabel(u.joinedAt)}</span>
        </div>
      </div>
    </a>
  </li>
{/snippet}

<svelte:head><title>Users · HexHive</title></svelte:head>

<section class="mx-auto max-w-5xl px-4 py-10 grid gap-10">
  <header class="grid gap-2">
    <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Directory</span>
    <h1 class="font-display text-2xl">Users</h1>
    <p class="text-sm text-muted-foreground">Everyone with a HexHive account, sorted by most recent activity.</p>
  </header>

  <div class="grid gap-3">
    <h2 class="font-display text-sm uppercase tracking-[0.14em] text-muted-foreground">
      Members <span class="text-foreground/60">· {claimed.length}</span>
    </h2>
    {#if claimed.length === 0}
      <p class="text-sm text-muted-foreground">No members yet.</p>
    {:else}
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each claimed as u (u.username)}{@render card(u)}{/each}
      </ul>
    {/if}
  </div>

  {#if unclaimedContributors.length > 0}
    <div class="grid gap-3">
      <div class="grid gap-1">
        <h2 class="font-display text-sm uppercase tracking-[0.14em] text-amber-300">
          Unclaimed contributors <span class="text-amber-300/60">· {unclaimedContributors.length}</span>
        </h2>
        <p class="text-xs text-muted-foreground">
          Profiles HexHive created on behalf of original asset creators. If one is yours, sign in with the matching provider to claim it.
        </p>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedContributors as u (u.username)}{@render card(u)}{/each}
      </ul>
    </div>
  {/if}

  {#if unclaimedUsers.length > 0}
    <div class="grid gap-3">
      <div class="grid gap-1">
        <h2 class="font-display text-sm uppercase tracking-[0.14em] text-sky-300">
          Unclaimed users <span class="text-sky-300/60">· {unclaimedUsers.length}</span>
        </h2>
        <p class="text-xs text-muted-foreground">
          People we wanted to credit or track but who don't have any assets attached yet. Tool developers, community figures, etc.
        </p>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimedUsers as u (u.username)}{@render card(u)}{/each}
      </ul>
    </div>
  {/if}
</section>

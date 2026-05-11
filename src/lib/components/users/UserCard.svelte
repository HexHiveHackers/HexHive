<script lang="ts">
  import Avatar from '$lib/components/profile/Avatar.svelte';

  interface Props {
    user: {
      username: string;
      alias?: string | null;
      name?: string | null;
      avatarKey?: string | null;
      pronouns?: string | null;
      bio?: string | null;
      lastActive: number | null;
      joinedAt: number;
      isPlaceholder: boolean;
      placeholderKind?: 'contributor' | 'user';
      fromTeamAquaRepo?: boolean;
    };
  }

  let { user }: Props = $props();

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
</script>

<li>
  <a
    href={`/u/${user.username}`}
    class="group flex items-start gap-3 rounded-lg border bg-card/40 p-4 transition-colors hover:border-primary/50 hover:bg-card"
  >
    <Avatar avatarKey={user.avatarKey ?? null} name={user.name || user.username} size={48} />
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2 flex-wrap">
        {#if user.alias}
          <span class="font-display text-sm group-hover:text-primary">{user.alias}</span>
          <span class="text-xs text-muted-foreground">@{user.username}</span>
        {:else}
          <span class="font-display text-sm group-hover:text-primary">@{user.username}</span>
        {/if}
        {#if user.pronouns}
          <span class="text-xs text-muted-foreground">{user.pronouns}</span>
        {/if}
      </div>
      <div class="mt-1 min-h-[2lh] text-xs text-muted-foreground">
        {#if user.bio}
          <p class="line-clamp-2">{user.bio}</p>
        {:else if user.isPlaceholder && user.fromTeamAquaRepo}
          <p class="line-clamp-2 italic opacity-80">
            Contributor on Team Aqua's asset repo. Imported as a HexHive seed.
          </p>
        {/if}
      </div>
      <div class="mt-2 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
        {#if user.isPlaceholder}
          <span class="italic opacity-70">
            Awaiting {user.placeholderKind === 'user' ? 'user' : 'contributor'}
          </span>
        {:else if user.lastActive}
          <span title={new Date(user.lastActive).toLocaleString()}>Active {relative(user.lastActive)}</span>
        {:else}
          <span class="italic opacity-70">Activity hidden</span>
        {/if}
        <span aria-hidden="true">·</span>
        <span>{user.isPlaceholder ? 'Indexed' : 'Joined'} {joinedLabel(user.joinedAt)}</span>
      </div>
    </div>
  </a>
</li>

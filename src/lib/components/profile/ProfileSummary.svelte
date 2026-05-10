<script lang="ts">
  import { Mail } from '@lucide/svelte';
  import Avatar from './Avatar.svelte';

  let { profile }: {
    profile: {
      username: string;
      alias?: string | null;
      pronouns?: string | null;
      bio: string | null;
      contactEmail?: string | null;
      name: string;
      avatarKey: string | null;
      lastActive?: number | null;
    };
  } = $props();

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
</script>

<div class="border rounded-lg p-6 flex items-start gap-4">
  <Avatar avatarKey={profile.avatarKey} name={profile.name || profile.username} size={64} />
  <div>
    <div class="flex items-baseline gap-2 flex-wrap">
      {#if profile.alias}
        <h1 class="font-display text-2xl">{profile.alias}</h1>
        <span class="text-sm text-muted-foreground">@{profile.username}</span>
      {:else}
        <h1 class="font-display text-2xl">@{profile.username}</h1>
      {/if}
      {#if profile.pronouns}
        <span class="text-sm text-muted-foreground">{profile.pronouns}</span>
      {/if}
    </div>
    {#if profile.name && profile.name !== profile.alias}<p class="text-sm text-muted-foreground mt-1">{profile.name}</p>{/if}
    {#if profile.bio}<p class="mt-3 whitespace-pre-line">{profile.bio}</p>{/if}
    {#if profile.contactEmail}
      <p class="mt-3 text-sm text-muted-foreground inline-flex items-center gap-1.5">
        <Mail size={14} />
        <a href={`mailto:${profile.contactEmail}`} class="hover:text-foreground hover:underline">{profile.contactEmail}</a>
      </p>
    {/if}
    {#if profile.lastActive}
      <p class="mt-2 text-xs text-muted-foreground" title={new Date(profile.lastActive).toLocaleString()}>
        Last active {relative(profile.lastActive)}
      </p>
    {/if}
  </div>
</div>

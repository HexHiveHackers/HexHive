<script lang="ts">
  import { Mail } from '@lucide/svelte';
  import Avatar from './Avatar.svelte';

  let {
    profile,
    aliases = [],
  }: {
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
    // "Also known as" entries — rendered as chips directly under the
    // display-name row so they sit visually with the user's identity
    // rather than as a separate section further down the page.
    aliases?: { id: string; value: string }[];
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
    {#if profile.name && profile.name !== profile.alias && profile.name.toLowerCase() !== profile.username.toLowerCase()}
      <p class="text-sm text-muted-foreground mt-1">{profile.name}</p>
    {/if}
    {#if aliases.length > 0}
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <span class="font-display text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/70" aria-label="Also known as">aka</span>
        <ul class="flex flex-wrap gap-1.5">
          {#each aliases as a (a.id)}
            <li>
              <span
                class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/15"
                title="Also known as {a.value}"
              >
                {a.value.replace(/^@/, '')}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
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

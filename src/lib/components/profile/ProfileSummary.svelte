<script lang="ts">
  import { Mail } from '@lucide/svelte';
  import Avatar from './Avatar.svelte';

  let { profile }: {
    profile: {
      username: string;
      pronouns?: string | null;
      bio: string | null;
      contactEmail?: string | null;
      name: string;
      avatarKey: string | null;
    };
  } = $props();
</script>

<div class="border rounded-lg p-6 flex items-start gap-4">
  <Avatar avatarKey={profile.avatarKey} name={profile.name || profile.username} size={64} />
  <div>
    <div class="flex items-baseline gap-2 flex-wrap">
      <h1 class="font-display text-2xl">@{profile.username}</h1>
      {#if profile.pronouns}
        <span class="text-sm text-muted-foreground">{profile.pronouns}</span>
      {/if}
    </div>
    {#if profile.name}<p class="text-sm text-muted-foreground mt-1">{profile.name}</p>{/if}
    {#if profile.bio}<p class="mt-3 whitespace-pre-line">{profile.bio}</p>{/if}
    {#if profile.contactEmail}
      <p class="mt-3 text-sm text-muted-foreground inline-flex items-center gap-1.5">
        <Mail size={14} />
        <a href={`mailto:${profile.contactEmail}`} class="hover:text-foreground hover:underline">{profile.contactEmail}</a>
      </p>
    {/if}
  </div>
</div>

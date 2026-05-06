<script lang="ts">
  let { profile }: {
    profile: { username: string; bio: string | null; name: string };
  } = $props();
</script>

<div class="border rounded-lg p-6">
  <h1 class="font-display text-2xl">@{profile.username}</h1>
  {#if profile.name}<p class="text-sm text-muted-foreground mt-1">{profile.name}</p>{/if}
  {#if profile.bio}<p class="mt-3 whitespace-pre-line">{profile.bio}</p>{/if}
</div>

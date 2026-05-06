<script lang="ts">
  import AvatarUpload from '$lib/components/profile/AvatarUpload.svelte';
  import ProfileForm from '$lib/components/profile/ProfileForm.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-10">
  <div>
    <h1 class="font-display text-2xl mb-4">Your profile</h1>
    <div class="grid gap-6">
      <AvatarUpload avatarKey={data.profile.avatarKey} name={data.profile.name} />
      <ProfileForm initial={data.profile} />
    </div>
  </div>

  <div>
    <h2 class="font-display text-xl mb-4">Drafts</h2>
    {#if data.drafts.length === 0}
      <p class="text-sm text-muted-foreground">No drafts.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.drafts as l}
          <li class="border rounded p-3 flex items-center justify-between text-sm">
            <span>{l.title}</span>
            <Badge variant="outline">{l.type}</Badge>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div>
    <h2 class="font-display text-xl mb-4">Published</h2>
    {#if data.published.length === 0}
      <p class="text-sm text-muted-foreground">Nothing published yet.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.published as l}
          <li class="border rounded p-3 flex items-center justify-between text-sm">
            <a href={`/${route(l.type)}/${l.slug}`} class="hover:underline">{l.title}</a>
            <span class="flex items-center gap-2">
              <Badge variant="outline">{l.type}</Badge>
              <span class="text-muted-foreground">{l.downloads} ↓</span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

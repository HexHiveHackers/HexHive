<script lang="ts">
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-8">
  <ProfileSummary profile={data.profile} />
  <div>
    <h2 class="font-display text-xl mb-4">Uploads</h2>
    {#if data.listings.length === 0}
      <p class="text-sm text-muted-foreground">No uploads yet.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.listings as l}
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

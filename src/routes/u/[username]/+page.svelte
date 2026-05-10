<script lang="ts">
  import Banner from '$lib/components/profile/Banner.svelte';
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-6">
  <Banner bannerKey={data.profile.bannerKey} alt={`${data.profile.username}'s banner`} />
  {#if data.profile.isPlaceholder}
    <div class="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
      <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-amber-300">Placeholder credit</span>
      <p class="mt-1 leading-relaxed">
        This account was created by HexHive on behalf of the original creator.
        {#if data.profile.homepageUrl}
          <a
            href={data.profile.homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-amber-200 underline-offset-2 hover:underline"
          >
            Visit creator
          </a>.
        {/if}
      </p>
    </div>
  {/if}
  <ProfileSummary profile={data.profile} />
  {#if data.affiliations.length > 0}
    <div>
      <h2 class="font-display text-xl mb-4">Affiliations</h2>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each data.affiliations as a (a.id)}
          <li class="rounded-md border bg-card/40 px-3 py-2 text-sm">
            <div class="flex items-baseline gap-2 flex-wrap">
              {#if a.url}
                <a href={a.url} target="_blank" rel="noopener noreferrer" class="font-medium hover:text-primary hover:underline">{a.name}</a>
              {:else}
                <span class="font-medium">{a.name}</span>
              {/if}
              {#if a.role}
                <span class="text-xs text-muted-foreground">— {a.role}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
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

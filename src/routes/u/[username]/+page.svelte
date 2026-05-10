<script lang="ts">
  import { Pencil } from '@lucide/svelte';
  import Banner from '$lib/components/profile/Banner.svelte';
  import HostIcon from '$lib/components/profile/HostIcon.svelte';
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { detectLinkHost, hostLabel } from '$lib/utils/link-host';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
  const isOwnProfile = $derived(data.user?.username === data.profile.username);

  type LinkRow = { id: string; url: string; label: string | null };
  function linkLabel(l: LinkRow): string {
    if (l.label) return l.label;
    const h = detectLinkHost(l.url);
    if (h) return hostLabel(h);
    try {
      return new URL(l.url).hostname.replace(/^www\./, '');
    } catch {
      return l.url;
    }
  }
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-6">
  <div class="relative">
    <Banner bannerKey={data.profile.bannerKey} alt={`${data.profile.username}'s banner`} />
    {#if isOwnProfile}
      <a
        href="/me"
        title="Edit profile"
        aria-label="Edit profile"
        class="absolute top-3 right-3 inline-flex items-center justify-center size-9 rounded-md border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:bg-background hover:text-primary"
      >
        <Pencil class="size-4" />
      </a>
    {/if}
  </div>
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
  {#if data.aliases.length > 0}
    <div>
      <h2 class="font-display text-xl mb-3">Also known as</h2>
      <ul class="flex flex-wrap gap-2">
        {#each data.aliases as a (a.id)}
          <li>
            <span class="rounded-full border bg-card/40 px-3 py-1 text-xs text-muted-foreground">{a.value}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if data.links.length > 0}
    <div>
      <h2 class="font-display text-xl mb-3">Links</h2>
      <ul class="flex flex-wrap gap-2">
        {#each data.links as l (l.id)}
          <li>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-full border bg-card/40 px-3 py-1 text-xs hover:border-primary/50 hover:bg-card hover:text-primary transition-colors"
            >
              <HostIcon url={l.url} size={12} />
              <span>{linkLabel(l)}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if data.affiliations.length > 0}
    <div>
      <h2 class="font-display text-xl mb-4">Affiliations</h2>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each data.affiliations as a (a.id)}
          <li class="rounded-md border bg-card/40 px-3 py-2 text-sm">
            <div class="flex items-center gap-2 flex-wrap">
              {#if a.url}
                <span class="shrink-0 text-muted-foreground"><HostIcon url={a.url} /></span>
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

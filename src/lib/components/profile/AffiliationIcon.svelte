<script lang="ts">
  import {
    SiBluesky,
    SiDiscord,
    SiGithub,
    SiGitlab,
    SiItchdotio,
    SiMastodon,
    SiReddit,
    SiTwitch,
    SiX,
    SiYoutube,
  } from '@icons-pack/svelte-simple-icons';
  import { Link as LinkIcon } from '@lucide/svelte';
  import type { AffiliationHost } from '$lib/utils/affiliation-host';
  import { detectAffiliationHost } from '$lib/utils/affiliation-host';

  let { url, size = 14 }: { url: string | null | undefined; size?: number } = $props();

  const host = $derived<AffiliationHost | null>(detectAffiliationHost(url));

  // PokeCommunity has no simple-icons entry. We render its forum-style
  // "PC" wordmark as a tiny inline badge so it visually matches the
  // simple-icons set and is recognisable to PC veterans.
</script>

{#if host === 'github'}
  <SiGithub {size} title="GitHub" />
{:else if host === 'gitlab'}
  <SiGitlab {size} title="GitLab" color="#FC6D26" />
{:else if host === 'discord'}
  <SiDiscord {size} title="Discord" color="#5865F2" />
{:else if host === 'youtube'}
  <SiYoutube {size} title="YouTube" color="#FF0000" />
{:else if host === 'twitch'}
  <SiTwitch {size} title="Twitch" color="#9146FF" />
{:else if host === 'reddit'}
  <SiReddit {size} title="Reddit" color="#FF4500" />
{:else if host === 'twitter'}
  <SiX {size} title="X" />
{:else if host === 'bluesky'}
  <SiBluesky {size} title="Bluesky" color="#0085FF" />
{:else if host === 'mastodon'}
  <SiMastodon {size} title="Mastodon" color="#6364FF" />
{:else if host === 'itchio'}
  <SiItchdotio {size} title="itch.io" color="#FA5C5C" />
{:else if host === 'pokecommunity'}
  <span
    class="font-display inline-flex items-center justify-center rounded-sm bg-sky-500/15 text-sky-300 leading-none"
    style="width: {size}px; height: {size}px; font-size: {Math.max(7, Math.round(size * 0.5))}px;"
    title="PokéCommunity"
    aria-label="PokéCommunity"
  >
    PC
  </span>
{:else if url}
  <LinkIcon {size} aria-label="External link" />
{/if}

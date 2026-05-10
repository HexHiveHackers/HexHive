<script lang="ts">
  import {
    SiArtstation,
    SiBandcamp,
    SiBehance,
    SiBluesky,
    SiBuymeacoffee,
    SiDeviantart,
    SiDiscord,
    SiFacebook,
    SiGamejolt,
    SiGithub,
    SiGitlab,
    SiInstagram,
    SiItchdotio,
    SiKofi,
    SiLinktree,
    SiMastodon,
    SiNewgrounds,
    SiPatreon,
    SiPixiv,
    SiReddit,
    SiSoundcloud,
    SiSpotify,
    SiThreads,
    SiTiktok,
    SiTumblr,
    SiTwitch,
    SiX,
    SiYoutube,
  } from '@icons-pack/svelte-simple-icons';
  import { Link as LinkIcon } from '@lucide/svelte';
  import type { LinkHost } from '$lib/utils/link-host';
  import { detectLinkHost } from '$lib/utils/link-host';

  let { url, size = 14 }: { url: string | null | undefined; size?: number } = $props();

  const host = $derived<LinkHost | null>(detectLinkHost(url));

  // Tiny wordmark badge for sites without a simple-icons entry — keeps
  // the visual rhythm of the icon set while staying recognisable to
  // people familiar with the source community.
  // Static class strings so Tailwind's JIT picks them up at build time —
  // bg-foo-500/15 + text-foo-300 can't be templated.
  const TEXT_BADGES: Partial<Record<LinkHost, { text: string; classes: string }>> = {
    pokecommunity: { text: 'PC', classes: 'bg-sky-500/15 text-sky-300' },
    'pokemon-showdown': { text: 'PS', classes: 'bg-amber-500/15 text-amber-300' },
    serebii: { text: 'S', classes: 'bg-emerald-500/15 text-emerald-300' },
    whackahack: { text: 'WA', classes: 'bg-rose-500/15 text-rose-300' },
    smogon: { text: 'SM', classes: 'bg-violet-500/15 text-violet-300' },
    bulbapedia: { text: 'B', classes: 'bg-lime-500/15 text-lime-300' },
  };

  const badge = $derived(host && host in TEXT_BADGES ? TEXT_BADGES[host as keyof typeof TEXT_BADGES] : null);
</script>

{#if host === 'github'}
  <SiGithub {size} title="GitHub" />
{:else if host === 'gitlab'}
  <SiGitlab {size} title="GitLab" color="#FC6D26" />
{:else if host === 'discord'}
  <SiDiscord {size} title="Discord" color="#5865F2" />
{:else if host === 'reddit'}
  <SiReddit {size} title="Reddit" color="#FF4500" />
{:else if host === 'twitter'}
  <SiX {size} title="X" />
{:else if host === 'bluesky'}
  <SiBluesky {size} title="Bluesky" color="#0085FF" />
{:else if host === 'mastodon'}
  <SiMastodon {size} title="Mastodon" color="#6364FF" />
{:else if host === 'threads'}
  <SiThreads {size} title="Threads" />
{:else if host === 'tumblr'}
  <SiTumblr {size} title="Tumblr" color="#36465D" />
{:else if host === 'instagram'}
  <SiInstagram {size} title="Instagram" color="#E4405F" />
{:else if host === 'facebook'}
  <SiFacebook {size} title="Facebook" color="#1877F2" />
{:else if host === 'tiktok'}
  <SiTiktok {size} title="TikTok" />
{:else if host === 'youtube'}
  <SiYoutube {size} title="YouTube" color="#FF0000" />
{:else if host === 'twitch'}
  <SiTwitch {size} title="Twitch" color="#9146FF" />
{:else if host === 'spotify'}
  <SiSpotify {size} title="Spotify" color="#1DB954" />
{:else if host === 'soundcloud'}
  <SiSoundcloud {size} title="SoundCloud" color="#FF5500" />
{:else if host === 'bandcamp'}
  <SiBandcamp {size} title="Bandcamp" color="#408294" />
{:else if host === 'deviantart'}
  <SiDeviantart {size} title="DeviantArt" color="#05CC47" />
{:else if host === 'artstation'}
  <SiArtstation {size} title="ArtStation" color="#13AFF0" />
{:else if host === 'behance'}
  <SiBehance {size} title="Behance" color="#1769FF" />
{:else if host === 'pixiv'}
  <SiPixiv {size} title="pixiv" color="#0096FA" />
{:else if host === 'itchio'}
  <SiItchdotio {size} title="itch.io" color="#FA5C5C" />
{:else if host === 'gamejolt'}
  <SiGamejolt {size} title="Game Jolt" color="#2F7F6F" />
{:else if host === 'newgrounds'}
  <SiNewgrounds {size} title="Newgrounds" color="#FFE000" />
{:else if host === 'patreon'}
  <SiPatreon {size} title="Patreon" color="#FF424D" />
{:else if host === 'kofi'}
  <SiKofi {size} title="Ko-fi" color="#FF5E5B" />
{:else if host === 'buymeacoffee'}
  <SiBuymeacoffee {size} title="Buy Me a Coffee" color="#FFDD00" />
{:else if host === 'linktree'}
  <SiLinktree {size} title="Linktree" color="#43E55E" />
{:else if badge}
  <span
    class="font-display inline-flex items-center justify-center rounded-sm leading-none {badge.classes}"
    style="width: {size}px; height: {size}px; font-size: {Math.max(7, Math.round(size * 0.5))}px;"
    title={badge.text}
    aria-label={badge.text}
  >
    {badge.text}
  </span>
{:else if url}
  <LinkIcon {size} aria-label="External link" />
{/if}

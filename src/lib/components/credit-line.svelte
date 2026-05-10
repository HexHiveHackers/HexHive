<script lang="ts">
  type Props = {
    displayName: string;
    username: string;
    homepageUrl: string | null;
    isPlaceholder: boolean;
  };
  let { displayName, username, homepageUrl, isPlaceholder }: Props = $props();
  const href = $derived(homepageUrl ?? `/u/${username}`);
  const external = $derived(homepageUrl !== null);
</script>

<span class="inline-flex items-center gap-2 text-sm text-zinc-300">
  <span>by</span>
  <a
    {href}
    class="text-foreground hover:text-sky-300 underline-offset-2 hover:underline"
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {displayName}
  </a>
  {#if isPlaceholder}
    <span
      class="font-display rounded-sm border border-zinc-700/70 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-zinc-400"
    >
      Placeholder credit
    </span>
  {/if}
</span>

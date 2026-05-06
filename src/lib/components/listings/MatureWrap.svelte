<script lang="ts">
  import { type Snippet } from 'svelte';
  let { mature, children }: { mature: boolean; children: Snippet } = $props();
  let revealed = $state(false);
</script>

{#if mature && !revealed}
  <div class="relative">
    <div class="filter blur-md pointer-events-none">{@render children()}</div>
    <button type="button"
            class="absolute inset-0 grid place-items-center text-xs font-display tracking-wider bg-background/60 hover:bg-background/80 rounded-lg"
            onclick={() => (revealed = true)}>
      MATURE — TAP TO REVEAL
    </button>
  </div>
{:else}
  {@render children()}
{/if}

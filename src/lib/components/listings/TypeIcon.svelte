<script lang="ts">
  import { FileCode, Gamepad2, Music, Sparkles, Wrench } from '@lucide/svelte';

  type Type = 'romhack' | 'sprite' | 'sound' | 'script' | 'tool';
  let { type, size = 16, class: className = '' }: { type: Type; size?: number; class?: string } =
    $props();
</script>

{#if type === 'romhack'}
  <Gamepad2 {size} class={className} />
{:else if type === 'sprite'}
  <Sparkles {size} class={className} />
{:else if type === 'sound'}
  <Music {size} class={className} />
{:else if type === 'tool'}
  <Wrench {size} class={className} />
{:else}
  <FileCode {size} class={className} />
{/if}

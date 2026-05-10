<script lang="ts">
  // Game Boy Advance hardware icon — Icons8 "Visual Game Boy" (Color
  // style, icon id 38359), licensed under Icons8's free tier
  // (attribution in the global Footer). Wrapped to expose the same
  // `class` API as the other tab icons so it slots into the typed
  // IconCmp field unchanged.
  import type { ClassValue } from 'svelte/elements';

  let { class: cls }: { class?: ClassValue | null } = $props();
  const cn = $derived((cls as string | undefined) ?? 'size-4');
</script>

<img src="/img/icons8/gameboy-advance.svg" alt="" class={cn} aria-hidden="true" />

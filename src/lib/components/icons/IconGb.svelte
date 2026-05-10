<script lang="ts">
  // Game Boy / Game Boy Color — portrait silhouette: tall rounded body,
  // screen at top, d-pad bottom-left, A/B bottom-right (offset angle),
  // start/select pills along the bottom.
  import type { ClassValue } from 'svelte/elements';

  let { class: cls }: { class?: ClassValue | null } = $props();
  const cn = $derived((cls as string | undefined) ?? 'size-4');
</script>

<svg
  class={cn}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- body -->
  <rect x="6" y="2" width="12" height="20" rx="1.8" />
  <!-- screen -->
  <rect x="8.5" y="4.5" width="7" height="6" rx="0.6" />
  <!-- d-pad cross -->
  <line x1="9" y1="13.5" x2="9" y2="15.5" />
  <line x1="8" y1="14.5" x2="10" y2="14.5" />
  <!-- A / B buttons (offset for the GB's diagonal layout) -->
  <circle cx="14" cy="13.5" r="0.85" />
  <circle cx="15.6" cy="15.2" r="0.85" />
  <!-- start / select pills -->
  <line x1="9.5" y1="18.5" x2="11" y2="18" />
  <line x1="13" y1="18" x2="14.5" y2="18.5" />
</svg>

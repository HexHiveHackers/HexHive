<script lang="ts">
  // Game Boy Advance — landscape silhouette: rounded body, screen
  // centred, D-pad left, A/B right (drawn at the GBA's offset angle).
  // Loosely typed `class` to match @lucide/svelte's prop signature
  // (ClassValue | null | undefined) so this component is interchangeable
  // with a Lucide icon in typed `IconCmp` slots.
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
  <rect x="2" y="7" width="20" height="10" rx="2.4" />
  <!-- screen -->
  <rect x="9" y="9.5" width="6" height="5" rx="0.5" />
  <!-- d-pad -->
  <line x1="5" y1="11.5" x2="5" y2="13.5" />
  <line x1="4" y1="12.5" x2="6" y2="12.5" />
  <!-- A / B buttons -->
  <circle cx="18.5" cy="11.5" r="0.9" />
  <circle cx="20" cy="13.5" r="0.9" />
  <!-- shoulder hints (L/R) -->
  <line x1="3" y1="6" x2="4.5" y2="6" />
  <line x1="19.5" y1="6" x2="21" y2="6" />
</svg>

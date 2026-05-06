<script lang="ts">
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import { Label } from '$lib/components/ui/label';
  import { SOUND_CATEGORY } from '$lib/schemas/sound';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
    category: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid gap-1.5">
    <Label for="category">Category</Label>
    <select id="category" bind:value={value.category}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      {#each SOUND_CATEGORY as c}<option value={c}>{c}</option>{/each}
    </select>
  </div>
</div>

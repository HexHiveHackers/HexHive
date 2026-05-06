<script lang="ts">
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { SPRITE_VARIANTS } from '$lib/schemas/sprite-variants';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
    type: string;
    subtype: string;
    variantText: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();

  const types = Object.keys(SPRITE_VARIANTS);
  const subtypes = $derived(
    (SPRITE_VARIANTS as Record<string, Record<string, unknown>>)[value.type]
      ? Object.keys((SPRITE_VARIANTS as Record<string, Record<string, unknown>>)[value.type])
      : []
  );
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="type">Type</Label>
      <select id="type" bind:value={value.type}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each types as t}<option value={t}>{t}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="subtype">Subtype</Label>
      <select id="subtype" bind:value={value.subtype}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each subtypes as s}<option value={s}>{s}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="variantText">Variant</Label>
      <Input id="variantText" bind:value={value.variantText}
             placeholder="leave blank if not applicable" />
    </div>
  </div>
</div>

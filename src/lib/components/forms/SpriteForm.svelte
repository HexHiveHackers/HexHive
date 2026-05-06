<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { ENVIRONMENT_VARIANT } from '$lib/schemas/asset-vocab';
  import { SPRITE_VARIANTS, type VariantSpec } from '$lib/schemas/sprite-variants';
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';

  type V = {
    title: string;
    description: string;
    permissions: string[];
    targetedRoms: string[];
    type: string;
    subtype: string;
    variantText: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();

  const tree = SPRITE_VARIANTS;

  const types = Object.keys(tree);
  const subtypes = $derived(tree[value.type] ? Object.keys(tree[value.type]) : []);

  // Variant constraint for the current (type, subtype):
  //   undefined → no variant allowed (input hidden)
  //   'string'  → free-form
  //   array     → closed list (rendered as <select>)
  const spec = $derived<VariantSpec | undefined>(tree[value.type]?.[value.subtype]);
  const closedList = $derived(
    spec && Array.isArray((spec as { variant?: unknown }).variant)
      ? ((spec as { variant: readonly string[] }).variant as readonly string[])
      : null
  );
  const variantKind = $derived(
    spec === undefined || (spec as { variant?: unknown }).variant === undefined
      ? ('none' as const)
      : closedList
        ? ('closed' as const)
        : ('open' as const)
  );

  // Surface EnvironmentVariant suggestions for the three open-string subtypes
  // that semantically expect an environment.
  const envSuggested = $derived(
    variantKind === 'open' &&
      ((value.type === 'Battle' && value.subtype === 'Background') ||
        (value.type === 'Environment' &&
          (value.subtype === 'Preview' || value.subtype === 'Tiles')))
  );
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="type">Type</Label>
      <select
        id="type"
        bind:value={value.type}
        class="border rounded-md px-3 py-2 bg-background text-sm"
      >
        {#each types as t}<option value={t}>{t}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="subtype">Subtype</Label>
      <select
        id="subtype"
        bind:value={value.subtype}
        class="border rounded-md px-3 py-2 bg-background text-sm"
      >
        {#each subtypes as s}<option value={s}>{s}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="variant">Variant</Label>
      {#if variantKind === 'none'}
        <Input id="variant" disabled value="" placeholder="not applicable" />
      {:else if variantKind === 'closed' && closedList}
        <select
          id="variant"
          bind:value={value.variantText}
          class="border rounded-md px-3 py-2 bg-background text-sm"
        >
          <option value="">—</option>
          {#each closedList as v}<option value={v}>{v}</option>{/each}
        </select>
      {:else}
        <Input
          id="variant"
          bind:value={value.variantText}
          list={envSuggested ? 'environment-variants' : undefined}
          placeholder={envSuggested ? 'e.g. Cave, Forest, Indoors…' : 'free-form'}
        />
        {#if envSuggested}
          <datalist id="environment-variants">
            {#each ENVIRONMENT_VARIANT as v}<option value={v}></option>{/each}
          </datalist>
        {/if}
      {/if}
    </div>
  </div>
</div>

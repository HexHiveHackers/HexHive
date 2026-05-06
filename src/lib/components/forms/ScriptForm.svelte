<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    SCRIPT_CATEGORY,
    SCRIPT_FEATURE,
    SCRIPT_PREREQUISITE,
    SCRIPT_TOOL
  } from '$lib/schemas/asset-vocab';
  import { SUPPORTED_BASE_ROM_VERSION } from '$lib/schemas/zod-helpers';
  import AssetHiveBaseFields from './AssetHiveBaseFields.svelte';
  import SuggestionChips from './SuggestionChips.svelte';

  type V = {
    title: string;
    description: string;
    permissions: string[];
    targetedRoms: string[];
    categoriesText: string;
    featuresText: string;
    prerequisitesText: string;
    targetedVersions: string[];
    toolsText: string;
  };
  let { value = $bindable<V>() }: { value: V } = $props();
</script>

<div class="grid gap-4">
  <AssetHiveBaseFields bind:value />
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="grid gap-1.5">
      <Label for="categoriesText">Categories (comma)</Label>
      <Input id="categoriesText" bind:value={value.categoriesText} />
      <SuggestionChips bind:value={value.categoriesText} suggestions={SCRIPT_CATEGORY} />
    </div>
    <div class="grid gap-1.5">
      <Label for="featuresText">Features (comma)</Label>
      <Input id="featuresText" bind:value={value.featuresText} />
      <SuggestionChips bind:value={value.featuresText} suggestions={SCRIPT_FEATURE} />
    </div>
    <div class="grid gap-1.5">
      <Label for="prerequisitesText">Prerequisites (comma)</Label>
      <Input id="prerequisitesText" bind:value={value.prerequisitesText} />
      <SuggestionChips bind:value={value.prerequisitesText} suggestions={SCRIPT_PREREQUISITE} />
    </div>
    <div class="grid gap-1.5">
      <Label for="toolsText">Tools (comma)</Label>
      <Input id="toolsText" bind:value={value.toolsText} />
      <SuggestionChips bind:value={value.toolsText} suggestions={SCRIPT_TOOL} />
    </div>
  </div>
  <div class="grid gap-1.5">
    <Label>Targeted versions</Label>
    <div class="flex flex-wrap gap-3">
      {#each SUPPORTED_BASE_ROM_VERSION as v}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.targetedVersions.includes(v)}
                 onchange={(e) => {
                   value.targetedVersions = e.currentTarget.checked
                     ? [...value.targetedVersions, v]
                     : value.targetedVersions.filter((x) => x !== v);
                 }} />
          {v}
        </label>
      {/each}
    </div>
  </div>
</div>

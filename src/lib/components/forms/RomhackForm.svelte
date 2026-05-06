<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    ASSET_PERMISSION, 
    SUPPORTED_BASE_ROM,
    SUPPORTED_BASE_ROM_REGION,
    SUPPORTED_BASE_ROM_VERSION
  } from '$lib/schemas/zod-helpers';

  type FormValue = {
    title: string;
    description: string;
    permissions: string[];
    baseRom: string;
    baseRomVersion: string;
    baseRomRegion: string;
    release: string;
    categoriesText: string;
    statesText: string;
    tagsText: string;
  };

  let { value = $bindable<FormValue>() }: { value: FormValue } = $props();
</script>

<div class="grid gap-4">
  <div class="grid gap-1.5">
    <Label for="title">Title</Label>
    <Input id="title" bind:value={value.title} required />
  </div>
  <div class="grid gap-1.5">
    <Label for="description">Description</Label>
    <textarea id="description" rows="5" bind:value={value.description}
              class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
  </div>
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="baseRom">Base ROM</Label>
      <select id="baseRom" bind:value={value.baseRom}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM as r}<option value={r}>{r}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="baseRomVersion">Version</Label>
      <select id="baseRomVersion" bind:value={value.baseRomVersion}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM_VERSION as v}<option value={v}>{v}</option>{/each}
      </select>
    </div>
    <div class="grid gap-1.5">
      <Label for="baseRomRegion">Region</Label>
      <select id="baseRomRegion" bind:value={value.baseRomRegion}
              class="border rounded-md px-3 py-2 bg-background text-sm">
        {#each SUPPORTED_BASE_ROM_REGION as r}<option value={r}>{r}</option>{/each}
      </select>
    </div>
  </div>
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="grid gap-1.5">
      <Label for="release">Release</Label>
      <Input id="release" bind:value={value.release} placeholder="1.0.0" required />
    </div>
    <div class="grid gap-1.5">
      <Label>Permissions</Label>
      <div class="flex flex-wrap gap-3">
        {#each ASSET_PERMISSION as p}
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox"
                   checked={value.permissions.includes(p)}
                   onchange={(e) => {
                     value.permissions = e.currentTarget.checked
                       ? [...value.permissions, p]
                       : value.permissions.filter((x) => x !== p);
                   }} />
            {p}
          </label>
        {/each}
      </div>
    </div>
  </div>
  <div class="grid sm:grid-cols-3 gap-3">
    <div class="grid gap-1.5">
      <Label for="categoriesText">Categories (comma)</Label>
      <Input id="categoriesText" bind:value={value.categoriesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="statesText">States (comma)</Label>
      <Input id="statesText" bind:value={value.statesText} />
    </div>
    <div class="grid gap-1.5">
      <Label for="tagsText">Tags (comma)</Label>
      <Input id="tagsText" bind:value={value.tagsText} />
    </div>
  </div>
</div>

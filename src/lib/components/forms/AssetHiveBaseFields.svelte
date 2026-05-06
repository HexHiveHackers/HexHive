<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { ASSET_PERMISSION, SUPPORTED_BASE_ROM } from '$lib/schemas/zod-helpers';

  type V = {
    title: string; description: string;
    permissions: string[];
    targetedRoms: string[];
  };
  let { value = $bindable<V>() }: { value: V } = $props();
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
  <div class="grid gap-1.5">
    <Label>Targeted ROMs</Label>
    <div class="flex flex-wrap gap-3">
      {#each SUPPORTED_BASE_ROM as r}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.targetedRoms.includes(r)}
                 onchange={(e) => {
                   value.targetedRoms = e.currentTarget.checked
                     ? [...value.targetedRoms, r]
                     : value.targetedRoms.filter((x) => x !== r);
                 }} />
          {r}
        </label>
      {/each}
    </div>
  </div>
  <div class="grid gap-1.5">
    <Label>Permissions</Label>
    <div class="flex flex-wrap gap-3">
      {#each ASSET_PERMISSION as p}
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={value.permissions.includes(p)}
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

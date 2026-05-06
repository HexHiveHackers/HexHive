<script lang="ts">
  let { files = $bindable<File[]>([]), accept = '' }: {
    files: File[];
    accept?: string;
  } = $props();

  let dragOver = $state(false);

  function add(list: FileList | null) {
    if (!list) return;
    files = [...files, ...Array.from(list)];
  }
  function remove(i: number) {
    files = files.filter((_, idx) => idx !== i);
  }
</script>

<div class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
     class:border-primary={dragOver}
     ondragover={(e) => { e.preventDefault(); dragOver = true; }}
     ondragleave={() => (dragOver = false)}
     ondrop={(e) => { e.preventDefault(); dragOver = false; add(e.dataTransfer?.files ?? null); }}
     role="presentation">
  <p class="text-sm text-muted-foreground mb-3">Drop files here, or</p>
  <label class="inline-flex items-center px-3 py-1.5 border rounded-md cursor-pointer text-sm bg-background hover:bg-accent">
    Browse
    <input type="file" multiple {accept} class="hidden"
           onchange={(e) => add(e.currentTarget.files)} />
  </label>
</div>

{#if files.length}
  <ul class="mt-3 grid gap-1 text-sm">
    {#each files as f, i}
      <li class="flex items-center justify-between border rounded px-2 py-1">
        <span class="truncate">{f.name} <span class="text-muted-foreground">({f.size}B)</span></span>
        <button type="button" class="text-xs text-muted-foreground hover:underline"
                onclick={() => remove(i)}>remove</button>
      </li>
    {/each}
  </ul>
{/if}

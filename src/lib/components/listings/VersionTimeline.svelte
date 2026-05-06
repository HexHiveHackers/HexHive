<script lang="ts">
  let { versions }: {
    versions: { id: string; version: string; changelog: string | null; isCurrent: boolean; createdAt: Date }[];
  } = $props();
</script>

<ul class="grid gap-3">
  {#each versions as v}
    <li class="border rounded-lg p-3">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">v{v.version}{v.isCurrent ? ' (current)' : ''}</span>
        <time class="text-xs text-muted-foreground" datetime={v.createdAt.toISOString()}>
          {v.createdAt.toLocaleDateString()}
        </time>
      </div>
      {#if v.changelog}<p class="mt-2 text-sm whitespace-pre-line">{v.changelog}</p>{/if}
    </li>
  {/each}
</ul>

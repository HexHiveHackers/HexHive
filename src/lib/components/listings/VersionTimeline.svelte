<script lang="ts">
  let {
    versions,
  }: {
    versions: {
      id: string;
      version: string;
      changelog: string | null;
      isCurrent: boolean;
      verified: boolean;
      createdAt: Date;
    }[];
  } = $props();
</script>

<ul class="grid gap-3">
  {#each versions as v}
    <li class="border rounded-lg p-3">
      <div class="flex items-center justify-between text-sm gap-2">
        <span class="flex items-center gap-2 min-w-0">
          <span class="font-medium">v{v.version}{v.isCurrent ? ' (current)' : ''}</span>
          {#if !v.verified}
            <span
              class="font-display text-[0.55rem] uppercase tracking-[0.18em] rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-300"
              title="Historical entry — no build artefact has been verified"
            >
              Unverified
            </span>
          {/if}
        </span>
        <time class="text-xs text-muted-foreground shrink-0" datetime={v.createdAt.toISOString()}>
          {v.createdAt.toLocaleDateString()}
        </time>
      </div>
      {#if v.changelog}<p class="mt-2 text-sm whitespace-pre-line">{v.changelog}</p>{/if}
    </li>
  {/each}
</ul>

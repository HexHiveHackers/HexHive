<script lang="ts">
  // Renders a row of clickable chips for a comma-separated text input.
  // Clicking a chip appends "<value>, " to the bound value if not already present.
  // Used for fields like RomhackCategory[] / ScriptFeature[] where the underlying
  // column accepts any string but we want to surface curated suggestions.

  let {
    value = $bindable<string>(''),
    suggestions
  }: {
    value: string;
    suggestions: readonly string[];
  } = $props();

  function tokens(): string[] {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function add(s: string) {
    const set = new Set(tokens());
    if (set.has(s)) return;
    const trimmed = value.trim();
    const sep = trimmed === '' ? '' : trimmed.endsWith(',') ? ' ' : ', ';
    value = `${trimmed}${sep}${s}`;
  }
</script>

<div class="flex flex-wrap gap-1.5 mt-1.5">
  {#each suggestions as s}
    {@const active = tokens().includes(s)}
    <button
      type="button"
      class="text-[11px] px-2 py-0.5 rounded border transition-colors {active
        ? 'bg-accent border-accent text-accent-foreground'
        : 'border-border text-muted-foreground hover:bg-accent/50'}"
      onclick={() => add(s)}
    >
      {s}
    </button>
  {/each}
</div>

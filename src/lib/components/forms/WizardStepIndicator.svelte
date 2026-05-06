<script lang="ts">
  type Step = { id: number; label: string };
  let {
    steps,
    current,
    accent = 'oklch(0.696 0.17 162.48)',
  }: { steps: Step[]; current: number; accent?: string } = $props();
</script>

<ol
  class="wizard-indicator"
  style="--accent: {accent};"
  aria-label="Upload progress"
>
  {#each steps as step, i}
    {@const state = step.id < current ? 'done' : step.id === current ? 'active' : 'upcoming'}
    <li class="step" data-state={state}>
      <span class="hex">
        <svg viewBox="0 0 100 86" width="40" height="36" aria-hidden="true">
          <polygon points="25,0 75,0 100,43 75,86 25,86 0,43" />
        </svg>
        <span class="num">{String(step.id).padStart(2, '0')}</span>
      </span>
      <span class="label">{step.label}</span>
    </li>
    {#if i < steps.length - 1}
      <span class="connector" data-filled={step.id < current} aria-hidden="true"></span>
    {/if}
  {/each}
</ol>

<style>
  .wizard-indicator {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    min-width: 0;
  }

  .hex {
    position: relative;
    width: 40px;
    height: 36px;
    display: grid;
    place-items: center;
  }
  .hex svg {
    position: absolute;
    inset: 0;
    fill: oklch(0.18 0 0);
    stroke: var(--border);
    stroke-width: 2;
    transition:
      fill 0.35s ease,
      stroke 0.35s ease,
      filter 0.35s ease;
  }
  [data-state='active'] .hex svg {
    fill: color-mix(in oklch, var(--accent) 25%, oklch(0.18 0 0));
    stroke: var(--accent);
    filter: drop-shadow(0 0 8px color-mix(in oklch, var(--accent) 60%, transparent));
  }
  [data-state='done'] .hex svg {
    fill: var(--accent);
    stroke: var(--accent);
  }

  .num {
    position: relative;
    z-index: 1;
    font-family: var(--font-display);
    font-size: 9px;
    color: var(--muted-foreground);
    letter-spacing: 0.05em;
    transition: color 0.35s ease;
  }
  [data-state='active'] .num {
    color: var(--accent);
  }
  [data-state='done'] .num {
    color: oklch(0.18 0 0);
  }

  .label {
    font-family: var(--font-display);
    font-size: 9px;
    letter-spacing: 0.18em;
    color: var(--muted-foreground);
    text-transform: uppercase;
    transition: color 0.35s ease;
    white-space: nowrap;
  }
  [data-state='active'] .label {
    color: var(--accent);
  }
  [data-state='done'] .label {
    color: var(--foreground);
    opacity: 0.7;
  }

  .connector {
    flex: 1;
    min-width: 1.5rem;
    height: 2px;
    margin-top: 17px;
    background: var(--border);
    transition: background 0.4s ease;
  }
  .connector[data-filled='true'] {
    background: var(--accent);
  }

  @media (max-width: 640px) {
    .label {
      display: none;
    }
    .wizard-indicator {
      gap: 0.25rem;
    }
  }
</style>

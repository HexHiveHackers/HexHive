<script lang="ts">
  import { ChevronLeft, ChevronRight, Gamepad2, Upload } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';
  import SuggestionChips from '$lib/components/forms/SuggestionChips.svelte';
  import WizardStepIndicator from '$lib/components/forms/WizardStepIndicator.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { ROMHACK_CATEGORY, ROMHACK_STATE } from '$lib/schemas/asset-vocab';
  import {
    ASSET_PERMISSION,
    SUPPORTED_BASE_ROM,
    SUPPORTED_BASE_ROM_REGION,
    SUPPORTED_BASE_ROM_VERSION,
  } from '$lib/schemas/zod-helpers';

  type StepId = 1 | 2 | 3 | 4;

  // emerald-500 in oklch — drives every accent in the wizard.
  const ACCENT = 'oklch(0.696 0.17 162.48)';

  const steps = [
    { id: 1, label: 'Identity' },
    { id: 2, label: 'Target' },
    { id: 3, label: 'Details' },
    { id: 4, label: 'Files' },
  ];
  const stepCopy: Record<StepId, { eyebrow: string; title: string; sub: string }> = {
    1: {
      eyebrow: '01 / Identity',
      title: 'Name your hack.',
      sub: 'A clear title and a short pitch. You can edit both after publishing.',
    },
    2: {
      eyebrow: '02 / Target',
      title: 'Which ROM is it for?',
      sub: 'Pick the base ROM and revision your patch applies to. Get this wrong and people will bounce.',
    },
    3: {
      eyebrow: '03 / Details',
      title: 'Tag it for the dex.',
      sub: 'Categories, states, and use permissions help people find and remix your work.',
    },
    4: {
      eyebrow: '04 / Files',
      title: 'Drop the patch.',
      sub: 'Then hit publish. Files go directly to storage; nothing leaves your browser via our server.',
    },
  };

  let form = $state({
    title: '',
    description: '',
    permissions: ['Credit'] as string[],
    baseRom: 'Emerald' as (typeof SUPPORTED_BASE_ROM)[number],
    baseRomVersion: 'v1.0' as (typeof SUPPORTED_BASE_ROM_VERSION)[number],
    baseRomRegion: 'English' as (typeof SUPPORTED_BASE_ROM_REGION)[number],
    release: '1.0.0',
    categoriesText: '',
    statesText: '',
    tagsText: '',
  });
  let files = $state<File[]>([]);
  let step = $state<StepId>(1);
  let direction = $state<'forward' | 'back'>('forward');
  let busy = $state(false);
  let err = $state<string | null>(null);

  const stepValid = $derived.by(() => {
    if (step === 1) return form.title.trim().length > 0;
    if (step === 2) return form.release.trim().length > 0;
    if (step === 3) return form.permissions.length > 0;
    if (step === 4) return files.length > 0;
    return false;
  });

  const totalKb = $derived(Math.round(files.reduce((s, f) => s + f.size, 0) / 1024));

  function next() {
    if (!stepValid || busy) return;
    if (step < 4) {
      direction = 'forward';
      step = (step + 1) as StepId;
    } else {
      void publish();
    }
  }
  function back() {
    if (step > 1) {
      direction = 'back';
      step = (step - 1) as StepId;
    }
  }
  function jumpTo(s: StepId) {
    if (s === step) return;
    direction = s > step ? 'forward' : 'back';
    step = s;
  }

  function togglePermission(p: string, on: boolean) {
    form.permissions = on ? [...form.permissions, p] : form.permissions.filter((x) => x !== p);
  }

  const splitList = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  async function publish() {
    if (!files.length) {
      err = 'Pick at least one file';
      return;
    }
    err = null;
    busy = true;
    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'romhack',
          input: {
            title: form.title,
            description: form.description,
            permissions: form.permissions,
            baseRom: form.baseRom,
            baseRomVersion: form.baseRomVersion,
            baseRomRegion: form.baseRomRegion,
            release: form.release,
            categories: splitList(form.categoriesText),
            states: splitList(form.statesText),
            tags: splitList(form.tagsText),
          },
          files: files.map((f) => ({
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
            size: f.size,
          })),
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { listingId, versionId, slug, uploads } = await presignRes.json();

      await Promise.all(
        uploads.map((u: { url: string; originalFilename: string }, i: number) =>
          fetch(u.url, {
            method: 'PUT',
            headers: { 'content-type': files[i].type || 'application/octet-stream' },
            body: files[i],
          }).then((r) => {
            if (!r.ok) throw new Error(`Storage upload failed for ${u.originalFilename}`);
          })
        )
      );

      const finalizeRes = await fetch('/api/uploads/finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'romhack',
          listingId,
          versionId,
          files: uploads.map(
            (u: { r2Key: string; filename: string; originalFilename: string; size: number }) => ({
              r2Key: u.r2Key,
              filename: u.filename,
              originalFilename: u.originalFilename,
              size: u.size,
            })
          ),
        }),
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());

      await goto(`/romhacks/${slug}`);
    } catch (e: unknown) {
      err = (e as Error)?.message ?? 'Upload failed';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Upload a Romhack — HexHive</title>
</svelte:head>

<div class="wizard-page">
  <section class="wizard">
    <header class="wizard-header" style="--accent: {ACCENT};">
      <div class="scanlines" aria-hidden="true"></div>
      <div class="header-inner">
        <div class="eyebrow">
          <Gamepad2 size={14} />
          <span>{stepCopy[step].eyebrow}</span>
        </div>
        <h1 class="title">{stepCopy[step].title}</h1>
        <p class="sub">{stepCopy[step].sub}</p>
      </div>
      <div class="indicator-wrap">
        <WizardStepIndicator {steps} current={step} accent={ACCENT} />
      </div>
    </header>

    <form
      class="wizard-body"
      onsubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      {#key step}
        <div
          class="wizard-step"
          in:fly={{
            x: direction === 'forward' ? 32 : -32,
            duration: 280,
            delay: 80,
            opacity: 0,
          }}
          out:fly={{ x: direction === 'forward' ? -32 : 32, duration: 180, opacity: 0 }}
        >
          {#if step === 1}
            <div class="grid gap-5">
              <div class="grid gap-2">
                <Label for="title" class="field-label">Title</Label>
                <Input
                  id="title"
                  bind:value={form.title}
                  placeholder="Kaizo Emerald: Director's Cut"
                  required
                />
              </div>
              <div class="grid gap-2">
                <Label for="description" class="field-label">Description</Label>
                <textarea
                  id="description"
                  rows="6"
                  bind:value={form.description}
                  placeholder="What's different about this hack? What's the hook?"
                  class="border rounded-lg px-3 py-2 bg-background text-sm leading-relaxed"
                ></textarea>
                <p class="hint">Plain text. ~10k chars max. Be honest about scope and state.</p>
              </div>
            </div>
          {:else if step === 2}
            <div class="grid gap-6">
              <div class="grid gap-3">
                <span class="field-label">Base ROM</span>
                <div class="toggle-grid two">
                  {#each SUPPORTED_BASE_ROM as r}
                    <button
                      type="button"
                      class="toggle"
                      class:active={form.baseRom === r}
                      onclick={() => (form.baseRom = r)}
                    >
                      <span class="toggle-glyph">CART</span>
                      <span class="toggle-label">{r}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-6">
                <div class="grid gap-3">
                  <span class="field-label">Revision</span>
                  <div class="toggle-grid two">
                    {#each SUPPORTED_BASE_ROM_VERSION as v}
                      <button
                        type="button"
                        class="toggle compact"
                        class:active={form.baseRomVersion === v}
                        onclick={() => (form.baseRomVersion = v)}
                      >
                        {v}
                      </button>
                    {/each}
                  </div>
                </div>
                <div class="grid gap-2">
                  <Label for="release" class="field-label">Release tag</Label>
                  <Input id="release" bind:value={form.release} placeholder="1.0.0" required />
                  <p class="hint">Semver, name, anything you want — shown to users.</p>
                </div>
              </div>

              <div class="grid gap-3">
                <span class="field-label">Region</span>
                <div class="toggle-grid six">
                  {#each SUPPORTED_BASE_ROM_REGION as r}
                    <button
                      type="button"
                      class="toggle compact"
                      class:active={form.baseRomRegion === r}
                      onclick={() => (form.baseRomRegion = r)}
                    >
                      {r}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {:else if step === 3}
            <div class="grid gap-6">
              <div class="grid gap-3">
                <span class="field-label">Permissions</span>
                <div class="toggle-grid four">
                  {#each ASSET_PERMISSION as p}
                    {@const on = form.permissions.includes(p)}
                    <button
                      type="button"
                      class="toggle compact"
                      class:active={on}
                      onclick={() => togglePermission(p, !on)}
                    >
                      {p}
                    </button>
                  {/each}
                </div>
                <p class="hint">Pick all that apply. At least one is required.</p>
              </div>

              <div class="grid gap-2">
                <Label for="categoriesText" class="field-label">Categories</Label>
                <Input
                  id="categoriesText"
                  bind:value={form.categoriesText}
                  placeholder="Difficulty, Story, …"
                />
                <SuggestionChips bind:value={form.categoriesText} suggestions={ROMHACK_CATEGORY} />
              </div>
              <div class="grid gap-2">
                <Label for="statesText" class="field-label">States</Label>
                <Input
                  id="statesText"
                  bind:value={form.statesText}
                  placeholder="Beta, Actively Updated, …"
                />
                <SuggestionChips bind:value={form.statesText} suggestions={ROMHACK_STATE} />
              </div>
              <div class="grid gap-2">
                <Label for="tagsText" class="field-label">Tags</Label>
                <Input
                  id="tagsText"
                  bind:value={form.tagsText}
                  placeholder="nuzlocke, randomized, fakemon, …"
                />
                <p class="hint">Free-form. Comma-separated.</p>
              </div>
            </div>
          {:else}
            <div class="grid gap-6">
              <div>
                <span class="field-label block mb-2">Patch files</span>
                <FileDropzone bind:files accept=".ips,.ups,.bps,.zip,.7z" />
                <p class="hint mt-2">
                  Accepts <code class="font-mono">.ips</code>, <code class="font-mono">.ups</code>,
                  <code class="font-mono">.bps</code>, <code class="font-mono">.zip</code>,
                  <code class="font-mono">.7z</code>. ≤ 50 MB per file, ≤ 100 MB total.
                </p>
              </div>

              <aside class="summary">
                <p class="summary-eyebrow">Pre-flight</p>
                <dl class="summary-list">
                  <div><dt>Title</dt><dd>{form.title || '—'}</dd></div>
                  <div>
                    <dt>Target</dt>
                    <dd>{form.baseRom} · {form.baseRomVersion} · {form.baseRomRegion}</dd>
                  </div>
                  <div><dt>Release</dt><dd>{form.release}</dd></div>
                  <div>
                    <dt>Permissions</dt>
                    <dd>{form.permissions.join(', ') || '—'}</dd>
                  </div>
                  <div>
                    <dt>Files</dt>
                    <dd>
                      {files.length === 0
                        ? '—'
                        : `${files.length} file${files.length === 1 ? '' : 's'} (${totalKb.toLocaleString()} KB)`}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
          {/if}
        </div>
      {/key}

      {#if err}
        <p class="text-sm text-destructive mt-4">{err}</p>
      {/if}

      <div class="wizard-footer">
        <Button type="button" variant="ghost" onclick={back} disabled={step === 1 || busy}>
          <ChevronLeft size={16} />
          Back
        </Button>
        <span class="footer-progress">{`Step ${step} of ${steps.length}`}</span>
        <Button type="submit" disabled={!stepValid || busy}>
          {#if step < 4}
            Continue
            <ChevronRight size={16} />
          {:else}
            <Upload size={16} />
            {busy ? 'Publishing…' : 'Publish'}
          {/if}
        </Button>
      </div>

      <!-- Skip-around helper for users who want to revisit a step. -->
      <nav class="wizard-jumps" aria-label="Wizard sections">
        {#each steps as s}
          <button
            type="button"
            class:active={s.id === step}
            onclick={() => jumpTo(s.id as StepId)}
            aria-current={s.id === step ? 'step' : undefined}
          >
            {s.label}
          </button>
        {/each}
      </nav>
    </form>
  </section>
</div>

<style>
  .wizard-page {
    --accent: oklch(0.696 0.17 162.48);
    background:
      radial-gradient(
        ellipse 60% 80% at 50% 0%,
        color-mix(in oklch, var(--accent) 8%, transparent) 0%,
        transparent 60%
      ),
      var(--background);
    min-height: 100%;
    padding: 2.5rem 1rem 4rem;
  }

  .wizard {
    max-width: 44rem;
    margin: 0 auto;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: color-mix(in oklch, var(--card) 92%, transparent);
    backdrop-filter: blur(8px);
    overflow: hidden;
  }

  .wizard-header {
    position: relative;
    padding: 2rem 1.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background:
      linear-gradient(
        180deg,
        color-mix(in oklch, var(--accent) 12%, transparent),
        transparent 70%
      ),
      var(--card);
  }
  .scanlines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.07;
    background-image: repeating-linear-gradient(
      0deg,
      currentColor,
      currentColor 1px,
      transparent 1px,
      transparent 3px
    );
  }
  .header-inner {
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .title {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 2.6vw, 1.6rem);
    line-height: 1.2;
    letter-spacing: 0.01em;
    margin: 0.6rem 0 0.4rem;
    color: var(--foreground);
  }
  .sub {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.875rem;
    max-width: 40ch;
    line-height: 1.55;
  }
  .indicator-wrap {
    position: relative;
    z-index: 1;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px dashed var(--border);
  }

  .wizard-body {
    padding: 1.5rem 1.75rem 1.75rem;
  }
  .wizard-step {
    min-height: 220px;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .hint {
    font-size: 0.75rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  /* Toggle-group pills used in the Target + Details steps. */
  .toggle-grid {
    display: grid;
    gap: 0.5rem;
  }
  .toggle-grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .toggle-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .toggle-grid.six {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 640px) {
    .toggle-grid.four {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .toggle-grid.six {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (min-width: 768px) {
    .toggle-grid.six {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  .toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.85rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 0.625rem;
    background: var(--background);
    color: var(--foreground);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      color 0.18s ease,
      transform 0.12s ease,
      box-shadow 0.18s ease;
    user-select: none;
  }
  .toggle.compact {
    padding: 0.55rem 0.5rem;
    font-size: 0.8125rem;
  }
  .toggle:hover {
    border-color: color-mix(in oklch, var(--accent) 50%, var(--border));
  }
  .toggle:active {
    transform: translateY(1px);
  }
  .toggle.active {
    border-color: var(--accent);
    background: color-mix(in oklch, var(--accent) 14%, var(--background));
    color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent) inset;
  }
  .toggle-glyph {
    font-family: var(--font-display);
    font-size: 9px;
    letter-spacing: 0.15em;
    color: var(--muted-foreground);
  }
  .toggle.active .toggle-glyph {
    color: var(--accent);
  }
  .toggle-label {
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  /* Final-step pre-flight summary */
  .summary {
    border: 1px dashed var(--border);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    background: color-mix(in oklch, var(--background) 60%, transparent);
  }
  .summary-eyebrow {
    font-family: var(--font-display);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 0.6rem;
  }
  .summary-list {
    margin: 0;
    display: grid;
    gap: 0.45rem;
    font-size: 0.875rem;
  }
  .summary-list > div {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: 1rem;
  }
  .summary-list dt {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    align-self: center;
  }
  .summary-list dd {
    margin: 0;
    color: var(--foreground);
  }

  .wizard-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }
  .footer-progress {
    font-family: var(--font-display);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }

  .wizard-jumps {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    justify-content: center;
  }
  .wizard-jumps button {
    background: none;
    border: none;
    padding: 0.25rem 0.6rem;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    cursor: pointer;
    border-radius: 0.375rem;
  }
  .wizard-jumps button:hover {
    color: var(--foreground);
    background: var(--muted);
  }
  .wizard-jumps button.active {
    color: var(--accent);
  }

  @media (max-width: 540px) {
    .wizard-header {
      padding: 1.5rem 1.25rem 1rem;
    }
    .wizard-body {
      padding: 1.25rem 1.25rem 1.5rem;
    }
    .summary-list > div {
      grid-template-columns: 1fr;
      gap: 0.1rem;
    }
  }
</style>

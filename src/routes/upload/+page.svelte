<script lang="ts">
  import { ChevronLeft, ChevronRight, FileCode, Gamepad2, Music, Sparkles, Upload } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';
  import SuggestionChips from '$lib/components/forms/SuggestionChips.svelte';
  import WizardStepIndicator from '$lib/components/forms/WizardStepIndicator.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    ROMHACK_CATEGORY,
    ROMHACK_STATE,
    SCRIPT_CATEGORY,
    SCRIPT_FEATURE,
    SCRIPT_PREREQUISITE,
    SCRIPT_TOOL,
  } from '$lib/schemas/asset-vocab';
  import { SOUND_CATEGORY } from '$lib/schemas/sound';
  import { SPRITE_VARIANTS, type VariantSpec } from '$lib/schemas/sprite-variants';
  import {
    ASSET_PERMISSION,
    SUPPORTED_BASE_ROM,
    SUPPORTED_BASE_ROM_REGION,
    SUPPORTED_BASE_ROM_VERSION,
  } from '$lib/schemas/zod-helpers';

  type AssetType = 'romhack' | 'sprite' | 'sound' | 'script';
  type StepId = 0 | 1 | 2 | 3 | 4;

  let { data } = $props();

  const NEUTRAL_ACCENT = 'oklch(0.696 0.17 162.48)'; // emerald — used as a generic fallback.
  const TYPE_META: Record<
    AssetType,
    {
      label: string;
      blurb: string;
      accent: string;
      icon: typeof Gamepad2;
      fileAccept: string;
      fileHint: string;
    }
  > = {
    romhack: {
      label: 'Romhack',
      blurb: 'A patch for an existing ROM.',
      accent: 'oklch(0.696 0.17 162.48)',
      icon: Gamepad2,
      fileAccept: '.ips,.ups,.bps,.zip,.7z',
      fileHint: '.ips, .ups, .bps, .zip, .7z · ≤ 50 MB per file, ≤ 100 MB total',
    },
    sprite: {
      label: 'Sprite pack',
      blurb: 'Graphics: Pokémon, trainers, NPCs, tiles, UI.',
      accent: 'oklch(0.667 0.295 322.15)',
      icon: Sparkles,
      fileAccept: '.png,.gif,.bmp,.zip',
      fileHint: '.png, .gif, .bmp, .zip · ≤ 5 MB per file, ≤ 50 MB total, ≤ 200 files',
    },
    sound: {
      label: 'Sound pack',
      blurb: 'Cries, jingles, attacks, songs, SFX.',
      accent: 'oklch(0.769 0.188 70.08)',
      icon: Music,
      fileAccept: '.wav,.ogg,.mp3,.s,.zip',
      fileHint: '.wav, .ogg, .mp3, .s, .zip · ≤ 20 MB per file, ≤ 50 MB total',
    },
    script: {
      label: 'Script',
      blurb: 'Engine code, features, rombase content.',
      accent: 'oklch(0.685 0.169 237.32)',
      icon: FileCode,
      fileAccept: '.s,.txt,.md,.py,.c,.h,.json,.zip',
      fileHint: '.s, .txt, .md, .py, .c, .h, .json, .zip · ≤ 10 MB per file, ≤ 30 MB total',
    },
  };

  // -------- state --------

  // One-time seed from the server-provided ?type query; the user can then
  // change asset type freely without resetting back to URL state.
  const initialType = untrack(() => data.initialType);
  let type = $state<AssetType | null>(initialType);
  let step = $state<StepId>(initialType ? 1 : 0);
  let direction = $state<'forward' | 'back'>('forward');
  let busy = $state(false);
  let err = $state<string | null>(null);

  // Common fields used by every type.
  let common = $state({
    title: '',
    description: '',
    permissions: ['Credit'] as string[],
    tagsText: '',
  });

  // Romhack-only fields.
  let romhack = $state({
    baseRom: 'Emerald' as (typeof SUPPORTED_BASE_ROM)[number],
    baseRomVersion: 'v1.0' as (typeof SUPPORTED_BASE_ROM_VERSION)[number],
    baseRomRegion: 'English' as (typeof SUPPORTED_BASE_ROM_REGION)[number],
    release: '1.0.0',
    categoriesText: '',
    statesText: '',
  });

  // Asset-hive shared (sprite/sound/script).
  let hive = $state({
    targetedRoms: ['Emerald'] as string[],
  });

  let sprite = $state({ type: 'Battle', subtype: 'Pokemon', variantText: 'Front' });
  let sound = $state({ category: 'SFX' as (typeof SOUND_CATEGORY)[number] });
  let script = $state({
    categoriesText: '',
    featuresText: '',
    prerequisitesText: '',
    targetedVersions: ['v1.0'] as string[],
    toolsText: '',
  });

  let files = $state<File[]>([]);

  // -------- derived --------

  const accent = $derived(type ? TYPE_META[type].accent : NEUTRAL_ACCENT);

  // Sprite variant tree helpers (live-updated when type/subtype change).
  const spriteTypes = Object.keys(SPRITE_VARIANTS);
  const spriteSubtypes = $derived(
    SPRITE_VARIANTS[sprite.type] ? Object.keys(SPRITE_VARIANTS[sprite.type]) : []
  );
  const spriteVariantSpec = $derived<VariantSpec | undefined>(
    SPRITE_VARIANTS[sprite.type]?.[sprite.subtype]
  );
  const spriteClosedList = $derived(
    spriteVariantSpec && Array.isArray((spriteVariantSpec as { variant?: unknown }).variant)
      ? ((spriteVariantSpec as { variant: readonly string[] }).variant as readonly string[])
      : null
  );
  const spriteVariantKind = $derived<'none' | 'closed' | 'open'>(
    !spriteVariantSpec || (spriteVariantSpec as { variant?: unknown }).variant === undefined
      ? 'none'
      : spriteClosedList
        ? 'closed'
        : 'open'
  );

  const steps = $derived(
    type === 'romhack'
      ? [
          { id: 1, label: 'Identity' },
          { id: 2, label: 'Target' },
          { id: 3, label: 'Details' },
          { id: 4, label: 'Files' },
        ]
      : [
          { id: 1, label: 'Identity' },
          { id: 2, label: 'Target' },
          { id: 3, label: 'Details' },
          { id: 4, label: 'Files' },
        ]
  );

  const stepCopy = $derived.by<Record<StepId, { eyebrow: string; title: string; sub: string }>>(() => {
    const idLabel = type ? TYPE_META[type].label : 'Asset';
    const num = (n: number) => String(n).padStart(2, '0');
    return {
      0: {
        eyebrow: 'Upload · 00 / Type',
        title: 'What are you uploading?',
        sub: 'Pick the kind of asset. The form adapts to fit.',
      },
      1: {
        eyebrow: `${idLabel} · ${num(1)} / Identity`,
        title: 'Name it.',
        sub: 'A clear title and a short pitch. You can edit both after publishing.',
      },
      2: {
        eyebrow: `${idLabel} · ${num(2)} / Target`,
        title: type === 'romhack' ? 'Which ROM is it for?' : 'What does it target?',
        sub:
          type === 'romhack'
            ? 'Pick the base ROM and revision your patch applies to.'
            : 'Which base ROMs is this pack compatible with?',
      },
      3: {
        eyebrow: `${idLabel} · ${num(3)} / Details`,
        title: 'Tag it for the dex.',
        sub:
          type === 'romhack'
            ? 'Categories, states, permissions — help people find your work.'
            : 'Categorize it and set how others may use it.',
      },
      4: {
        eyebrow: `${idLabel} · ${num(4)} / Files`,
        title: 'Drop the files.',
        sub: 'Then hit publish. Files go directly to storage; nothing leaves your browser via our server.',
      },
    };
  });

  const stepValid = $derived.by(() => {
    if (step === 0) return type !== null;
    if (step === 1) return common.title.trim().length > 0;
    if (step === 2) {
      if (type === 'romhack') return romhack.release.trim().length > 0;
      if (type === 'sprite') return hive.targetedRoms.length > 0 && spriteVariantKind !== undefined;
      if (type === 'sound') return hive.targetedRoms.length > 0;
      if (type === 'script') return hive.targetedRoms.length > 0 && script.targetedVersions.length > 0;
    }
    if (step === 3) {
      if (common.permissions.length === 0) return false;
      if (type === 'script')
        return (
          script.categoriesText.trim().length > 0 &&
          script.featuresText.trim().length > 0 &&
          script.toolsText.trim().length > 0
        );
      return true;
    }
    if (step === 4) return files.length > 0;
    return false;
  });

  const totalKb = $derived(Math.round(files.reduce((s, f) => s + f.size, 0) / 1024));

  // -------- nav --------

  function pickType(t: AssetType) {
    type = t;
    direction = 'forward';
    step = 1;
    // Reset files since extension allow-lists vary by type.
    files = [];
  }

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
    if (step > 0) {
      direction = 'back';
      step = (step - 1) as StepId;
    }
  }
  function jumpTo(s: StepId) {
    if (!type && s > 0) return;
    if (s === step) return;
    direction = s > step ? 'forward' : 'back';
    step = s;
  }

  function togglePermission(p: string, on: boolean) {
    common.permissions = on
      ? [...common.permissions, p]
      : common.permissions.filter((x) => x !== p);
  }
  function toggleTargetedRom(r: string, on: boolean) {
    hive.targetedRoms = on
      ? [...hive.targetedRoms, r]
      : hive.targetedRoms.filter((x) => x !== r);
  }
  function toggleTargetedVersion(v: string, on: boolean) {
    script.targetedVersions = on
      ? [...script.targetedVersions, v]
      : script.targetedVersions.filter((x) => x !== v);
  }

  const splitList = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  // -------- publish --------

  function buildInput() {
    const base = {
      title: common.title,
      description: common.description,
      permissions: common.permissions,
    };

    if (type === 'romhack') {
      return {
        ...base,
        baseRom: romhack.baseRom,
        baseRomVersion: romhack.baseRomVersion,
        baseRomRegion: romhack.baseRomRegion,
        release: romhack.release,
        categories: splitList(romhack.categoriesText),
        states: splitList(romhack.statesText),
        tags: splitList(common.tagsText),
      };
    }
    const hiveBase = { ...base, targetedRoms: hive.targetedRoms };
    if (type === 'sprite') {
      return {
        ...hiveBase,
        category: {
          type: sprite.type,
          subtype: sprite.subtype,
          variant: sprite.variantText || undefined,
        },
      };
    }
    if (type === 'sound') {
      return { ...hiveBase, category: sound.category };
    }
    return {
      ...hiveBase,
      categories: splitList(script.categoriesText),
      features: splitList(script.featuresText),
      prerequisites: splitList(script.prerequisitesText),
      targetedVersions: script.targetedVersions,
      tools: splitList(script.toolsText),
    };
  }

  async function publish() {
    if (!type) return;
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
          type,
          input: buildInput(),
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
          type,
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

      const route = type === 'romhack' ? 'romhacks' : `${type}s`;
      await goto(`/${route}/${slug}`);
    } catch (e: unknown) {
      err = (e as Error)?.message ?? 'Upload failed';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Upload — HexHive</title>
</svelte:head>

<div class="wizard-page" style="--accent: {accent};">
  <section class="wizard">
    <header class="wizard-header">
      <div class="scanlines" aria-hidden="true"></div>
      <div class="header-inner">
        <div class="eyebrow">
          {#if type}
            {@const Icon = TYPE_META[type].icon}
            <Icon size={14} />
          {:else}
            <Upload size={14} />
          {/if}
          <span>{stepCopy[step].eyebrow}</span>
        </div>
        <h1 class="title">{stepCopy[step].title}</h1>
        <p class="sub">{stepCopy[step].sub}</p>
      </div>
      {#if step > 0 && type}
        <div class="indicator-wrap">
          <WizardStepIndicator {steps} current={step} {accent} />
        </div>
      {/if}
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
          {#if step === 0}
            <!-- Type picker -->
            <div class="type-grid">
              {#each Object.entries(TYPE_META) as [key, meta] (key)}
                {@const Icon = meta.icon}
                <button
                  type="button"
                  class="type-tile"
                  class:active={type === key}
                  style="--tile-accent: {meta.accent};"
                  onclick={() => pickType(key as AssetType)}
                >
                  <span class="tile-icon"><Icon size={28} /></span>
                  <span class="tile-label">{meta.label}</span>
                  <span class="tile-blurb">{meta.blurb}</span>
                </button>
              {/each}
            </div>
          {:else if step === 1}
            <!-- Identity -->
            <div class="grid gap-5">
              <div class="grid gap-2">
                <Label for="title" class="field-label">Title</Label>
                <Input
                  id="title"
                  bind:value={common.title}
                  placeholder={
                    type === 'romhack'
                      ? "Kaizo Emerald: Director's Cut"
                      : type === 'sprite'
                        ? 'Hyperbright trainer fronts'
                        : type === 'sound'
                          ? 'Gen 5 cries pack'
                          : 'PSS injection helper'
                  }
                  required
                />
              </div>
              <div class="grid gap-2">
                <Label for="description" class="field-label">Description</Label>
                <textarea
                  id="description"
                  rows="6"
                  bind:value={common.description}
                  placeholder={
                    type === 'romhack'
                      ? "What's different about this hack? What's the hook?"
                      : "What's in the pack? Anything special about it?"
                  }
                  class="border rounded-lg px-3 py-2 bg-background text-sm leading-relaxed"
                ></textarea>
                <p class="hint">Plain text. ~10k chars max. Be honest about scope and state.</p>
              </div>
            </div>
          {:else if step === 2}
            <!-- Target -->
            {#if type === 'romhack'}
              <div class="grid gap-6">
                <div class="grid gap-3">
                  <span class="field-label">Base ROM</span>
                  <div class="toggle-grid two">
                    {#each SUPPORTED_BASE_ROM as r}
                      <button
                        type="button"
                        class="toggle"
                        class:active={romhack.baseRom === r}
                        onclick={() => (romhack.baseRom = r)}
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
                          class:active={romhack.baseRomVersion === v}
                          onclick={() => (romhack.baseRomVersion = v)}
                        >
                          {v}
                        </button>
                      {/each}
                    </div>
                  </div>
                  <div class="grid gap-2">
                    <Label for="release" class="field-label">Release tag</Label>
                    <Input id="release" bind:value={romhack.release} placeholder="1.0.0" required />
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
                        class:active={romhack.baseRomRegion === r}
                        onclick={() => (romhack.baseRomRegion = r)}
                      >
                        {r}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>
            {:else}
              <!-- asset-hive: targeted ROMs + per-type extras -->
              <div class="grid gap-6">
                <div class="grid gap-3">
                  <span class="field-label">Targeted ROMs</span>
                  <div class="toggle-grid two">
                    {#each SUPPORTED_BASE_ROM as r}
                      {@const on = hive.targetedRoms.includes(r)}
                      <button
                        type="button"
                        class="toggle"
                        class:active={on}
                        onclick={() => toggleTargetedRom(r, !on)}
                      >
                        <span class="toggle-glyph">CART</span>
                        <span class="toggle-label">{r}</span>
                      </button>
                    {/each}
                  </div>
                  <p class="hint">Pick all that apply.</p>
                </div>

                {#if type === 'sprite'}
                  <div class="grid sm:grid-cols-3 gap-3">
                    <div class="grid gap-2">
                      <Label for="sp-type" class="field-label">Type</Label>
                      <select
                        id="sp-type"
                        bind:value={sprite.type}
                        class="border rounded-md px-3 py-2 bg-background text-sm"
                      >
                        {#each spriteTypes as t}<option value={t}>{t}</option>{/each}
                      </select>
                    </div>
                    <div class="grid gap-2">
                      <Label for="sp-sub" class="field-label">Subtype</Label>
                      <select
                        id="sp-sub"
                        bind:value={sprite.subtype}
                        class="border rounded-md px-3 py-2 bg-background text-sm"
                      >
                        {#each spriteSubtypes as s}<option value={s}>{s}</option>{/each}
                      </select>
                    </div>
                    <div class="grid gap-2">
                      <Label for="sp-var" class="field-label">Variant</Label>
                      {#if spriteVariantKind === 'none'}
                        <Input id="sp-var" disabled value="" placeholder="not applicable" />
                      {:else if spriteVariantKind === 'closed' && spriteClosedList}
                        <select
                          id="sp-var"
                          bind:value={sprite.variantText}
                          class="border rounded-md px-3 py-2 bg-background text-sm"
                        >
                          <option value="">—</option>
                          {#each spriteClosedList as v}<option value={v}>{v}</option>{/each}
                        </select>
                      {:else}
                        <Input id="sp-var" bind:value={sprite.variantText} placeholder="free-form" />
                      {/if}
                    </div>
                  </div>
                {:else if type === 'sound'}
                  <div class="grid gap-3">
                    <span class="field-label">Sound category</span>
                    <div class="toggle-grid four">
                      {#each SOUND_CATEGORY as c}
                        <button
                          type="button"
                          class="toggle compact"
                          class:active={sound.category === c}
                          onclick={() => (sound.category = c)}
                        >
                          {c}
                        </button>
                      {/each}
                    </div>
                  </div>
                {:else if type === 'script'}
                  <div class="grid gap-3">
                    <span class="field-label">Targeted versions</span>
                    <div class="toggle-grid two">
                      {#each SUPPORTED_BASE_ROM_VERSION as v}
                        {@const on = script.targetedVersions.includes(v)}
                        <button
                          type="button"
                          class="toggle compact"
                          class:active={on}
                          onclick={() => toggleTargetedVersion(v, !on)}
                        >
                          {v}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          {:else if step === 3}
            <!-- Details: permissions + type-specific tags/categories -->
            <div class="grid gap-6">
              <div class="grid gap-3">
                <span class="field-label">Permissions</span>
                <div class="toggle-grid four">
                  {#each ASSET_PERMISSION as p}
                    {@const on = common.permissions.includes(p)}
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

              {#if type === 'romhack'}
                <div class="grid gap-2">
                  <Label for="rh-cats" class="field-label">Categories</Label>
                  <Input
                    id="rh-cats"
                    bind:value={romhack.categoriesText}
                    placeholder="Difficulty, Story, …"
                  />
                  <SuggestionChips
                    bind:value={romhack.categoriesText}
                    suggestions={ROMHACK_CATEGORY}
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="rh-states" class="field-label">States</Label>
                  <Input
                    id="rh-states"
                    bind:value={romhack.statesText}
                    placeholder="Beta, Actively Updated, …"
                  />
                  <SuggestionChips bind:value={romhack.statesText} suggestions={ROMHACK_STATE} />
                </div>
                <div class="grid gap-2">
                  <Label for="rh-tags" class="field-label">Tags</Label>
                  <Input
                    id="rh-tags"
                    bind:value={common.tagsText}
                    placeholder="nuzlocke, randomized, fakemon, …"
                  />
                  <p class="hint">Free-form. Comma-separated.</p>
                </div>
              {:else if type === 'script'}
                <div class="grid gap-2">
                  <Label for="sc-cats" class="field-label">Categories</Label>
                  <Input
                    id="sc-cats"
                    bind:value={script.categoriesText}
                    placeholder="Feature, Engine Upgrade, …"
                  />
                  <SuggestionChips
                    bind:value={script.categoriesText}
                    suggestions={SCRIPT_CATEGORY}
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="sc-feats" class="field-label">Features</Label>
                  <Input
                    id="sc-feats"
                    bind:value={script.featuresText}
                    placeholder="Engine, Cutscene, NPC, …"
                  />
                  <SuggestionChips bind:value={script.featuresText} suggestions={SCRIPT_FEATURE} />
                </div>
                <div class="grid gap-2">
                  <Label for="sc-prereq" class="field-label">Prerequisites</Label>
                  <Input
                    id="sc-prereq"
                    bind:value={script.prerequisitesText}
                    placeholder="CFRU, DPE, …"
                  />
                  <SuggestionChips
                    bind:value={script.prerequisitesText}
                    suggestions={SCRIPT_PREREQUISITE}
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="sc-tools" class="field-label">Tools</Label>
                  <Input
                    id="sc-tools"
                    bind:value={script.toolsText}
                    placeholder="HexManiacAdvance, Python, …"
                  />
                  <SuggestionChips bind:value={script.toolsText} suggestions={SCRIPT_TOOL} />
                </div>
              {/if}
            </div>
          {:else}
            <!-- Files + summary -->
            <div class="grid gap-6">
              <div>
                <span class="field-label block mb-2">Files</span>
                {#if type}
                  <FileDropzone bind:files accept={TYPE_META[type].fileAccept} />
                  <p class="hint mt-2">{TYPE_META[type].fileHint}.</p>
                {/if}
              </div>

              <aside class="summary">
                <p class="summary-eyebrow">Pre-flight</p>
                <dl class="summary-list">
                  <div><dt>Type</dt><dd>{type ? TYPE_META[type].label : '—'}</dd></div>
                  <div><dt>Title</dt><dd>{common.title || '—'}</dd></div>
                  {#if type === 'romhack'}
                    <div>
                      <dt>Target</dt>
                      <dd>{romhack.baseRom} · {romhack.baseRomVersion} · {romhack.baseRomRegion}</dd>
                    </div>
                    <div><dt>Release</dt><dd>{romhack.release}</dd></div>
                  {:else}
                    <div><dt>Targeted</dt><dd>{hive.targetedRoms.join(', ') || '—'}</dd></div>
                    {#if type === 'sprite'}
                      <div>
                        <dt>Category</dt>
                        <dd>{sprite.type} / {sprite.subtype}{sprite.variantText ? ` · ${sprite.variantText}` : ''}</dd>
                      </div>
                    {:else if type === 'sound'}
                      <div><dt>Category</dt><dd>{sound.category}</dd></div>
                    {:else if type === 'script'}
                      <div>
                        <dt>Versions</dt>
                        <dd>{script.targetedVersions.join(', ') || '—'}</dd>
                      </div>
                    {/if}
                  {/if}
                  <div>
                    <dt>Permissions</dt>
                    <dd>{common.permissions.join(', ') || '—'}</dd>
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
        <Button type="button" variant="ghost" onclick={back} disabled={step === 0 || busy}>
          <ChevronLeft size={16} />
          Back
        </Button>
        <span class="footer-progress">
          {#if step === 0}
            {`Step 0 of ${steps.length}`}
          {:else}
            {`Step ${step} of ${steps.length}`}
          {/if}
        </span>
        <Button type="submit" disabled={!stepValid || busy}>
          {#if step === 0}
            Continue
            <ChevronRight size={16} />
          {:else if step < 4}
            Continue
            <ChevronRight size={16} />
          {:else}
            <Upload size={16} />
            {busy ? 'Publishing…' : 'Publish'}
          {/if}
        </Button>
      </div>

      {#if step > 0 && type}
        <nav class="wizard-jumps" aria-label="Wizard sections">
          <button
            type="button"
            onclick={() => jumpTo(0)}
            aria-label="Change asset type"
          >
            ← Type
          </button>
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
      {/if}
    </form>
  </section>
</div>

<style>
  .wizard-page {
    background:
      radial-gradient(
        ellipse 60% 80% at 50% 0%,
        color-mix(in oklch, var(--accent) 8%, transparent) 0%,
        transparent 60%
      ),
      var(--background);
    min-height: 100%;
    padding: 2.5rem 1rem 4rem;
    transition: --accent 0.4s ease;
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

  /* Type-picker grid */
  .type-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .type-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .type-tile {
    display: grid;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
    border: 1px solid var(--border);
    border-radius: 0.875rem;
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      transform 0.12s ease,
      box-shadow 0.18s ease;
  }
  .type-tile:hover {
    border-color: var(--tile-accent);
    background: color-mix(in oklch, var(--tile-accent) 8%, var(--background));
    box-shadow: 0 0 24px -8px color-mix(in oklch, var(--tile-accent) 70%, transparent);
  }
  .type-tile:active {
    transform: translateY(1px);
  }
  .type-tile.active {
    border-color: var(--tile-accent);
    background: color-mix(in oklch, var(--tile-accent) 14%, var(--background));
  }
  .tile-icon {
    color: var(--tile-accent);
    display: inline-flex;
  }
  .tile-label {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--foreground);
  }
  .tile-blurb {
    color: var(--muted-foreground);
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  /* Toggle-group pills (Target + Details steps) */
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

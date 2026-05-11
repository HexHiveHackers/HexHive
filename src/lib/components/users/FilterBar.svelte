<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import TypeIcon from '$lib/components/listings/TypeIcon.svelte';
  import { Button } from '$lib/components/ui/button';
  import type { ListingType } from '$lib/db/schema';
  import {
    type ActivePreset,
    applyChip,
    type ChipState,
    chipStateFromQuery,
    type JoinedPreset,
    type NumPreset,
  } from './filter-state';

  interface Props {
    query: string;
    affiliations: string[];
  }
  let { query = $bindable(), affiliations }: Props = $props();

  type ChipKey = 'type' | 'active' | 'joined' | 'downloads' | 'listings' | 'has' | 'affiliation';
  let openChip = $state<ChipKey | null>(null);
  let rootEl: HTMLDivElement | undefined = $state();

  const chips = $derived<ChipState>(chipStateFromQuery(query));

  function set<K extends keyof ChipState>(key: K, value: ChipState[K]): void {
    query = applyChip(query, key, value);
  }

  function toggle(chip: ChipKey): void {
    openChip = openChip === chip ? null : chip;
  }

  function toggleType(t: string): void {
    set('types', chips.types.includes(t) ? chips.types.filter((x) => x !== t) : [...chips.types, t]);
  }
  function toggleHas(name: string): void {
    set('has', chips.has.includes(name) ? chips.has.filter((h) => h !== name) : [...chips.has, name]);
  }
  function toggleAffiliation(a: string): void {
    set(
      'affiliations',
      chips.affiliations.includes(a) ? chips.affiliations.filter((x) => x !== a) : [...chips.affiliations, a],
    );
  }
  function toggleActive(p: ActivePreset): void {
    set('active', chips.active === p ? 'any' : p);
  }
  function toggleJoined(p: JoinedPreset): void {
    set('joined', chips.joined === p ? 'any' : p);
  }
  function toggleDownloads(p: NumPreset): void {
    set('downloads', chips.downloads === p ? 'any' : p);
  }
  function toggleListings(p: NumPreset): void {
    set('listings', chips.listings === p ? 'any' : p);
  }

  $effect(() => {
    function onDown(e: MouseEvent): void {
      if (!rootEl) return;
      if (e.target instanceof Node && !rootEl.contains(e.target)) openChip = null;
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  });

  // Order + colors mirror the site nav (Header.svelte). `tool` is not yet a
  // ListingType so it's excluded here — see the tool-as-listing-type plan.
  const ASSET_TYPES: { id: ListingType; label: string; accent: string }[] = [
    { id: 'sprite', label: 'Sprites', accent: '#fb7185' },
    { id: 'sound', label: 'Sounds', accent: '#f59e0b' },
    { id: 'script', label: 'Scripts', accent: '#10b981' },
    { id: 'romhack', label: 'Romhacks', accent: '#a78bfa' },
  ];
  const HAS_OPTIONS: { id: string; label: string }[] = [
    { id: 'hasBio', label: 'Has bio' },
    { id: 'hasAlias', label: 'Has alias' },
    { id: 'hasAvatar', label: 'Has avatar' },
    { id: 'hasLinks', label: 'Has links' },
    { id: 'hasAffiliations', label: 'Has affiliations' },
  ];
  const ACTIVE_PRESETS: { id: ActivePreset; label: string }[] = [
    { id: 'last7', label: 'Last 7 days' },
    { id: 'last30', label: 'Last 30 days' },
    { id: 'thisYear', label: 'This year' },
    { id: 'never', label: 'Never' },
  ];
  const JOINED_PRESETS: { id: JoinedPreset; label: string }[] = [
    { id: 'last30d', label: 'Last 30 days' },
    { id: 'lastYear', label: 'Last year' },
    { id: 'thisYear', label: 'This year' },
  ];
  const DOWNLOAD_PRESETS: { id: NumPreset; label: string }[] = [
    { id: 'gte1', label: '≥ 1' },
    { id: 'gte100', label: '≥ 100' },
    { id: 'gte1000', label: '≥ 1000' },
  ];
  const LISTING_PRESETS: { id: NumPreset; label: string }[] = [
    { id: 'gte1', label: '≥ 1' },
    { id: 'gte5', label: '≥ 5' },
    { id: 'gte20', label: '≥ 20' },
  ];

  function activeLabel(p: ActivePreset): string {
    const m = ACTIVE_PRESETS.find((x) => x.id === p);
    return m ? m.label : '';
  }
  function joinedLabel(p: JoinedPreset): string {
    const m = JOINED_PRESETS.find((x) => x.id === p);
    return m ? m.label : '';
  }
  function numLabel(presets: { id: NumPreset; label: string }[], p: NumPreset): string {
    const m = presets.find((x) => x.id === p);
    return m ? m.label : '';
  }
</script>

<div bind:this={rootEl} class="flex flex-wrap items-center gap-2">
  <!-- Type -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'type'}
      onclick={() => toggle('type')}
    >
      Type{chips.types.length ? ` (${chips.types.length})` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'type'}
      <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
        {#each ASSET_TYPES as t (t.id)}
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleType(t.id)}
          >
            <span style="color: {t.accent}" class="inline-flex shrink-0">
              <TypeIcon type={t.id} size={14} />
            </span>
            <span class="flex-1 text-left">{t.label}</span>
            {#if chips.types.includes(t.id)}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Active -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'active'}
      onclick={() => toggle('active')}
    >
      Active{chips.active !== 'any' ? `: ${activeLabel(chips.active)}` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'active'}
      <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
        {#each ACTIVE_PRESETS as p (p.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleActive(p.id)}
          >
            <span>{p.label}</span>
            {#if chips.active === p.id}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Joined -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'joined'}
      onclick={() => toggle('joined')}
    >
      Joined{chips.joined !== 'any' ? `: ${joinedLabel(chips.joined)}` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'joined'}
      <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
        {#each JOINED_PRESETS as p (p.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleJoined(p.id)}
          >
            <span>{p.label}</span>
            {#if chips.joined === p.id}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Downloads -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'downloads'}
      onclick={() => toggle('downloads')}
    >
      Downloads{chips.downloads !== 'any' ? `: ${numLabel(DOWNLOAD_PRESETS, chips.downloads)}` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'downloads'}
      <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
        {#each DOWNLOAD_PRESETS as p (p.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleDownloads(p.id)}
          >
            <span>{p.label}</span>
            {#if chips.downloads === p.id}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Listings -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'listings'}
      onclick={() => toggle('listings')}
    >
      Listings{chips.listings !== 'any' ? `: ${numLabel(LISTING_PRESETS, chips.listings)}` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'listings'}
      <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
        {#each LISTING_PRESETS as p (p.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleListings(p.id)}
          >
            <span>{p.label}</span>
            {#if chips.listings === p.id}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Has -->
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="listbox"
      aria-expanded={openChip === 'has'}
      onclick={() => toggle('has')}
    >
      Has&hellip;{chips.has.length ? ` (${chips.has.length})` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
    </Button>
    {#if openChip === 'has'}
      <div class="absolute left-0 top-full z-10 mt-1 w-52 rounded-md border bg-popover p-1 shadow-md">
        {#each HAS_OPTIONS as h (h.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onclick={() => toggleHas(h.id)}
          >
            <span>{h.label}</span>
            {#if chips.has.includes(h.id)}<span aria-hidden="true">&#10003;</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Affiliation -->
  {#if affiliations.length > 0}
    <div class="relative">
      <Button
        variant="outline"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={openChip === 'affiliation'}
        onclick={() => toggle('affiliation')}
      >
        Affiliation{chips.affiliations.length ? ` (${chips.affiliations.length})` : ''}<ChevronDown aria-hidden="true" class="ml-0.5 size-3.5 opacity-60 transition-transform group-aria-expanded/button:rotate-180" />
      </Button>
      {#if openChip === 'affiliation'}
        <div
          class="absolute left-0 top-full z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {#each affiliations as a (a)}
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onclick={() => toggleAffiliation(a)}
            >
              <span class="truncate">{a}</span>
              {#if chips.affiliations.includes(a)}<span aria-hidden="true">&#10003;</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Identity toggles (no panel) -->
  <Button
    variant={chips.hidePlaceholder ? 'default' : 'outline'}
    size="sm"
    onclick={() => set('hidePlaceholder', !chips.hidePlaceholder)}
  >
    Hide unclaimed
  </Button>
  <Button
    variant={chips.adminOnly ? 'default' : 'outline'}
    size="sm"
    onclick={() => set('adminOnly', !chips.adminOnly)}
  >
    Admin
  </Button>
</div>

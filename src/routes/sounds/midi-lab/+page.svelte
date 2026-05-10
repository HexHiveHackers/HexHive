<script lang="ts">
  import { FlaskConical, Loader2, Music, Pause, Play, RefreshCw, Repeat, Upload } from '@lucide/svelte';
  import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { detectDrumChannels, parseSmf, rewriteProgramChanges } from '$lib/midi-lab/midi-rewrite';
  import { loadOverrides, saveOverride } from '$lib/midi-lab/overrides';
  import { autoMap, listPresets, type MappingChoice, type SfPreset } from '$lib/midi-lab/preset-map';
  import { hashVoicegroup, type ParsedVoicegroup, parseVoicegroup, type VoiceEntry } from '$lib/midi-lab/voicegroup';
  import type { PageData } from './$types';

  // Each soundfont is rendered as a "BANK CHIP". `era` drives the tab
  // grouping (Gen III / Gen I·II / Engine / Universal); `tone` drives the
  // per-card colour identity (FRLG=orange, Emerald=emerald, RSE=indigo,
  // Mills multi-game=violet, Gen I=red, Gen II=amber/gold, GMGSx=fuchsia,
  // GeneralUser GS=sky). Tabs themselves are neutral so the eye reads the
  // card colours, not the chrome.
  type Era = 'gen1' | 'gen2' | 'gen1-2' | 'gen3' | 'engine' | 'gm';
  type Platform = 'GB' | 'GBA' | 'Engine' | 'Universal';
  type Tone = 'orange' | 'emerald' | 'violet' | 'fuchsia' | 'red' | 'amber' | 'sky' | 'indigo';
  type Soundfont = {
    id: string;
    url: string;
    title: string; // short human title for the chip face
    label: string; // long label for accessible-name + dropdowns
    byline: string; // creator / source line
    era: Era;
    tone: Tone;
    platform: Platform;
    games: readonly string[]; // short codes: "FR/LG", "R/S/E", "Em.", "R/B/Y", "G/S/C"
    context?: string; // for engine banks: which engine this targets
  };
  const SOUNDFONTS: Soundfont[] = [
    {
      id: 'vgk-frlg',
      url: 'https://cdn.hexhive.app/soundfonts/Pokemon-FireRed-LeafGreen-VGK.sf2',
      title: 'FireRed / LeafGreen',
      label: 'FireRed/LeafGreen (VGK)',
      byline: 'VGK rip',
      era: 'gen3',
      tone: 'orange',
      platform: 'GBA',
      games: ['FR/LG'],
    },
    {
      id: 'pkmn-gba',
      url: 'https://cdn.hexhive.app/soundfonts/Pok_mon_GBA.sf2',
      title: 'Pokémon GBA',
      label: 'Pokémon GBA (Mills)',
      byline: 'Mills · multi-game',
      era: 'gen3',
      tone: 'violet',
      platform: 'GBA',
      games: ['R/S/E', 'FR/LG'],
    },
    {
      id: 'emerald-updated',
      url: 'https://cdn.hexhive.app/soundfonts/Pokemon-Emerald-Updated-2025-08-29.sf2',
      title: 'Emerald · updated',
      label: 'Pokémon Emerald (updated 2025-08-29)',
      byline: 'community · 2025-08-29',
      era: 'gen3',
      tone: 'emerald',
      platform: 'GBA',
      games: ['Em.'],
    },
    {
      id: 'rse-v2',
      url: 'https://cdn.hexhive.app/soundfonts/Pokemon-RSE-v2.0-unofficial.sf2',
      title: 'RSE v2.0',
      label: 'Pokémon RSE v2.0 (unofficial)',
      byline: 'unofficial · v2.0',
      era: 'gen3',
      tone: 'indigo',
      platform: 'GBA',
      games: ['R/S/E'],
    },
    {
      id: 'emerald-actual',
      url: 'https://cdn.hexhive.app/soundfonts/Pokemon-Emerald-Actual.sf2',
      title: 'Emerald · actual',
      label: 'Pokémon Emerald (Actual)',
      byline: 'verbatim ROM rip',
      era: 'gen3',
      tone: 'emerald',
      platform: 'GBA',
      games: ['Em.'],
    },
    {
      id: 'gmgsx-zeak',
      url: 'https://cdn.hexhive.app/soundfonts/GMGSx-zeak-Fire-Red.sf2',
      title: 'GMGSx',
      label: 'GMGSx (Pokémon Essentials / zeak6464)',
      byline: 'zeak6464 · GM-style',
      era: 'engine',
      tone: 'fuchsia',
      platform: 'Engine',
      games: [],
      context: 'Pokémon Essentials',
    },
    {
      id: 'gameboy-gm-cynthia',
      url: 'https://cdn.hexhive.app/soundfonts/Gameboy-GM-CynthiaCelestic.sf2',
      title: 'Game Boy GM',
      label: 'Game Boy GM — Pokémon Gen 1+2 (CynthiaCelestic)',
      byline: 'CynthiaCelestic',
      era: 'gen1-2',
      tone: 'red',
      platform: 'GB',
      games: ['R/B/Y', 'G/S/C'],
    },
    {
      id: 'gameboy-gm-stgiga',
      url: 'https://cdn.hexhive.app/soundfonts/Gameboy-GM-stgiga-fixed.sf2',
      title: 'Game Boy GM · fixed',
      label: 'Game Boy GM — Pokémon Gen 1+2 (stgiga fixed)',
      byline: 'stgiga · re-tuned',
      era: 'gen1-2',
      tone: 'amber',
      platform: 'GB',
      games: ['R/B/Y', 'G/S/C'],
    },
    {
      id: 'gus',
      url: 'https://cdn.hexhive.app/soundfonts/GeneralUser-GS.sf2',
      title: 'GeneralUser GS',
      label: 'GeneralUser GS',
      byline: 'S. Christian Collins',
      era: 'gm',
      tone: 'sky',
      platform: 'Universal',
      games: [],
      context: 'universal GM bank',
    },
  ];

  // Era labels for the small tag at the top of each chip. Tailwind classes
  // are written out in full so the JIT picks them up — no string
  // interpolation in class= attributes anywhere below.
  const ERA_LABEL: Record<Era, string> = {
    gen1: 'GEN I',
    gen2: 'GEN II',
    'gen1-2': 'GEN I·II',
    gen3: 'GEN III',
    engine: 'ENGINE',
    gm: 'GM',
  };
  const TONE_STRIPE: Record<Tone, string> = {
    // FRLG flame gradient — red → orange → amber. Most-hacked GBA target,
    // earns the warmest stripe in the rack.
    orange: 'bg-gradient-to-r from-red-500/80 via-orange-500/80 to-amber-400/80',
    emerald: 'bg-emerald-500/80',
    violet: 'bg-violet-500/80',
    fuchsia: 'bg-fuchsia-500/80',
    red: 'bg-red-500/80',
    amber: 'bg-amber-500/80',
    sky: 'bg-sky-400/80',
    indigo: 'bg-indigo-500/80',
  };
  const TONE_LED_READY: Record<Tone, string> = {
    orange: 'bg-orange-400 shadow-[0_0_5px_1px_rgba(251,146,60,0.6)]',
    emerald: 'bg-emerald-400 shadow-[0_0_5px_1px_rgba(52,211,153,0.6)]',
    violet: 'bg-violet-400 shadow-[0_0_5px_1px_rgba(167,139,250,0.6)]',
    fuchsia: 'bg-fuchsia-400 shadow-[0_0_5px_1px_rgba(232,121,249,0.6)]',
    red: 'bg-red-400 shadow-[0_0_5px_1px_rgba(248,113,113,0.6)]',
    amber: 'bg-amber-400 shadow-[0_0_5px_1px_rgba(251,191,36,0.6)]',
    sky: 'bg-sky-300 shadow-[0_0_5px_1px_rgba(125,211,252,0.6)]',
    indigo: 'bg-indigo-400 shadow-[0_0_5px_1px_rgba(129,140,248,0.6)]',
  };
  const TONE_LED_ACTIVE: Record<Tone, string> = {
    orange: 'bg-orange-300 shadow-[0_0_12px_3px_rgba(251,146,60,0.9)]',
    emerald: 'bg-emerald-300 shadow-[0_0_12px_3px_rgba(52,211,153,0.9)]',
    violet: 'bg-violet-300 shadow-[0_0_12px_3px_rgba(167,139,250,0.9)]',
    fuchsia: 'bg-fuchsia-300 shadow-[0_0_12px_3px_rgba(232,121,249,0.9)]',
    red: 'bg-red-300 shadow-[0_0_12px_3px_rgba(248,113,113,0.9)]',
    amber: 'bg-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.9)]',
    sky: 'bg-sky-200 shadow-[0_0_12px_3px_rgba(125,211,252,0.9)]',
    indigo: 'bg-indigo-300 shadow-[0_0_12px_3px_rgba(129,140,248,0.9)]',
  };
  const TONE_TEXT: Record<Tone, string> = {
    orange: 'text-orange-300',
    emerald: 'text-emerald-300',
    violet: 'text-violet-300',
    fuchsia: 'text-fuchsia-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
    sky: 'text-sky-200',
    indigo: 'text-indigo-300',
  };
  // Active card glow ring per tone — matches the LED's colour family so
  // the whole chip feels like one lit unit.
  const TONE_RING: Record<Tone, string> = {
    orange: 'border-orange-500/70 shadow-[0_0_0_1px_rgba(249,115,22,0.3),0_0_24px_-6px_rgba(249,115,22,0.75)]',
    emerald: 'border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_24px_-6px_rgba(16,185,129,0.75)]',
    violet: 'border-violet-500/70 shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_0_24px_-6px_rgba(139,92,246,0.75)]',
    fuchsia: 'border-fuchsia-500/70 shadow-[0_0_0_1px_rgba(217,70,239,0.3),0_0_24px_-6px_rgba(217,70,239,0.75)]',
    red: 'border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_0_24px_-6px_rgba(239,68,68,0.75)]',
    amber: 'border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.3),0_0_24px_-6px_rgba(245,158,11,0.75)]',
    sky: 'border-sky-400/70 shadow-[0_0_0_1px_rgba(56,189,248,0.3),0_0_24px_-6px_rgba(56,189,248,0.75)]',
    indigo: 'border-indigo-500/70 shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_0_24px_-6px_rgba(99,102,241,0.75)]',
  };

  // Bank rack tabs — group by era so the user picks family first, chip
  // second. Order matters: Gen III is the most-used and goes first.
  type GroupId = 'gen3' | 'gen1-2' | 'engine' | 'gm';
  const GROUPS: { id: GroupId; label: string; sub: string; eras: readonly Era[] }[] = [
    { id: 'gen3', label: 'Gen III', sub: 'Game Boy Advance', eras: ['gen3'] },
    { id: 'gen1-2', label: 'Gen I · II', sub: 'Game Boy / Color', eras: ['gen1', 'gen2', 'gen1-2'] },
    { id: 'engine', label: 'Engines', sub: 'Pokémon Essentials et al.', eras: ['engine'] },
    { id: 'gm', label: 'Universal', sub: 'GM fallback', eras: ['gm'] },
  ];
  function groupOf(era: Era): GroupId {
    return GROUPS.find((g) => g.eras.includes(era))?.id ?? 'gen3';
  }
  let activeTab = $state<GroupId>(groupOf(SOUNDFONTS[0].era));
  // Whenever the active soundfont changes (e.g. via fixture auto-switch),
  // jump the tab to the group that contains it so the user can see what's
  // selected without hunting.
  $effect(() => {
    activeTab = groupOf(soundfont.era);
  });

  // Fixture rack tabs — same pattern as banks. Sappy GBA rips and the
  // Pokémon Essentials GM bundle are conceptually different sources so
  // they get their own tabs; otherwise the bar would be a long scroll.
  type FixtureTabId = 'sappy' | 'gm';
  const FIXTURE_TABS: { id: FixtureTabId; label: string; sub: string; kind: 'sappy' | 'gm' }[] = [
    { id: 'sappy', label: 'GBA rips', sub: 'Sappy engine · .mid + voicegroup', kind: 'sappy' },
    { id: 'gm', label: 'Pokémon Essentials', sub: 'GM render · zeak6464/Fire-Red', kind: 'gm' },
  ];
  let activeFixtureTab = $state<FixtureTabId>('sappy');
  $effect(() => {
    if (loaded) activeFixtureTab = loaded.kind === 'sappy' ? 'sappy' : 'gm';
  });
  const WORKLET_URL = '/spessasynth_processor.min.js';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    songId: string;
    label: string;
    midiBytes: ArrayBuffer;
    voicegroup: ParsedVoicegroup; // synthetic stub for GM-mode fixtures
    vgHash: string;
    refUrl: string | null;
    refKind: 'mp3' | 'ogg' | null;
    usedSlots: ReadonlySet<number>;
    usedChannels: ReadonlySet<number>;
    // 'sappy' fixtures get their MIDI rewritten through the voicegroup map.
    // 'gm' fixtures are GM-format and play through whichever soundfont is
    // selected — no remap, no mapping table.
    kind: 'sappy' | 'gm';
    referenceSoundfont: string | null; // for gm: which dropdown id was used to render the OGG
  };

  let loaded = $state<Loaded | null>(null);
  let presets = $state<readonly SfPreset[]>([]);
  let overrides = $state<Record<number, MappingChoice>>({});
  let warnings = $state<string[]>([]);
  let mutedChannels = $state<Set<number>>(new Set());
  let mutedSlots = $state<Set<number>>(new Set());
  let loopOn = $state(true);
  let soundfont = $state<Soundfont>(SOUNDFONTS[0]);
  let activeBankId = $state('');
  // The id of the bank the worklet is currently parsing (or null when
  // idle). Drives the white-pulse LED on the target chip and the
  // "loading…" indicator in the rack header.
  let swappingTo = $state<string | null>(null);
  // If a swap is in flight and the user clicks another chip, we stash the
  // latest target here. When the running swap finishes, it drains pending
  // — so rapid clicks always converge on the *last* one chosen, never on
  // an intermediate target.
  let switchPending: Soundfont | null = null;
  // Cache the SF2 bytes as a Blob so we can re-derive a fresh ArrayBuffer
  // each call. spessasynth's addSoundBank TRANSFERS the ArrayBuffer to the
  // worklet thread (detaches it on our side), so caching the buffer
  // directly would mean the second fetch returns an empty/detached buffer
  // and the worklet gets 0 bytes — producing a corrupt bank, garbled
  // audio, and the cascade of "wrong instruments" / "site slows down"
  // bugs we were chasing. Blobs are immutable; .arrayBuffer() always
  // returns a brand-new buffer the worklet is free to detach.
  const sfBlobCache = new Map<string, Promise<Blob>>();
  let mp3El = $state<HTMLAudioElement | null>(null);
  // Track which song the Sequencer currently has loaded so we don't
  // re-process the MIDI on every override/mute change unnecessarily, and
  // so we know whether the first Play click needs to do the initial load.
  let seqLoadedFor = $state<string | null>(null);

  // Engine state mirrors SoundPlayer.svelte's lifecycle.
  let engineState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let isPlaying = $state(false);
  // Set when the user explicitly pauses; cleared when they explicitly play.
  // Async loads (soundfont swap, fixture switch) capture isPlaying at the
  // start and re-play after the load — without this latch, a pause click
  // mid-load would be silently undone by the auto-resume.
  let pauseLatch = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let ctx: AudioContext | null = null;
  let synth: WorkletSynthesizer | null = null;
  let seq: Sequencer | null = null;
  let rafId = 0;

  let libPromise: Promise<typeof import('spessasynth_lib')> | null = null;

  async function fetchSoundfont(sf: Soundfont): Promise<ArrayBuffer> {
    let p = sfBlobCache.get(sf.id);
    if (!p) {
      p = fetch(sf.url).then((r) => r.blob());
      sfBlobCache.set(sf.id, p);
    }
    const blob = await p;
    return blob.arrayBuffer();
  }

  function prewarm(): void {
    if (typeof window === 'undefined') return;
    void fetchSoundfont(soundfont);
    if (!libPromise) libPromise = import('spessasynth_lib');
  }

  async function initEngine(): Promise<void> {
    if (engineState === 'ready' || engineState === 'loading') return;
    engineState = 'loading';
    try {
      prewarm();
      const audioCtx = new AudioContext();
      await audioCtx.audioWorklet.addModule(WORKLET_URL);
      const lib = await (libPromise as Promise<typeof import('spessasynth_lib')>);
      const s = new lib.WorkletSynthesizer(audioCtx);
      s.connect(audioCtx.destination);
      const buf = await fetchSoundfont(soundfont);
      await s.soundBankManager.addSoundBank(buf, soundfont.id);
      activeBankId = soundfont.id;
      await s.isReady;
      const sq = new lib.Sequencer(s);
      sq.eventHandler.addEvent('songEnded', 'midilab-end', () => {
        isPlaying = false;
      });
      ctx = audioCtx;
      synth = s;
      seq = sq;
      presets = listPresets(s);
      engineState = 'ready';
    } catch (err) {
      console.error('midi-lab: engine init failed', err);
      engineState = 'error';
    }
  }

  // Swap the active soundbank — strict single-bank model. Serialised: if
  // a swap is already in flight, the new target is stashed in
  // `switchPending` and the running swap drains it when it finishes. So
  // rapid clicks collapse: only the user's last selection actually
  // executes its swap, and the chip ring + label stay coherent.
  async function switchSoundbank(target: Soundfont): Promise<void> {
    if (!synth || activeBankId === target.id) return;
    if (swappingTo) {
      switchPending = target;
      return;
    }
    let next: Soundfont | null = target;
    while (next && synth && activeBankId !== next.id) {
      await runSwap(next);
      next = switchPending;
      switchPending = null;
    }
  }

  async function runSwap(target: Soundfont): Promise<void> {
    if (!synth) return;
    swappingTo = target.id;
    try {
      // Force-stop active voices so sustained notes on the old preset
      // don't ring through the swap.
      synth.stopAll(true);
      const buf = await fetchSoundfont(target);
      await synth.soundBankManager.addSoundBank(buf, target.id);
      synth.soundBankManager.priorityOrder = [
        target.id,
        ...synth.soundBankManager.priorityOrder.filter((id) => id !== target.id),
      ];
      // Delete every other resident bank so presetList is purely the
      // active bank's — no cross-bank fallback in autoMap.
      const others = synth.soundBankManager.priorityOrder.filter((id) => id !== target.id);
      for (const id of others) await synth.soundBankManager.deleteSoundBank(id);
      activeBankId = target.id;
      presets = listPresets(synth);
      if (loaded) {
        const t = seq?.currentTime ?? 0;
        await loadIntoSequencer(t);
      }
    } finally {
      swappingTo = null;
    }
  }

  // Debounce the soundfont-changed → switchSoundbank trigger so a flurry
  // of clicks doesn't kick off a parse that's about to be superseded.
  // 250 ms is short enough that intentional clicks still feel responsive.
  let switchDebounce: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const target = soundfont;
    void fetchSoundfont(target);
    if (engineState !== 'ready') return;
    if (switchDebounce) clearTimeout(switchDebounce);
    switchDebounce = setTimeout(() => {
      switchDebounce = null;
      void switchSoundbank(target);
    }, 250);
  });

  function awaitSongLoaded(s: Sequencer, id: string): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const tag = `midilab-load-${id}`;
      const finish = (): void => {
        if (done) return;
        done = true;
        s.eventHandler.removeEvent('songChange', tag);
        resolve();
      };
      s.eventHandler.addEvent('songChange', tag, finish);
      setTimeout(finish, 5000);
    });
  }

  function buildMappings(vg: ParsedVoicegroup, ovr: Record<number, MappingChoice>, ps: readonly SfPreset[]) {
    const out: Record<number, MappingChoice> = {};
    for (let slot = 0; slot < 128; slot++) {
      out[slot] = ovr[slot] ?? autoMap(vg.entries[slot], slot, ps);
    }
    return out;
  }

  // Slots actually referenced by at least one program-change in the MIDI.
  function usedSlotsOf(midi: ArrayBuffer): Set<number> {
    const used = new Set<number>();
    const smf = parseSmf(midi);
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && (e.status & 0xf0) === 0xc0) used.add(e.data[0]);
      }
    }
    return used;
  }

  // Channels (0-15) that have any MIDI event in the song. Useful for the
  // per-channel mute strip — only show buttons for channels actually used.
  function usedChannelsOf(midi: ArrayBuffer): Set<number> {
    const used = new Set<number>();
    const smf = parseSmf(midi);
    for (const track of smf.tracks) {
      for (const e of track) {
        if (e.kind === 'midi' && e.channel !== undefined) used.add(e.channel);
      }
    }
    return used;
  }

  async function loadIntoSequencer(restoreTime = 0): Promise<void> {
    if (!seq || !loaded) return;
    seqLoadedFor = null;
    let bytes: Uint8Array;
    if (loaded.kind === 'sappy') {
      const ps = presets;
      const merged = buildMappings(loaded.voicegroup, overrides, ps);
      const muted = mutedSlots;
      const resolver = (slot: number, _ch: number) => merged[slot];
      bytes = rewriteProgramChanges(loaded.midiBytes, resolver, muted.size > 0 ? (slot) => muted.has(slot) : undefined);
      // Drum kits live at SF2 bank 128 — a value MIDI's 7-bit CC0 can't
      // transmit. Tell the synth which channels should be drum-mode so the
      // program-change selects the kit instead of a melodic preset.
      const drumChannels = detectDrumChannels(loaded.midiBytes, resolver);
      if (synth) {
        for (let ch = 0; ch < 16; ch++) synth.setDrums(ch, drumChannels.has(ch));
      }
    } else {
      // GM fixture — pass the MIDI through verbatim. Reset every channel
      // back to non-drum so a previous Sappy fixture's drum-mode flags
      // don't leak; spessasynth will detect channel 9 as drums on its own
      // per the GM spec.
      bytes = new Uint8Array(loaded.midiBytes);
      if (synth) for (let ch = 0; ch < 16; ch++) synth.setDrums(ch, false);
    }
    const wasPlaying = isPlaying;
    // Pause for the duration of the load. Without this, the seq keeps
    // emitting note-ons through the swap and you get a brief patch of
    // wrong-instrument sound before the new song mounts.
    if (wasPlaying) {
      seq.pause();
      isPlaying = false;
    }
    const id = `${loaded.songId}-${Date.now()}`;
    const loadedP = awaitSongLoaded(seq, id);
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    seq.loadNewSongList([{ binary: buf, fileName: id }]);
    await loadedP;
    seq.loopCount = loopOn ? Number.POSITIVE_INFINITY : 0;
    duration = seq.duration;
    if (restoreTime > 0) seq.currentTime = Math.min(restoreTime, seq.duration);
    seqLoadedFor = loaded.songId;
    // Auto-resume only if the user didn't pause during the load. The
    // `pauseLatch` flag is set by an explicit pause() click and cleared by
    // play(), so it's a reliable read of the user's last-expressed intent.
    if (wasPlaying && !pauseLatch) {
      seq.play();
      isPlaying = true;
    }
  }

  function toggleLoop(): void {
    loopOn = !loopOn;
    if (seq) seq.loopCount = loopOn ? Number.POSITIVE_INFINITY : 0;
    if (mp3El) mp3El.loop = loopOn;
  }

  async function loadFixture(f: (typeof data.fixtures)[number]): Promise<void> {
    const midiBuf = await fetch(f.midiUrl).then((r) => r.arrayBuffer());
    if (f.kind === 'sappy') {
      // Sappy fixtures pick the soundfont that matches the source game so
      // the synth sounds right out-of-the-box. Users can swap afterwards.
      const target = SOUNDFONTS.find((s) => s.id === f.preferredSoundfont);
      if (target && soundfont.id !== target.id) soundfont = target;
      const incText = await fetch(f.voicegroupUrl).then((r) => r.text());
      await ingest({ id: f.id, label: f.label, kind: 'sappy', midiBytes: midiBuf, incText, refUrl: f.refUrl });
    } else {
      // GM fixture: the OGG was rendered through a known soundfont, so flip
      // the dropdown to that one for a faithful baseline. The user can swap
      // afterwards to compare other banks.
      const target = SOUNDFONTS.find((s) => s.id === f.referenceSoundfont);
      if (target && soundfont.id !== target.id) soundfont = target;
      await ingest({
        id: f.id,
        label: f.label,
        kind: 'gm',
        midiBytes: midiBuf,
        refUrl: f.refUrl,
        referenceSoundfont: f.referenceSoundfont,
      });
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('song') !== f.id) {
        url.searchParams.set('song', f.id);
        replaceState(url, page.state);
      }
    }
  }

  type IngestArgs =
    | { id: string; label: string; kind: 'sappy'; midiBytes: ArrayBuffer; incText: string; refUrl: string | null }
    | {
        id: string;
        label: string;
        kind: 'gm';
        midiBytes: ArrayBuffer;
        refUrl: string | null;
        referenceSoundfont: string;
      };

  async function ingest(args: IngestArgs): Promise<void> {
    // GM-mode fixtures don't have a voicegroup; build a synthetic stub so
    // the rest of the page (mute strip, scrub bar, etc.) keeps working.
    const vg =
      args.kind === 'sappy'
        ? parseVoicegroup(args.incText)
        : { name: 'gm', entries: [], warnings: [] satisfies string[] };
    const vgHash = args.kind === 'sappy' ? hashVoicegroup(vg) : `gm:${args.id}`;
    const used = args.kind === 'sappy' ? usedSlotsOf(args.midiBytes) : new Set<number>();
    const usedCh = usedChannelsOf(args.midiBytes);
    const refKind = args.refUrl?.endsWith('.ogg') ? 'ogg' : args.refUrl ? 'mp3' : null;
    loaded = {
      songId: args.id,
      label: args.label,
      midiBytes: args.midiBytes,
      voicegroup: vg as ParsedVoicegroup,
      vgHash,
      refUrl: args.refUrl,
      refKind,
      usedSlots: used,
      usedChannels: usedCh,
      kind: args.kind,
      referenceSoundfont: args.kind === 'gm' ? args.referenceSoundfont : null,
    };
    // Reset mutes when switching songs and unmute on the synth (the previous
    // song may have left some channels muted on this synth instance).
    if (synth) for (const ch of mutedChannels) synth.muteChannel(ch, false);
    mutedChannels = new Set();
    mutedSlots = new Set();
    overrides = loadOverrides(vgHash);
    warnings = vg.warnings.slice();
    // Actually pause the seq before swapping the song. Without this,
    // setting isPlaying=false alone doesn't tell loadIntoSequencer to
    // pause (it captures wasPlaying from the just-flipped flag), so
    // loadNewSongList replaces the song while the playhead is still
    // running and the new fixture auto-plays. pauseLatch suppresses any
    // in-flight auto-resume from a concurrent soundfont swap.
    seq?.pause();
    isPlaying = false;
    pauseLatch = true;
    currentTime = 0;
    duration = 0;
    seqLoadedFor = null;
    // If the engine is already running (because the user has played at
    // least once and is just switching fixtures), reload immediately so
    // the new song is ready to play. Otherwise defer to the first Play
    // click, when we'll have a real user gesture to resume the
    // AudioContext — loading a song while the context is suspended makes
    // the worklet treat it as already-ended and Play silently no-ops.
    if (engineState === 'ready' && ctx?.state === 'running') {
      await loadIntoSequencer();
    }
  }

  async function play(): Promise<void> {
    if (!loaded) return;
    // Lazy engine init on first user gesture. Creating the AudioContext
    // before a click leaves it suspended, and any song loaded into the
    // sequencer while suspended is treated as already-ended — so the
    // first Play would blink to Pause and back to Play with no audio.
    if (engineState !== 'ready') await initEngine();
    if (!ctx || !seq) return;
    if (ctx.state === 'suspended') await ctx.resume();
    pauseLatch = false;
    if (seqLoadedFor !== loaded.songId) await loadIntoSequencer();
    seq.play();
    isPlaying = true;
  }
  function pause(): void {
    seq?.pause();
    isPlaying = false;
    pauseLatch = true;
  }
  function togglePlay(): void {
    if (isPlaying) pause();
    else void play();
  }
  function seek(t: number): void {
    if (!seq) return;
    seq.currentTime = t;
    currentTime = t;
  }

  async function toggleSlotMute(slot: number): Promise<void> {
    const next = new Set(mutedSlots);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    mutedSlots = next;
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  async function isolateSlot(slot: number): Promise<void> {
    if (!loaded) return;
    const allOthersMuted =
      mutedSlots.size === loaded.usedSlots.size - 1 && [...loaded.usedSlots].every((s) => s === slot || mutedSlots.has(s));
    if (allOthersMuted) {
      // Toggle off: this slot was already isolated → unmute everything.
      mutedSlots = new Set();
    } else {
      const next = new Set<number>(loaded.usedSlots);
      next.delete(slot);
      mutedSlots = next;
    }
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  async function muteAllSlots(mute: boolean): Promise<void> {
    if (!loaded) return;
    mutedSlots = mute ? new Set(loaded.usedSlots) : new Set();
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  function toggleChannelMute(ch: number): void {
    if (!synth) return;
    const next = new Set(mutedChannels);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    mutedChannels = next;
    synth.muteChannel(ch, next.has(ch));
  }

  async function setOverride(slot: number, choice: MappingChoice | null): Promise<void> {
    if (!loaded) return;
    saveOverride(loaded.vgHash, slot, choice);
    overrides = loadOverrides(loaded.vgHash);
    const t = seq?.currentTime ?? 0;
    await loadIntoSequencer(t);
  }

  $effect(() => {
    if (!isPlaying) return;
    const tick = (): void => {
      if (seq) currentTime = seq.currentHighResolutionTime;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  onMount(() => {
    // Auto-load on first visit. Honour ?song=<id> if present, fall back
    // to the first fixture so the page is never empty for new visitors.
    const requested = page.url.searchParams.get('song');
    const target = data.fixtures.find((f) => f.id === requested) ?? data.fixtures[0];
    if (target) void loadFixture(target);
    return () => {
      cancelAnimationFrame(rafId);
      seq?.pause();
      void ctx?.close();
      seq = null;
      synth = null;
      ctx = null;
    };
  });

  // ── Drag-and-drop ─────────────────────────────────────────────────────
  let dragOver = $state(false);
  async function onDrop(ev: DragEvent): Promise<void> {
    ev.preventDefault();
    dragOver = false;
    const files = ev.dataTransfer?.files;
    if (!files) return;
    let midi: File | null = null;
    let inc: File | null = null;
    let mp3: File | null = null;
    for (const f of Array.from(files)) {
      const n = f.name.toLowerCase();
      if (n.endsWith('.mid') || n.endsWith('.midi')) midi = f;
      else if (n.endsWith('.inc')) inc = f;
      else if (n.endsWith('.mp3')) mp3 = f;
    }
    if (!midi || !inc) {
      warnings = ['drop must include both a .mid and a matching .inc voicegroup'];
      return;
    }
    const [midiBytes, incText] = await Promise.all([midi.arrayBuffer(), inc.text()]);
    const url = mp3 ? URL.createObjectURL(mp3) : null;
    await ingest({
      id: midi.name.replace(/\.[^.]+$/, ''),
      label: midi.name,
      kind: 'sappy',
      midiBytes,
      incText,
      refUrl: url,
    });
  }

  function fmtTime(t: number): string {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Mapping table rows: only slots referenced by the loaded MIDI.
  type Row = { slot: number; entry: VoiceEntry; current: MappingChoice; auto: MappingChoice };
  const rows = $derived<Row[]>(
    loaded
      ? [...loaded.usedSlots]
          .sort((a, b) => a - b)
          .map((slot) => {
            const entry = (loaded as Loaded).voicegroup.entries[slot];
            const auto = autoMap(entry, slot, presets);
            const current = overrides[slot] ?? auto;
            return { slot, entry, current, auto };
          })
      : [],
  );

  function entryLabel(e: VoiceEntry): string {
    switch (e.kind) {
      case 'directsound':
      case 'directsound_no_resample':
        return `${e.kind} ${e.sampleName}`;
      case 'wave':
      case 'wave_alt':
        return `${e.kind} ${e.dataName}`;
      case 'keysplit':
        return `keysplit ${e.subgroupName} / ${e.tableName}`;
      case 'keysplit_all':
        return `keysplit_all ${e.subgroupName}`;
      case 'unknown':
        return `unknown ${e.raw}`;
      default:
        return e.kind;
    }
  }

  function presetKey(p: { bankMSB: number; program: number }): string {
    return `${p.bankMSB}:${p.program}`;
  }

  function onSelect(slot: number, key: string): void {
    if (key === 'auto') {
      void setOverride(slot, null);
      return;
    }
    const [bStr, pStr] = key.split(':');
    const b = Number.parseInt(bStr, 10);
    const p = Number.parseInt(pStr, 10);
    const hit = presets.find((q) => q.bankMSB === b && q.program === p);
    if (!hit) return;
    void setOverride(slot, {
      bankMSB: hit.bankMSB,
      program: hit.program,
      label: `${hit.bankMSB}:${hit.program} ${hit.name}`,
      reason: 'manual override',
    });
  }
</script>

<svelte:head>
  <title>MIDI lab · HexHive</title>
  <link rel="preconnect" href="https://cdn.hexhive.app" crossorigin="anonymous" />
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-8 space-y-6">
  <header class="space-y-2">
    <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-display">
      <FlaskConical class="size-4" /> beta
    </div>
    <h1 class="text-2xl md:text-3xl font-display">MIDI lab</h1>
    <p class="text-sm text-muted-foreground max-w-2xl">
      Test how a Pokémon GBA MIDI sounds when its program-changes are remapped to the right VGK SF2 presets via its
      voicegroup <code class="text-xs">.inc</code>. A/B against the vanilla recording. Override any slot live.
    </p>
  </header>

  <!-- ── FIXTURE RACK ──────────────────────────────────────────────────
       Same hierarchy pattern as the bank rack: neutral tabs to pick a
       source family, cards inside to pick a specific song. Active fixture
       gets a subtle ring; the tab containing it shows a small white pip. -->
  <div class="space-y-3">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <div class="flex items-baseline gap-3">
        <span class="text-xs uppercase tracking-[0.25em] text-foreground font-display">Fixtures</span>
        {#if loaded}
          <span class="text-xs text-muted-foreground">
            loaded: <span class="font-mono text-foreground">{loaded.label}</span>
          </span>
        {/if}
      </div>
    </div>

    <div role="tablist" aria-label="Fixture sources" class="flex flex-wrap gap-1 border-b border-border/60">
      {#each FIXTURE_TABS as t (t.id)}
        {@const count = data.fixtures.filter((f) => f.kind === t.kind).length}
        {@const containsActive = loaded?.kind === t.kind}
        <button
          role="tab"
          type="button"
          aria-selected={activeFixtureTab === t.id}
          onclick={() => {
            activeFixtureTab = t.id;
          }}
          class="relative -mb-px flex items-center gap-2 px-3 py-2 text-sm transition-colors
            {activeFixtureTab === t.id
              ? 'border-b-2 border-foreground text-foreground'
              : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'}"
        >
          <span class="font-display text-[0.65rem] tracking-[0.2em]">{t.label}</span>
          <span class="text-xs text-muted-foreground/80 font-mono hidden md:inline">{t.sub}</span>
          <span
            class="rounded-full px-1.5 py-0.5 font-mono text-[0.6rem] tabular-nums
              {activeFixtureTab === t.id ? 'bg-foreground/10 text-foreground' : 'bg-muted/40 text-muted-foreground'}"
          >
            {count}
          </span>
          {#if containsActive}
            <span aria-hidden="true" class="size-1.5 rounded-full bg-zinc-200 shadow-[0_0_5px_1px_rgba(228,228,231,0.6)]"></span>
          {/if}
        </button>
      {/each}
    </div>

    <div
      role="tabpanel"
      aria-label="{FIXTURE_TABS.find((t) => t.id === activeFixtureTab)?.label} fixtures"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
    >
      {#each data.fixtures.filter((f) => f.kind === FIXTURE_TABS.find((t) => t.id === activeFixtureTab)?.kind) as f (f.id)}
        {@const isActive = loaded?.songId === f.id}
        {@const refKind = f.refUrl?.endsWith('.ogg') ? 'OGG' : 'MP3'}
        <button
          type="button"
          onclick={() => void loadFixture(f)}
          aria-pressed={isActive}
          class="group relative overflow-hidden rounded-md border bg-slate-950/70 p-3 text-left transition-all
            {isActive
              ? 'border-zinc-300/70 shadow-[0_0_0_1px_rgba(228,228,231,0.25),0_0_18px_-6px_rgba(228,228,231,0.5)]'
              : 'border-border/70 hover:border-foreground/40 hover:bg-slate-900/70'}"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 text-foreground">
                <Music class="size-3.5 shrink-0 text-muted-foreground" />
                <span class="truncate text-sm font-medium">{f.label}</span>
              </div>
              <div class="mt-1 font-mono text-[0.65rem] tracking-wide text-muted-foreground truncate">
                {f.game}
              </div>
            </div>
            <span
              class="shrink-0 rounded-sm border border-amber-500/40 bg-amber-500/5 px-1.5 py-0.5 font-display text-[0.55rem] tracking-[0.2em] text-amber-300"
              title="{refKind} reference recording"
            >
              {refKind}
            </span>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- ── BANK RACK ─────────────────────────────────────────────────────
       Two-tier hierarchy: era tabs at top group banks by hardware family,
       cards below show full title/games/byline at readable sizes. LED on
       each card signals parse state — emerald glow = active, amber pulse
       = worklet still parsing, era-coloured dot = ready, dim = not loaded
       yet. The header summarises what's currently driving the synth. -->
  <div class="space-y-3">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <div class="flex items-baseline gap-3">
        <span class="text-xs uppercase tracking-[0.25em] text-foreground font-display">
          Bank rack
        </span>
        <span class="text-xs text-muted-foreground">
          active:
          <span class="font-mono text-foreground">{soundfont.title}</span>
          <span class="font-display text-[0.6rem] tracking-[0.2em] {TONE_TEXT[soundfont.tone]} ml-1">
            {ERA_LABEL[soundfont.era]}
          </span>
        </span>
      </div>
      {#if swappingTo}
        {@const target = SOUNDFONTS.find((s) => s.id === swappingTo)}
        <span class="font-mono text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 class="size-3.5 animate-spin text-zinc-300" />
          <span>loading <span class="text-foreground">{target?.title ?? swappingTo}</span>…</span>
        </span>
      {/if}
    </div>

    <!-- tab strip — neutral chrome; the only colour is the small pip showing
         which group contains the currently-active bank (uses that bank's
         tone so you can scan back to it from anywhere). -->
    <div role="tablist" aria-label="Soundfont families" class="flex flex-wrap gap-1 border-b border-border/60">
      {#each GROUPS as g (g.id)}
        {@const count = SOUNDFONTS.filter((sf) => g.eras.includes(sf.era)).length}
        {@const containsActive = g.eras.includes(soundfont.era)}
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === g.id}
          onclick={() => {
            activeTab = g.id;
          }}
          class="relative -mb-px flex items-center gap-2 px-3 py-2 text-sm transition-colors
            {activeTab === g.id
              ? 'border-b-2 border-foreground text-foreground'
              : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'}"
        >
          <span class="font-display text-[0.65rem] tracking-[0.2em]">{g.label}</span>
          <span class="text-xs text-muted-foreground/80 font-mono hidden md:inline">{g.sub}</span>
          <span
            class="rounded-full px-1.5 py-0.5 font-mono text-[0.6rem] tabular-nums
              {activeTab === g.id ? 'bg-foreground/10 text-foreground' : 'bg-muted/40 text-muted-foreground'}"
          >
            {count}
          </span>
          {#if containsActive}
            <span aria-hidden="true" class="size-1.5 rounded-full {TONE_LED_READY[soundfont.tone]}"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- chip grid (current tab only) -->
    <div
      role="tabpanel"
      aria-label="{GROUPS.find((g) => g.id === activeTab)?.label} soundfonts"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      {#each SOUNDFONTS.filter((sf) => GROUPS.find((g) => g.id === activeTab)?.eras.includes(sf.era)) as sf (sf.id)}
        {@const isSelected = soundfont.id === sf.id}
        {@const isLive = activeBankId === sf.id}
        {@const isLoading = swappingTo === sf.id || (isSelected && !isLive)}
        <button
          type="button"
          onclick={() => {
            soundfont = sf;
          }}
          aria-pressed={isSelected}
          aria-label="{sf.label}{sf.context ? ` — ${sf.context}` : ''}"
          class="group relative overflow-hidden rounded-md border bg-slate-950/70 p-4 text-left transition-all
            {isSelected
              ? TONE_RING[sf.tone]
              : 'border-border/70 hover:border-foreground/40 hover:bg-slate-900/70'}"
        >
          <!-- tone stripe -->
          <span aria-hidden="true" class="absolute inset-x-0 top-0 h-[3px] {TONE_STRIPE[sf.tone]}"></span>

          <!-- circuit-grid texture -->
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:8px_8px]"
          ></span>

          <!-- LED — live (currently driving the synth) = tone glow,
               loading (selected but not yet swapped in) = white pulse,
               otherwise dim. -->
          <span aria-hidden="true" class="absolute top-2.5 right-2.5 flex size-3 items-center justify-center">
            {#if isLive && !isLoading}
              <span class="size-2.5 rounded-full {TONE_LED_ACTIVE[sf.tone]} animate-pulse"></span>
            {:else if isLoading}
              <span class="size-2.5 rounded-full bg-zinc-300 shadow-[0_0_8px_2px_rgba(228,228,231,0.7)] animate-pulse"></span>
            {:else}
              <span class="size-2 rounded-full bg-slate-700"></span>
            {/if}
          </span>

          <!-- era tag + platform -->
          <div class="relative mb-2 flex items-center gap-2">
            <span class="font-display text-[0.6rem] tracking-[0.25em] {TONE_TEXT[sf.tone]}">
              {ERA_LABEL[sf.era]}
            </span>
            <span class="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-mono">
              · {sf.platform}
            </span>
          </div>

          <!-- title -->
          <div class="relative pr-5 text-base font-medium leading-snug text-foreground">
            {sf.title}
          </div>

          <!-- byline -->
          <div class="relative mt-0.5 font-mono text-xs text-muted-foreground truncate">
            {sf.byline}
          </div>

          <!-- engine context (Pokémon Essentials etc.) -->
          {#if sf.context}
            <div
              class="relative mt-2 inline-flex items-center gap-1 rounded-sm border border-fuchsia-500/50 bg-fuchsia-500/10 px-1.5 py-0.5 font-mono text-[0.7rem] text-fuchsia-200"
            >
              <span aria-hidden="true">⌬</span>
              {sf.context}
            </div>
          {/if}

          <!-- game pills -->
          {#if sf.games.length > 0}
            <div class="relative mt-2 flex flex-wrap gap-1">
              {#each sf.games as game}
                <span
                  class="rounded-sm border border-border/60 bg-slate-900/70 px-1.5 py-0.5 font-mono text-[0.7rem] tabular-nums text-foreground/80"
                >
                  {game}
                </span>
              {/each}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div
    class="border border-dashed rounded-lg p-6 text-sm text-muted-foreground opacity-40 cursor-not-allowed select-none"
    aria-label="Custom file drop (coming soon)"
  >
    <div class="flex items-center gap-3">
      <Upload class="size-5" />
      <div>
        Drop a <code>.mid</code> and matching voicegroup <code>.inc</code> here (optional reference <code>.mp3</code>).
        <span class="ml-1 italic">(coming soon)</span>
      </div>
    </div>
  </div>

  {#if warnings.length > 0}
    <div class="border border-amber-500/40 bg-amber-500/5 rounded-md p-3 text-xs">
      <div class="font-medium mb-1 text-amber-300">Parser warnings</div>
      <ul class="list-disc pl-5 space-y-0.5">
        {#each warnings as w}<li>{w}</li>{/each}
      </ul>
    </div>
  {/if}

  {#if loaded}
    <section class="border rounded-lg p-4 space-y-4">
      <div>
        <div class="text-sm text-muted-foreground">Now loaded</div>
        <div class="font-medium">{loaded.label}</div>
        <div class="text-xs text-muted-foreground font-mono">
          {#if loaded.kind === 'sappy'}
            voicegroup: {loaded.voicegroup.name} · {loaded.usedSlots.size} slots used · vgHash {loaded.vgHash}
          {:else}
            GM mode · no voicegroup remap · reference rendered through
            <span class="text-foreground">{SOUNDFONTS.find((s) => s.id === loaded?.referenceSoundfont)?.label ?? loaded.referenceSoundfont}</span>
          {/if}
        </div>
      </div>

      <!-- ── SYNTH PANEL ─────────────────────────────────────────── -->
      <div
        class="relative rounded-md border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-slate-950/70 to-slate-950/40 p-4 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.06)]"
      >
        <!-- circuit grid overlay -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-md opacity-[0.07] [background-image:linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] [background-size:8px_8px]"
        ></div>
        <!-- viewfinder corner brackets -->
        <span aria-hidden="true" class="absolute size-2 border-emerald-400/60 top-1.5 left-1.5 border-l border-t"></span>
        <span aria-hidden="true" class="absolute size-2 border-emerald-400/60 top-1.5 right-1.5 border-r border-t"></span>
        <span
          aria-hidden="true"
          class="absolute size-2 border-emerald-400/60 bottom-1.5 left-1.5 border-l border-b"
        ></span>
        <span
          aria-hidden="true"
          class="absolute size-2 border-emerald-400/60 bottom-1.5 right-1.5 border-r border-b"
        ></span>

        <!-- header chip -->
        <div class="relative mb-2 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span
              aria-hidden="true"
              class="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.65)] animate-pulse"
            ></span>
            <span class="font-display text-[0.6rem] tracking-[0.25em] text-emerald-300">
              <span class="sr-only">Synth (remapped MIDI)</span>
              <span aria-hidden="true">[ LIVE · MIDI ]</span>
            </span>
          </div>
          <span class="font-display text-[0.5rem] tracking-[0.3em] text-emerald-500/60">
            vg:{loaded.voicegroup.name}
          </span>
        </div>

        <!-- transport -->
        <div class="relative flex items-center gap-3">
          <Button
            onclick={togglePlay}
            disabled={engineState === 'loading' || engineState === 'error' || !loaded}
            size="sm"
            variant="outline"
            class="border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10"
          >
            {#if engineState === 'loading'}
              <Loader2 class="size-4 animate-spin" /> loading…
            {:else if isPlaying}
              <Pause class="size-4" /> Pause
            {:else}
              <Play class="size-4" /> Play
            {/if}
          </Button>
          <span
            class="font-display text-[0.6rem] tabular-nums tracking-wider text-white rounded bg-emerald-950/70 border border-emerald-500/30 px-2 py-1 shadow-[inset_0_0_6px_rgba(16,185,129,0.25)] min-w-[3.25rem] text-center"
          >
            {fmtTime(currentTime)}
          </span>
          <input
            type="range"
            class="flex-1 accent-emerald-400"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            oninput={(e) => seek(Number.parseFloat((e.currentTarget as HTMLInputElement).value))}
            disabled={engineState !== 'ready'}
            aria-label="Synth MIDI scrub"
          />
          <span
            class="font-display text-[0.6rem] tabular-nums tracking-wider text-white/80 rounded bg-emerald-950/70 border border-emerald-500/30 px-2 py-1 shadow-[inset_0_0_6px_rgba(16,185,129,0.2)] min-w-[3.25rem] text-center"
          >
            {fmtTime(duration)}
          </span>
          <button
            type="button"
            onclick={toggleLoop}
            class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] flex items-center gap-1 {loopOn
              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
              : 'border-border hover:border-foreground/40'}"
            aria-pressed={loopOn}
            title="Loop"
          >
            <Repeat class="size-3" /> loop
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">Channel mutes</div>
        <div class="flex flex-wrap gap-1.5">
          {#each [...loaded.usedChannels].sort((a, b) => a - b) as ch}
            <button
              type="button"
              onclick={() => toggleChannelMute(ch)}
              disabled={engineState !== 'ready'}
              class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] tabular-nums {mutedChannels.has(ch)
                ? 'bg-destructive/20 border-destructive/60 text-destructive line-through'
                : 'border-border hover:border-foreground/40'}"
              aria-pressed={mutedChannels.has(ch)}
              title="Channel {ch + 1} {mutedChannels.has(ch) ? '(muted)' : ''}"
            >
              ch{ch + 1}
            </button>
          {/each}
        </div>
      </div>

      <!-- ── TAPE PANEL ──────────────────────────────────────────── -->
      {#if loaded.refUrl}
        <div
          class="relative rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-stone-950/60 to-stone-950/40 p-4 shadow-[inset_0_1px_0_rgba(245,158,11,0.15)]"
        >
          <!-- magnetic tape striations -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.08] [background-image:repeating-linear-gradient(0deg,#f59e0b_0_1px,transparent_1px_4px)]"
          ></div>

          <!-- header chip -->
          <div class="relative mb-3 flex items-center justify-between gap-3">
            <span class="font-display text-[0.6rem] tracking-[0.25em] text-amber-300">
              <span class="sr-only">Reference recording ({loaded.refKind === 'ogg' ? 'GMGSx OGG render' : 'vanilla MP3'})</span>
              <span aria-hidden="true">▷ FINAL · {loaded.refKind === 'ogg' ? 'OGG' : 'MP3'} ◁</span>
            </span>
            <span
              class="font-display text-[0.5rem] tracking-[0.3em] text-amber-600/70 rounded border border-amber-500/30 px-1.5 py-0.5"
            >
              {loaded.kind === 'gm' ? 'gm render' : 'side a'}
            </span>
          </div>

          <!-- transport: audio · reel · loop -->
          <div class="relative flex items-center gap-3">
            {#key loaded.songId}
              <audio
                bind:this={mp3El}
                controls
                preload="none"
                class="flex-1 sepia-[0.25] saturate-[0.85] contrast-[0.95]"
                loop={loopOn}
              >
                <source src={loaded.refUrl} />
                <track kind="captions" />
              </audio>
            {/key}
            <svg
              viewBox="0 0 24 24"
              class="size-8 shrink-0 text-amber-400/80 animate-[spin_8s_linear_infinite_reverse]"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="0.6" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.7" />
              <g stroke="currentColor" stroke-width="0.5" opacity="0.7">
                <line x1="12" y1="3" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="21" />
                <line x1="3" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="21" y2="12" />
                <line x1="5.5" y1="5.5" x2="7.5" y2="7.5" />
                <line x1="16.5" y1="16.5" x2="18.5" y2="18.5" />
                <line x1="18.5" y1="5.5" x2="16.5" y2="7.5" />
                <line x1="7.5" y1="16.5" x2="5.5" y2="18.5" />
              </g>
            </svg>
            <button
              type="button"
              onclick={toggleLoop}
              class="font-mono text-xs px-2 py-1 rounded border min-w-[2.5rem] flex items-center gap-1 {loopOn
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
                : 'border-border hover:border-foreground/40'}"
              aria-pressed={loopOn}
              title="Loop"
            >
              <Repeat class="size-3" /> loop
            </button>
          </div>
        </div>
      {/if}
    </section>

    {#if loaded.kind === 'sappy'}
    <section class="border rounded-lg overflow-hidden">
      <header class="px-4 py-2 border-b flex items-center justify-between gap-3">
        <div class="text-xs uppercase tracking-wider text-muted-foreground">
          Voicegroup → SF2 mapping ({rows.length} slots)
        </div>
        <button
          type="button"
          onclick={() => void muteAllSlots(mutedSlots.size < (loaded?.usedSlots.size ?? 0))}
          disabled={engineState !== 'ready'}
          class="font-mono text-xs px-2 py-1 rounded border hover:border-foreground/40"
        >
          {mutedSlots.size > 0 && loaded && mutedSlots.size >= loaded.usedSlots.size ? 'unmute all' : 'mute all'}
        </button>
      </header>
      {#if presets.length === 0}
        <div class="p-4 text-sm text-muted-foreground">Loading SF2 preset list…</div>
      {:else}
        <ul class="divide-y">
          {#each rows as row (row.slot)}
            <li class="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span class="font-mono text-xs w-10 text-muted-foreground tabular-nums">#{row.slot}</span>
              <span class="font-mono text-xs flex-1 min-w-[16rem] truncate" title={entryLabel(row.entry)}>
                {entryLabel(row.entry)}
              </span>
              {#if overrides[row.slot]}
                <Button variant="ghost" size="sm" onclick={() => void setOverride(row.slot, null)}>
                  <RefreshCw class="size-3" /> auto
                </Button>
              {/if}
              <select
                class="bg-background border rounded px-2 py-1 text-xs font-mono min-w-[14rem]"
                value={overrides[row.slot] ? presetKey(overrides[row.slot]) : 'auto'}
                onchange={(e) => onSelect(row.slot, (e.currentTarget as HTMLSelectElement).value)}
              >
                <option value="auto">auto · {row.auto.label}</option>
                {#each presets as p}
                  <option value={presetKey(p)}>
                    {p.bankMSB}:{p.program} · {p.name}{p.isAnyDrums ? ' (drum)' : ''}
                  </option>
                {/each}
              </select>
              <button
                type="button"
                onclick={() => void toggleSlotMute(row.slot)}
                disabled={engineState !== 'ready'}
                class="font-mono text-xs px-2 py-1 rounded border min-w-[3rem] {mutedSlots.has(row.slot)
                  ? 'bg-destructive/20 border-destructive/60 text-destructive line-through'
                  : 'border-border hover:border-foreground/40'}"
                aria-pressed={mutedSlots.has(row.slot)}
                title={mutedSlots.has(row.slot) ? 'Unmute slot' : 'Mute slot'}
              >
                {mutedSlots.has(row.slot) ? 'muted' : 'mute'}
              </button>
              <button
                type="button"
                onclick={() => void isolateSlot(row.slot)}
                disabled={engineState !== 'ready'}
                class="font-mono text-xs px-2 py-1 rounded border min-w-[3.5rem] {!mutedSlots.has(row.slot) &&
                mutedSlots.size > 0 &&
                loaded &&
                mutedSlots.size === loaded.usedSlots.size - 1
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-border hover:border-foreground/40'}"
                title="Solo this slot (mute everything else)"
              >
                solo
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
    {/if}
  {:else}
    <div class="text-sm text-muted-foreground">
      Pick a fixture above or drop your own files to start. The synth uses the FRLG VGK SF2 self-hosted on
      <code>cdn.hexhive.app</code>.
    </div>
  {/if}
</section>

import type { PageServerLoad } from './$types';

// Two flavours of fixture:
//   - 'sappy' = GBA-engine MIDI; carries a voicegroup .inc that the lab uses
//     to remap each program-change. Reference recording is an mp3 ripped from
//     the game.
//   - 'gm'    = General MIDI file; no voicegroup. Played through whichever
//     soundfont is selected from the dropdown. Reference recording is an
//     ogg that was rendered through a known soundfont (recorded as
//     `referenceSoundfont` so the user knows what they're A/B-ing against).
export type FixtureKind = 'sappy' | 'gm';

interface BaseFixture {
  id: string;
  label: string;
  game: string;
  kind: FixtureKind;
  midiUrl: string;
  refUrl: string; // mp3 or ogg
}

export interface SappyFixture extends BaseFixture {
  kind: 'sappy';
  voicegroupUrl: string;
  asmUrl: string;
  // Soundfont id that best matches the game the MIDI was ripped from.
  // Selected automatically when the fixture is loaded.
  preferredSoundfont: string;
}

export interface GmFixture extends BaseFixture {
  kind: 'gm';
  // Source soundfont the reference render was made through. Surfaced in the
  // UI so the user knows the OGG is only a faithful baseline if that bank is
  // the current dropdown selection.
  referenceSoundfont: string;
}

export type Fixture = SappyFixture | GmFixture;

const FIXTURES: Fixture[] = [
  {
    id: 'pallet',
    label: 'Pallet Town',
    game: 'FireRed',
    kind: 'sappy',
    midiUrl: '/midi-lab/fixtures/pallet/mus_pallet.mid',
    voicegroupUrl: '/midi-lab/fixtures/pallet/voicegroup159.inc',
    refUrl: '/midi-lab/fixtures/pallet/mus_pallet.mp3',
    asmUrl: '/midi-lab/fixtures/pallet/mus_pallet.s',
    preferredSoundfont: 'vgk-frlg',
  },
  {
    id: 'littleroot',
    label: 'Littleroot Town',
    // Per fireglow03 (Discord DM): all three .mid/.s/.mp3 fixture sets were
    // ripped from Pokémon FireRed, not Emerald. Emerald carries the full
    // FRLG soundtrack in its ROM data so any "this is in Emerald" assumption
    // misled the prior labelling.
    game: 'FireRed',
    kind: 'sappy',
    midiUrl: '/midi-lab/fixtures/littleroot/mus_littleroot.mid',
    voicegroupUrl: '/midi-lab/fixtures/littleroot/littleroot.inc',
    refUrl: '/midi-lab/fixtures/littleroot/mus_littleroot.mp3',
    asmUrl: '/midi-lab/fixtures/littleroot/mus_littleroot.s',
    preferredSoundfont: 'vgk-frlg',
  },
  {
    id: 'b_dome_lobby',
    label: 'Battle Dome Lobby',
    game: 'FireRed',
    kind: 'sappy',
    midiUrl: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.mid',
    voicegroupUrl: '/midi-lab/fixtures/b_dome_lobby/b_dome.inc',
    refUrl: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.mp3',
    asmUrl: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.s',
    preferredSoundfont: 'vgk-frlg',
  },
  // GM-mode fixtures from zeak6464/Fire-Red (Pokémon Essentials project).
  // The .ogg files were rendered by mkxp+fluidsynth through GMGSx — the
  // bundled "Pokémon Essentials / GMGSx" soundfont — so the reference is
  // only faithful when that soundfont is the active selection.
  {
    id: 'zeak-title',
    label: 'Title (zeak6464/Fire-Red)',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/title/title.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/title/title.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
  {
    id: 'zeak-battle-trainer',
    label: 'Battle (Trainer) — zeak',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/battle-trainer/battle-trainer.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/battle-trainer/battle-trainer.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
  {
    id: 'zeak-battle-wild',
    label: 'Battle (Wild) — zeak',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/battle-wild/battle-wild.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/battle-wild/battle-wild.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
  {
    id: 'zeak-bicycle',
    label: 'Bicycle — zeak',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/bicycle/bicycle.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/bicycle/bicycle.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
  {
    id: 'zeak-surfing',
    label: 'Surfing — zeak',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/surfing/surfing.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/surfing/surfing.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
  {
    id: 'zeak-hall-of-fame',
    label: 'Hall of Fame — zeak',
    game: 'Pokémon Essentials',
    kind: 'gm',
    midiUrl: '/midi-lab/fixtures/zeak-fire-red/hall-of-fame/hall-of-fame.mid',
    refUrl: '/midi-lab/fixtures/zeak-fire-red/hall-of-fame/hall-of-fame.ogg',
    referenceSoundfont: 'gmgsx-zeak',
  },
];

export const load: PageServerLoad = () => ({ fixtures: FIXTURES });

import type { PageServerLoad } from './$types';

// Vanilla FRLG/RSE fixtures bundled under static/midi-lab/fixtures so the
// lab opens with known-good inputs. Each fixture pairs a .mid + voicegroup
// .inc + reference .mp3 (and the original .s file as informational).
export interface Fixture {
  id: string;
  label: string;
  game: string;
  midiUrl: string;
  voicegroupUrl: string;
  mp3Url: string;
  asmUrl: string;
}

const FIXTURES: Fixture[] = [
  {
    id: 'pallet',
    label: 'Pallet Town',
    game: 'FireRed',
    midiUrl: '/midi-lab/fixtures/pallet/mus_pallet.mid',
    voicegroupUrl: '/midi-lab/fixtures/pallet/voicegroup159.inc',
    mp3Url: '/midi-lab/fixtures/pallet/mus_pallet.mp3',
    asmUrl: '/midi-lab/fixtures/pallet/mus_pallet.s',
  },
  {
    id: 'littleroot',
    label: 'Littleroot Town',
    game: 'Ruby/Sapphire/Emerald',
    midiUrl: '/midi-lab/fixtures/littleroot/mus_littleroot.mid',
    voicegroupUrl: '/midi-lab/fixtures/littleroot/littleroot.inc',
    mp3Url: '/midi-lab/fixtures/littleroot/mus_littleroot.mp3',
    asmUrl: '/midi-lab/fixtures/littleroot/mus_littleroot.s',
  },
  {
    id: 'b_dome_lobby',
    label: 'Battle Dome Lobby',
    game: 'Emerald',
    midiUrl: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.mid',
    voicegroupUrl: '/midi-lab/fixtures/b_dome_lobby/b_dome.inc',
    mp3Url: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.mp3',
    asmUrl: '/midi-lab/fixtures/b_dome_lobby/mus_b_dome_lobby.s',
  },
];

export const load: PageServerLoad = () => ({ fixtures: FIXTURES });

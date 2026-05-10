# MIDI corpus sources

Companion to [`soundfonts.md`](./soundfonts.md) and [`soundfont-sources.md`](./soundfont-sources.md). Where soundfonts are the sample banks, this file catalogues the **MIDI corpora** we draw from for fixtures + demos in `/sounds/midi-lab` and the production `/sounds/[slug]` page.

## fireglow03 (Discord DMs) — the Sappy fixture trio

The `pallet`, `littleroot`, and `b_dome_lobby` fixtures wired into `/sounds/midi-lab` (Pallet Town, Littleroot Town, Battle Dome Lobby) — each a `.mid` + `.s` + voicegroup `.inc` + reference `.mp3` set — came from **fireglow03** via Discord DM. **All three were ripped from Pokémon FireRed**, not Emerald.

This matters because Emerald carries the FRLG soundtrack inside its ROM data (the audio engine indexes into both song tables), so the same songs exist in both games but the rip used here is the FireRed version. Per fireglow:

> _"I should note that all the Pallet Town files I sent are from FireRed, not Emerald. I felt I should specify since Emerald has all the FRLG songs in its data."_

So the lab's preferred soundfont for all three is **`vgk-frlg`** (musical-artifacts #8297, the dedicated FRLG bank), not the Emerald banks. The `game:` field in the fixture manifest is `FireRed` for all three.

## Nintendo MIDI Music (lequietriot) — `audio-pack-nmm-lequietriot`

The HexHive listing `audio-pack-nmm-lequietriot` (visible at https://hexhive.app/sounds/audio-pack-nmm-lequietriot) is sourced from this channel/community. **NMM = Nintendo MIDI Music**.

- **YouTube channel**: https://www.youtube.com/@NintendoMIDIMusic
- **Discord**: https://discord.gg/7nk3P7bkQN
- **Author handle**: lequietriot (also the name on the MIDI Sources Repo).
- **Asset-repo path that points at this corpus**: https://github.com/TeamAquasHideout/Team-Aquas-Asset-Repo/tree/main/Audio/nmm-lequietriot — the README we were directed to from the original Discord conversation.
- **Main Archive (Google Drive)**: https://drive.google.com/drive/folders/1pbxhON0F9o6TqF4xdtLps0fiOucYYD4d
- **PokeRainbow (live-build Drive)**: https://drive.google.com/drive/folders/1N22jY4vjtcOjBbsEF9A3eecHliujjV64
- **PokeRainbow (GitHub)**: https://github.com/lequietriot/pokerainbow/tree/rainbow — open-source FireRed decomp/romhack, lequietriot's "final personal lifetime project".

### Channel description (verbatim, captured 2026-05-09)

> Welcome to Nintendo MIDI Music!
>
> Currently focusing on an open-source Pokémon FireRed decomp/romhack final personal lifetime project, which adds a massive amount of content to the game. It is a 'final' focus in the context that I do not know how much time we have left to live our lives. Enjoy!
>
> LEGACY NOTICE:
> This channel previously had a main focus on offering various songs from Nintendo games in MIDI format, experimenting with different soundfonts. MIDI files are adjusted so that they follow the General MIDI format instead of using the custom soundbanks.
>
> Songs are looped at least once. If you use these open source MIDI and SoundFont 2 files, please feel free to give credit or link back to this channel!

### Important nuance for the lab

> _"MIDI files are adjusted so that they follow the **General MIDI format** instead of using the custom soundbanks."_

That means the NMM-released MIDIs are **not** Sappy-engine voicegroup-driven — they expect a GM/GS soundfont (like GeneralUser GS or our own VGK/Mills banks). Don't apply the voicegroup remapper to them; they'll already sound right with a GM bank loaded. Compare with the FRLG/RSE rips from Exabyte U (musical-artifacts #1150, #1151), which **are** Sappy-engine raw and need the remapper.

## zeak6464/Fire-Red — Pokémon Essentials project + GMGSx + paired previews

- **GitHub**: https://github.com/zeak6464/Fire-Red
- **Project type**: Pokémon Essentials v21 fan-game (RPG Maker XP / mkxp), not a binary romhack and not a decomp. ~32k files, 897 MB. Plays MIDI via fluidsynth + a bundled soundfont.
- **`mkxp.json` declares**: `"midiSoundFont": "soundfont.sf2"` — every `.ogg` rendered for the project's MIDIs went through this exact bank.
- **Pinned soundfont path**: https://github.com/zeak6464/Fire-Red/blob/main/soundfont.sf2 — saved locally as `~/Downloads/soundfont.sf2`. Byte-identical to the in-repo `soundfont.sf2`.
- **Soundfont identity** (RIFF INFO): bank name `GMGSx.sf2`, target engine `E-mu 10K1`, software `Awave v4.8:SFEDT v1.28:`, copyright `Public Domain`. So despite the in-repo filename, this is the well-known **GMGSx general-MIDI bank** (Public Domain), not a Pokémon-specific bank.
- **Hash**: sha256 `614ffa8eb1ac9bbb63fc97943dd67aa8fa706e2178b888777610c87e4e4b8cc8`, md5 `bd515a31167adaf6417b7cbbd08ef81c`, 4.0 MB.

### Audio/ inventory

`Audio/` (capital A) holds 4 standard Essentials buckets:

| Subdir | `.mid` | `.ogg` | `.wav` | total |
|---|---|---|---|---|
| `BGM/` | 78 | 54 | 0 | 169 |
| `BGS/` | 0 | 0 | 6 | 6 |
| `ME/` | 7 | 39 | 0 | 57 |
| `SE/` | 0 | 1474 | 2623 | 4212 |

`SE/` (sound effects) and `BGS/` (background sounds) are short one-shots with no MIDI counterpart — not interesting for our A/B fixture purposes. The interesting bucket is `BGM/`.

### Mid + OGG pairs in `BGM/` (rendered by mkxp+fluidsynth+GMGSx)

Six tracks have both a `.mid` and a `.ogg` of the same basename — clean A/B demo candidates: the OGG is the GMGSx-rendered reference for the MIDI.

| Basename | mid bytes | ogg bytes | mid sha256 |
|---|---|---|---|
| `Battle trainer` | 25,918 | 1,851,821 | `8596edf3…` |
| `Battle wild` | 29,956 | 1,146,875 | `a428d8bc…` |
| `Bicycle` | 107,184 | 875,836 | `a79747...` |
| `Hall of Fame` | 8,594 | 590,429 | `ff228e52…` |
| `Surfing` | 77,038 | 1,465,916 | `ffa1ac40…` |
| `Title` | 8,141 | 1,446,665 | `a8ffcb0d…` |

These are **GM MIDIs**, not Sappy-engine voicegroup MIDIs — they don't pair with a `.inc`. So if we add them to `/sounds/midi-lab` they'd want a different fixture-shape than the existing Pallet/Littleroot/Battle Dome Lobby trio (which carry `.inc` voicegroups). Two options:

1. **GM-mode fixtures**: extend the lab to also accept `.mid` + `.ogg` only (no `.inc`), bypass the voicegroup remapper for those, and let the user A/B the synthesised MIDI against the GMGSx-rendered OGG using whatever soundfont is selected from the dropdown. Best demo for "what does this MIDI sound like through bank X vs bank Y".
2. **Skip in lab**: treat zeak's repo as a soundfont-only contribution — upload GMGSx as a dropdown bank, leave the MIDIs out.

### Pending

- Decide which of the two scopes above to take (currently flagged for the user).
- If we proceed with (1): upload `soundfont.sf2` to R2 (proposed key `soundfonts/GMGSx-zeak-Fire-Red.sf2`) and the 6 mid+ogg pairs to a new prefix (e.g. `soundfonts/fixtures/zeak-Fire-Red/`).

## Open questions / followups

- **Cross-check**: do any of the MIDIs in NMM's Google Drive archive overlap by hash with the Exabyte U packs (#1150/#1151)? If so, we know which is the canonical version.
- **Licensing**: NMM says "feel free to give credit or link back" — informal, so HexHive listings sourced from the channel should attribute. The PokeRainbow GitHub repo will have a real license.

# Soundfonts

Inventory of every SF2 referenced by HexHive's MIDI playback — production `/sounds/[slug]` (`SoundPlayer.svelte`) and the `/sounds/midi-lab` page. SF2 binaries are **not** checked into the repo; they live in the Cloudflare R2 bucket at `cdn.hexhive.app/soundfonts/`.

## Hosted on `cdn.hexhive.app/soundfonts/`

### Pokemon-FireRed-LeafGreen-VGK.sf2 — 7.0 MB
- **Used by**: midi-lab (hard-coded default); SoundPlayer dropdown "FireRed/LeafGreen (VGK)" (default).
- **Provenance**: VGK = "Voicegroup Kollection". Found via Google ("fire red soundfont gba"); exact origin URL not recorded — needs back-fill.
- **Source URL**: _unknown — TODO_

### Pok_mon_GBA.sf2 — 904 KB
- **Used by**: SoundPlayer dropdown "Pokémon GBA (Mills)".
- **Provenance**: Mills's Pokémon GBA general bank.
- **Source URL**: _unknown — TODO_

### GeneralUser-GS.sf2 — 30.8 MB
- **Used by**: SoundPlayer dropdown "GeneralUser GS".
- **Provenance**: Christian Collins's GeneralUser GS — widely-used GM/GS soundfont.
- **Source URL**: https://schristiancollins.com/generaluser.php

## Pending review (in `~/Downloads/`, not yet uploaded)

**Discovery chain**: Reddit thread → musical-artifacts.com → YouTube → Mediafire.
- Reddit OP that led us to all three: https://www.reddit.com/r/PokemonRMXP/comments/14dctyr/i_want_to_compose_music_for_my_game_using_the_gen/
- Catalogue page (linked from the Reddit thread): https://musical-artifacts.com/artifacts/579 (the artifact page links to the YouTube video under "More Info", which carries the Mediafire URLs)

### Pokemon Emerald Soundfont (Updated August 29, 2025).sf2 — 57 MB
- **Direct download**: https://www.mediafire.com/file/ysbtegcf4tc6uxd/Pokemon_Emerald_Soundfont_%28Updated_April_20%2C_2021%29.sf2/file
- **Linked from**: YouTube description (updated) — https://www.youtube.com/watch?v=USc2yLnBuRo
- **Catalogue page**: https://musical-artifacts.com/artifacts/579 (the artifact page links to the YouTube video under "More Info", which carries the Mediafire link)
- **Filename note**: the URL still says "April 20, 2021" but the YouTube description was updated 2025-08-29 to point at the same Mediafire URL with revised content — verify by hash if re-fetching.

### Pokemon_RSE_v2.0__Unofficial_Update_.sf2 — 36 MB
- **Direct download**: https://musical-artifacts.com/artifacts/579/Pokemon_RSE_v2.0__Unofficial_Update_.sf2
- **Catalogue page**: https://musical-artifacts.com/artifacts/579

### Pokemon Emerald Soundfont (Actual).sf2 — 25 MB
- **Direct download**: https://www.mediafire.com/file/d94xrp62alnaai2/Pokemon+Emerald+Soundfont+%28Actual%29.sf2
- **Linked from**: https://musical-artifacts.com/artifacts/579 (under "More Info" / external links).

# Soundfont source records

Verbatim copies of the upstream pages we sourced our soundfonts from + the metadata embedded inside each SF2's RIFF `INFO` chunk, captured 2026-05-09. Kept separately from `soundfonts.md` so the catalogue stays scannable while still preserving the original author's words. When the upstream page rotates a Mediafire URL, changes the description, or disappears, this file is the fallback record.

## Embedded SF2 metadata (RIFF INFO)

Each SoundFont 2 file carries an `INFO` chunk with author, date, copyright, and free-text comment fields. These are the canonical "in-band readme" — extracted with a small Python helper (`/tmp/sf2info.py`) and reproduced verbatim below for every file we touch.

### `Pokemon FireRed and LeafGreen.sf2` (R2: `Pokemon-FireRed-LeafGreen-VGK.sf2`)

```
ifil (SoundFont version): 2.01
isng (Target sound engine): EMU8000
INAM (Bank name): Pokemon FireRed & LeafGreen
ICRD (Creation date): Monday 2 March 2026, 17:22:24
IENG (Author/Engineer): VGK
IPRD (Product/Target): Pokemon FireRed & LeafGreen - January 29, 2004 (GBA)
ICOP (Copyright): Go Ichinose & Junichi Masuda (Composers) - Game Freak (Developer), The Pokémon Company & Nintendo (Publisher)
ISFT (Software used): Polyphone
```

→ confirms **VGK = VideoGameKid** (the musical-artifacts username on #8297).

### `(0 ADSR) Pokemon FireRed and LeafGreen.sf2`

```
INAM: (0 ADSR) Pokemon FireRed & LeafGreen
ICRD: Monday 2 March 2026, 17:22:24
IENG: VGK
IPRD: Pokemon FireRed & LeafGreen - January 29, 2004 (Nintendo GBA)
ICOP: Go Ichinose & Junichi Masuda (Composers) - Game Freak (Developer), The Pokémon Company & Nintendo (Publisher)
ICMT (Comments): Version with 0 ADSR
ISFT: Polyphone
```

### `Pokemon Emerald Soundfont (Updated August 29, 2025).sf2` (R2: `Pokemon-Emerald-Updated-2025-08-29.sf2`)

```
INAM: Pokemon Emerald Soundfont (Updated Aug 29, 2025)
IENG: Nintendo Game Boy Advance SoundFont
IPRD: Pokemon Emerald Soundfont
ICOP: Ripped and assembled by MezmerKaiser
ICMT: Please credit if used!
ISFT: Polyphone
```

### `Pokemon_RSE_v2.0__Unofficial_Update_.sf2` (R2: `Pokemon-RSE-v2.0-unofficial.sf2`)

```
INAM: Pokemon RSE v2.0 (Unofficial Update).sf2
IENG: MezmerKaiser
ICOP: (c) 2011-2015 MezmerKaiser, Pokémon (C) Nintendo, Game Freak, The Pokemon Company. (C) 2018 IkaMusumeYiyaRoxie
ICMT: Samples Ripped By MezmerKaiser, Unoficial Update made by IkaMusumeYiyaRoxie
ISFT: Polyphone
```

→ identifies **IkaMusumeYiyaRoxie** as the unofficial-update author (and the unnamed re-uploader on artifact #579).

### `Pokemon Emerald Soundfont (Actual).sf2` (R2: `Pokemon-Emerald-Actual.sf2`)

```
INAM: Pokemon Emerald Soundfont
IENG: Nintendo Game Boy Advance SoundFont
IPRD: Pokemon Emerald Soundfont
ICOP: Ripped and assembled by MezmerKaiser
ICMT: Please credit if used
ISFT: Polyphone
```

### `Pok_mon_GBA.sf2` (R2: same)

```
INAM: Pokémon Ruby/Sapphire/Emerald/FireRed/LeafGreen Soundfont
ICRD: 2025-11-29T00:54:12Z
IENG: Braedon Mills
IPRD: Pokémon Ruby/Sapphire (2002); Pokémon FireRed/LeafGreen (2004); Pokémon Emerald (2004)
ICOP: Nintendo
ISFT: Polyphone
```

→ identifies **Braedon Mills** as the author (matches the existing "Pokémon GBA (Mills)" label in `SoundPlayer.svelte`). Single SF2 covers all four GBA Pokémon games. Source: musical-artifacts #7166 (see below); ICRD `2025-11-29T00:54:12Z` is the SF2's original creation date, which the author preserves across re-saves — the bytes-on-disk may have been edited after that.

---

## musical-artifacts.com / artifact #8297

> **Source of**: R2 `Pokemon-FireRed-LeafGreen-VGK.sf2` (zip also contains a `(0 ADSR)` variant we keep locally only).

- **URL**: https://musical-artifacts.com/artifacts/8297
- **Direct download**: https://musical-artifacts.com/artifacts/8297/Pokemon_FireRed_and_LeafGreen_Soundfont.zip (15 MB zip → unzips to two 7 MB SF2s + a status PNG)
- **Title**: Pokémon FireRed and LeafGreen Soundfont (VGM & Pokémon Sound Sources Checked) (UPDATE 4/30/26)
- **Author**: VideoGameKid
- **Uploaded**: Apr 07, 2026 (last updated May 01, 2026)
- **License**: CC-BY 3.0/4.0 (Creative Commons Attribution; per the linked footer)
- **Tags**: gameboy advance, gamefreak, pokemon, nintendo, soundfont
- **Likes**: 2 ("This is cool!"), Downloads: 1,037 at fetch time

### Description (verbatim)

> (UPDATE 4/30/26):
> Made a zip file for the SF2 but with extra adds.
> Made a 0 ADSR version where the ADSR for every single instrument is 0 (that way you can guys can have as much creative freedom with using it in a DAW) Ofc, there's still the regular SF2 if you want to use it.
>
> This was originally supposed to be my first ever compiled soundfont when I first started learning how to compile soundfonts but I ended up getting super lazy with it but here we are.... Anyways, as the title suggests, this is the fully compiled soundfont for one of my first pirate games back from elementary school, Pokémon FireRed and LeafGreen! Ripped using GBAMusRipper, everything is fully labeled accordingly and 100% checked via the VGM and Pokémon Sound Sources which MASSIVE credits to that! Ultimately the main reason why I made this compiled soundfont was because I noticed that a lot of Pokémon GBA soundfonts aren't that accurate when it comes to instrument labels (I saw one rip that labeled the Nylon Guitar as Steel Guitar which is flat out wrong) and also, MANY didn't include any of the unused instruments or tend to forgot some (One rip didn't even include one of the Distortion Guitars which was a massive no-no to me ☠️). Overall, you could say I wanted to make a definitive version for this soundfont rip or make one that's extremely accurate in terms instrument labeling and making sure everything is included. But getting back to the main point, I want to clarify some things here which are:
>
> - As I mentioned, everything (all wave samples and instruments) is fully labeled and 100% double checked via the Pokémon and VGM Sound Sources (All credit to them ofc).
> - Since many instruments like the French Horn or Grand Piano would have extra unnecessary samples attached to them, I would remove them and only keep the main instrument samples that is used. This only also includes the Drumkits as well.
> - Included all of the unused instruments that were never used in the OST for FireRed and LeafGreen. They're part of their own bank.
> - Included all of the SFXs found from the ripped soundfont. Not every single SFX was labeled from the Sound Sources since most of it is related to the general gameplay, so I made some education guesses on many that I knew was the best label for. For the ones that I wasn't too sure with, I simply labeled as "FRLG SFX #" which "#" is the corresponding number (I'll be sure to update the labels once I know what they are).
> - Include all of the related GB presents (Metallic Noise, Normal Noise, and Waves). I know Metallic Noise is mainly for sound effects but felt the need to include it anyways
> - Made a small edit on Drumkits 2, 3, and 5 where you can hear the same root key for the Kotsuzumi sample (note 85 for kit 2 and 3, note 114 for kit 5).
>
> Finally, here are the banks:
>
> - Bank 0 - General instruments (plus GB related presents)
> - Bank 1 - Extra instruments (Just the Closed Hi Hat)
> - Bank 2 - SFX
> - Bank 3 - Unused instruments.
> - Bank 128 - Drumkits
>
> PS: As always, I do plan to compose something original using this soundfont. I'll be sure to link it once that happens and hope I didn't disappoint with this rip!
>
> Another PS: I do plan to compile Ruby/Sapphire's and Emerald's soundfont when I can since it's nice to have all of them fully ripped and see how slightly different they are via the instrument differences. Also, Emerald did add a few more instruments for its exclusive OST so even more reason. Tho it'll take a bit since I'll have to handle the unique voice clips that is found within its music files (it's not found in FRLG's files).

---

## musical-artifacts.com / artifact #924

> **Source of**: R2 `Gameboy-GM-CynthiaCelestic.sf2`. **Games / generation**: Pokémon **Gen 1 & 2** (R/B/G/Y, G/S/C; Game Boy / Game Boy Color).

- **URL**: https://musical-artifacts.com/artifacts/924
- **Direct download**: https://musical-artifacts.com/artifacts/924/Gameboy_GM_Soundfont_2_.SF2 (22.7 MB)
- **Title**: Gameboy GM Soundfont
- **Authors**: CynthiaCelestic + ASIALUNAR + Moetsukiro
- **Uploaded**: Dec 14, 2019 (last updated May 19, 2024)
- **License**: **Do What The Fuck You Want To Public License 2.0** (WTFPL 2.0)
- **Tags**: qsynth, fluidsynth, fantasia, qsampler, linuxsampler, video game, gm, gameboy, soundfont, sf2
- **Likes**: 9 ("This is cool!"), Downloads: 21,503 at fetch time
- **Discovered via**: https://www.reddit.com/r/soundfonts/comments/zo0510/is_there_such_a_thing_as_a_soundfont_for_the/

### Description (verbatim)

> A GM gameboy soundfont by CynthiaClestic derived from the non-gm works of Moetsukiro/ASIA LUNAR.

### Embedded SF2 metadata (RIFF INFO)

```
INAM: Gameboy GM Soundfont
ICRD: Sunday 24 July 2016, 17:03:38
IENG: CynthiaCelestic (Rodolfo Ruiz-Velasco)
ICMT: Pokémon R/B/G/Y & G/S/C Soundfont.
ISFT: Polyphone
```

→ confirms the bank covers Pokémon Gen 1 (R/B/G/Y) and Gen 2 (G/S/C).

### File-content listing (first ~60 of many presets)

```
000-000 SQ1:1 Down7 Mod1
000-001 SQ1:1 Down7 Mod2
000-002 SQ1:3 Down7 Mod1
000-003 SQ1:3 Down7 Mod2
000-004 SQ1:7 Down7 Mod1
000-005 SQ1:7 Down7 Mod2
000-008 Celesta
000-009 Glockenspiel
000-010 Music Box
000-011 Vibraphone
000-012 Marimba
000-013 Xylophone
000-014 Tubular Bell
000-015 Dulcimer
000-016 VRC6 SQ 8\16
…
000-024 SCC Guitar1
…
000-032 SCC Bass
…
000-040 SCC Strings1
…
000-056 SCC Brass1
…
```

(SQ1 = Game Boy pulse-channel-1 emulations; VRC6 = Famicom expansion-chip square; SCC = Konami Sound Custom Chip — a chiptune-multichip-flavoured GM bank.)

---

## musical-artifacts.com / artifact #3246

> **Source of**: R2 `Gameboy-GM-stgiga-fixed.sf2`. **Games / generation**: Pokémon **Gen 1 & 2** (same as #924; same `ICMT`).

- **URL**: https://musical-artifacts.com/artifacts/3246
- **Direct download**: https://musical-artifacts.com/artifacts/3246/Gameboy_GM_Soundfont_2_FixTest.SF2.sf2 (22.7 MB)
- **Title**: Gameboy GM SoundFont (Fixed)
- **Authors**: stgiga (the polyphony fix) + CynthiaCelestic + ASIALUNAR + Moetsukiro (the underlying samples)
- **Uploaded**: Sep 26, 2023
- **License**: **WTFPL 2.0**
- **Tags**: general midi, general mid, gm bank, gm, gm1, sf2, emu soundfont
- **Likes**: 13 ("This is cool!"), Downloads: 17,820 at fetch time
- **More info**: https://musical-artifacts.com/artifacts/924 (canonical predecessor)

### Description (verbatim)

> I'm stgiga, and as for this SoundFont, someone on Reddit asked me to remove the Exclusive Class settings on this bank to allow proper polyphony so I did. The pitch limits are hard to fix because some regions only play on certain pitches, in a segmented way, and while I COULD completely remove pitch limits, god forbid your ears. Even the original is kind of loud. (The JummBox bank, with some exceptions, isn't, and unlike this SoundFont or my Famicom Multichip bank, is compatible with OpenMPT.)

### Embedded SF2 metadata (RIFF INFO)

```
INAM: Gameboy GM Soundfont
ICRD: Sunday 24 July 2016, 17:03:38
IENG: CynthiaCelestic (Rodolfo Ruiz-Velasco)
ICMT: Pokémon R/B/G/Y & G/S/C Soundfont.
ISFT: Polyphone
```

→ ICRD/IENG/ICMT are inherited from #924 (stgiga didn't rewrite the INFO chunk; only the SFGEN-level Exclusive Class data changed).

---

## musical-artifacts.com / artifact #7166

> **Source of**: R2 `Pok_mon_GBA.sf2`.

- **URL**: https://musical-artifacts.com/artifacts/7166
- **Direct download**: https://musical-artifacts.com/artifacts/7166/Pok_mon_GBA.sf2 (903 KB)
- **Title**: Pokémon Ruby/Sapphire/Emerald/FireRed/LeafGreen Soundfont
- **Author**: Braedon Mills (uploaded by the author themselves)
- **Uploaded**: Oct 10, 2025 (last updated May 09, 2026)
- **License**: **Creative Commons Attribution 3.0 Unported** ("Has to give attribution")
- **Tags**: qsynth, fluidsynth, fantasia, qsampler, linuxsampler, sf2
- **Likes**: 3 ("This is cool!"), Downloads: 1,200 at fetch time

### Description (verbatim)

> (No description available)

### File-content listing for `Pok_mon_GBA.sf2` (44 presets)

```
000-000 Grand Piano
000-004 Electric Piano 1
000-005 Electric Piano 2
000-009 Glockenspiel
000-010 Music Box
000-013 Xylophone
000-014 Tubular Bells
000-015 Dulcimer
000-017 Percussive Organ
000-018 Rock Organ
000-019 Church Organ
000-020 Reed Organ
000-021 Accordion
000-024 Nylon String Guitar
000-025 Steel String Guitar
000-029 Overdriven Guitar
000-030 Distortion Guitar
000-031 Guitar Harmonics
000-032 Acoustic Bass
000-033 Fingered Bass
000-035 Fretless Bass
000-036 Slap Bass 1
000-038 Synth Bass 1
000-039 Synth Bass 2
000-045 Pizzicato Strings
000-046 Harp
000-047 Timpani
000-048 Strings
000-052 Choir Aahs
000-056 Trumpet
000-058 Tuba
000-060 French Horn
000-068 Oboe
000-069 English Horn
000-073 Flute
000-075 Pan Flute
000-077 Shakuhachi
000-078 Whistle
000-080 Square
000-084 Charang
000-090 Polysynth
000-106 Shamisen
000-107 Koto
128-000 Standard Drum Kit
```

### Revision notes

The file at #7166 has been re-saved by the author at least once. The 2026-05-09 update swapped program 62 ("Synth Brass" in the prior revision) for program 84 ("Charang"). Both revisions are 924,998 bytes. Hashes seen so far:

- prior revision (downloaded by us before 2026-05-09; unknown how long it had been the page's published bytes): sha256 `3f865e4c…`, md5 `575c2279…`
- after the page's 2026-05-09 update: sha256 `059acfa8…`, md5 `54df8bc2…` — current on R2

If the page's "last updated" advances again, fetch + re-hash + re-upload to R2 and append the new sha256 here.

---

## musical-artifacts.com / artifact #1150

> **Source of**: local `~/Downloads/PokeSoundfonts/PKMN FRLG/` instrument-pack + 60 FRLG MIDIs (the same MIDIs we use for `Pallet Town` and `Battle Dome Lobby`-equivalent FRLG fixtures).

- **URL**: https://musical-artifacts.com/artifacts/1150
- **Direct download**: https://musical-artifacts.com/artifacts/1150/PKMN_FRLG.zip (76 MB)
- **Mirror**: https://mega.nz/folder/7aBD1QDS#PoPWD9AM_HwQGKjl4CUi5Q
- **Title**: Pokemon: Firered/Leafgreen [GBA]
- **Author**: Exabyte U
- **Uploaded**: Apr 24, 2020
- **License**: "Licensing Gray Area" / Non-free; Pokemon © Nintendo, Game Freak, The Pokémon Company, 4kids Entertainment (formerly), TV Tokyo
- **Tags**: gba soundfont, pokemon, midi, zip

### Description (verbatim)

> Soundfont and midi ripped straight from the video game using GBAMusRiper. Able to be used with any DAW that plays soundfonts.

### Bundled `Read Me!.txt`

> [Pokemon FireRed & LeafGreen] Midi & Soundfont
>
> Ripped & Sorted By Exabyte U
> Midi names are courtesy of various YT Channels and sites [(I forgot, I'm sorry)]
>
> No credit is needed, just don't claim as your own.
> Thank you!

---

## musical-artifacts.com / artifact #1151 (companion)

> Not yet downloaded. Listed here because it's the RSE/Emerald sibling to #1150 by the same uploader, and the canonical source for the `Battle Dome Lobby.mid` and `Littleroot Town.mid` fixture MIDIs we already use.

- **URL**: https://musical-artifacts.com/artifacts/1151
- **Direct download**: https://musical-artifacts.com/artifacts/1151/PKMN_RSE.zip
- **Mirror**: https://mega.nz/folder/zOZxlAoZ#SYrUrYjVuVEHQGtlcX9Xjg
- **Title**: Pokemon: Ruby/Sapphire/Emerald [GBA]
- **Author**: Exabyte U
- **Uploaded**: Apr 24, 2020
- **License**: Licensing Gray Area / Non-free
- **Tags**: gba soundfont, pokemon, midi, zip

### Description (verbatim)

> Soundfont and midi ripped straight from the video game using GBAMusRiper. Able to be used with any DAW that plays soundfonts.

---

## musical-artifacts.com / artifact #579

> **Source of**: R2 `Pokemon-RSE-v2.0-unofficial.sf2` (the `musical-artifacts.com` mirror) **and** R2 `Pokemon-Emerald-Actual.sf2` (the Mediafire mirror linked from this same page).

- **URL**: https://musical-artifacts.com/artifacts/579
- **Direct download**: https://musical-artifacts.com/artifacts/579/Pokemon_RSE_v2.0__Unofficial_Update_.sf2
- **External mirror**: http://www.mediafire.com/file/d94xrp62alnaai2/Pokemon+Emerald+Soundfont+%28Actual%29.sf2
- **More info**: https://www.youtube.com/watch?v=USc2yLnBuRo  ("Pokémon Emerald Soundfont Download" by **MezmerKaiser** — channel `https://www.youtube.com/@MezmerKaiser725`)
- **Title**: Pokemon GBA Soundfont
- **Author** (original SF2 creator): MezmerKaiser
- **Uploader** (re-poster on musical-artifacts): unknown — disclaimer below
- **Uploaded**: May 21, 2018 (last updated May 19, 2024)
- **License**: "Licensing Gray Area" / Non-free; Pokemon © Nintendo, Game Freak, The Pokémon Company, 4kids Entertainment (formerly), TV Tokyo
- **Tags**: qsynth, fantasia, qsampler, linuxsampler, fluidsynth, video game, nintendo, gba, pokemon, sf2

### Description (verbatim)

> DISCLAIMER: I do not own this soundfont, because, only I'm Sharing for this web site.
>
> The Pokemon Ruby/Sapphire/Emerald/FireRed and LeafGreen soundfont is not posted in Musical Artifacts. Thanks to MezmerKaiser for make this Excellent Soundfont of he made it.
>
> Here's the Unofficial update and Corrected presets, because, Drum Kit, is wrong on the melodic presets, so, i moved in Percussive in the bank "128"

### File-content listing for `Pokemon_RSE_v2.0__Unofficial_Update_.sf2` (first 30, copied from the page)

```
000 - Acoustic Piano
000 - Drum Kit
001 - Bright Piano
003 - Bright Piano 2
004 - Electric Piano 1
005 - Electric Piano 2
006 - Harpsichord
007 - Clavinet
009 - Glockenspiel
010 - Music Box
012 - Marimba
013 - Xylophone
014 - Tubular Bell
015 - Dulcimer
017 - Percussive Organ
018 - Percussive Organ 2
019 - Pipe Organ
020 - Pipe Organ 2
021 - Accordion
024 - Nylon String Guitar
025 - Nylon Guitar 2
026 - Electric Jazz Guitar
028 - Muted Bass 1
028 - Muted Bass 2
029 - Overdriven Guitar
030 - Distortion Guitar
031 - Guitar Harmonics
032 - Acoustic Bass
033 - Electric Finger Bass
034 - Electric Picked Bass
…
```

Full listing on the upstream page; ~80 presets in total.

---

## YouTube — `USc2yLnBuRo` ("Pokémon Emerald Soundfont Download" by MezmerKaiser)

> **Source of (via description)**: R2 `Pokemon-Emerald-Updated-2025-08-29.sf2` and R2 `Pokemon-Emerald-Actual.sf2` (both linked from artifact #579's "More info").

- **URL**: https://www.youtube.com/watch?v=USc2yLnBuRo
- **Title**: Pokémon Emerald Soundfont Download
- **Channel**: MezmerKaiser — https://www.youtube.com/@MezmerKaiser725
- **Source for metadata**: YouTube oEmbed endpoint (the full description requires JavaScript to render and could not be captured server-side; rerun with `yt-dlp --skip-download --print description` to back-fill if needed).

The description carries the rotating Mediafire URLs the user follows to download the SF2s. We've recorded the two Mediafire URLs we know about in `soundfonts.md`. If the YouTube description is updated again with a new file revision, fetch the new file and re-hash before swapping in the R2 bucket.

---

## schristiancollins.com — GeneralUser GS

> **Source of**: R2 `GeneralUser-GS.sf2`.

- **URL**: https://schristiancollins.com/generaluser.php
- **Author**: Christian Collins
- **License**: GeneralUser GS license (free for any use, including commercial; redistribution permitted with notice — see upstream).
- **Description**: GeneralUser GS is a widely-used GM/GS-compatible SoundFont with 256 instrument presets, designed to fit common DAW workflows.

---

## Still missing source URLs

After the round-trip on 2026-05-09:

1. **`Pok_mon_GBA.sf2`** (R2; 904 KB; 44 GM-named presets including "Steel String Guitar"). Filename style is consistent with a musical-artifacts.com export but no entry was found by exact-name search nor by browsing the first three pages of `?q=Pokemon`. The most plausible candidates based on size/preset shape — and worth probing next:
   - `#2322` General Game Boy Advance Soundfont 2.0 — direct file `General_Game_Boy_Advance_Soundfont.sf2`, 904 KB region.
   - `#891` "Nesfont advance".
   - A non-musical-artifacts source (a forum post, a personal site).

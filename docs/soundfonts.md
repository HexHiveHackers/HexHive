# Soundfonts

Inventory of every SF2 referenced by HexHive's MIDI playback (production `/sounds/[slug]` `SoundPlayer.svelte`, `/sounds/midi-lab` page) plus the local working stash under `~/Downloads/PokeSoundfonts/`. R2 binaries live in the Cloudflare bucket `hexhive-prod` under the `soundfonts/` prefix and are served at `https://cdn.hexhive.app/soundfonts/<file>` via the bucket's custom-domain mapping.

Hashes (sha256 + md5) are recorded so we can detect duplicates across mirrors, verify uploads, and identify a soundfont when a third-party redistributes it under a different filename. Originally-distributed filenames are preserved here even when the R2 key was renamed for URL hygiene.

## Status snapshot

| R2 file | Original filename | Source URL recorded? |
|---|---|---|
| `Pokemon-FireRed-LeafGreen-VGK.sf2` | `Pokemon FireRed and LeafGreen.sf2` | ✅ — musical-artifacts #8297 by VideoGameKid |
| `Pok_mon_GBA.sf2` | `Pok_mon_GBA.sf2` | ✅ — musical-artifacts #7166 by Braedon Mills (CC-BY 3.0) |
| `GeneralUser-GS.sf2` | `GeneralUser GS v<version>.sf2` | ✅ |
| `Pokemon-Emerald-Updated-2025-08-29.sf2` | `Pokemon Emerald Soundfont (Updated August 29, 2025).sf2` | ✅ |
| `Pokemon-RSE-v2.0-unofficial.sf2` | `Pokemon_RSE_v2.0__Unofficial_Update_.sf2` | ✅ |
| `Pokemon-Emerald-Actual.sf2` | `Pokemon Emerald Soundfont (Actual).sf2` | ✅ |
| `Pokemon-FireRed-LeafGreen-0ADSR.sf2` | `(0 ADSR) Pokemon FireRed and LeafGreen.sf2` | ✅ — bundled with VGK in #8297 |
| `archives/musical-artifacts-8297-Pokemon_FireRed_and_LeafGreen_Soundfont.zip` | `Pokemon_FireRed_and_LeafGreen_Soundfont.zip` | ✅ — full source archive of #8297 (mirror) |
| `archives/musical-artifacts-1150-PKMN_FRLG.zip` | `PKMN_FRLG.zip` | ✅ — musical-artifacts #1150 by Exabyte U (mirror; 315 instrument SF2s + 60 FRLG MIDIs) |
| `CATALOGUE.md` | this file | ✅ — mirrored to R2 |
| `SOURCES.md` | `soundfont-sources.md` | ✅ — mirrored to R2 |

Full upstream descriptions (verbatim) live in [`soundfont-sources.md`](./soundfont-sources.md).

## Missing source URLs

✅ **None as of 2026-05-09.** Every R2-hosted soundfont and every local-only file under `~/Downloads/PokeSoundfonts/` has a confirmed origin URL recorded above.

## Hosted on `cdn.hexhive.app/soundfonts/`

### Pokemon-FireRed-LeafGreen-VGK.sf2 — 7,329,446 bytes (7.0 MB)
- **R2 key**: `soundfonts/Pokemon-FireRed-LeafGreen-VGK.sf2`
- **Used by**: midi-lab default; SoundPlayer dropdown "FireRed/LeafGreen (VGK)" (default).
- **Original filename**: `Pokemon FireRed and LeafGreen.sf2` (the `-VGK` suffix was our rename — turns out **`VGK` is the author's initials (VideoGameKid)**, not a soundfont line, so the suffix is actually accurate; bank `INAM` is `Pokemon FireRed & LeafGreen`).
- **Author**: VideoGameKid (`IENG: VGK` in the SF2 metadata; matches their musical-artifacts username on #8297). Built with Polyphone, dated 2026-03-02.
- **Composer credits** (`ICOP`): Go Ichinose & Junichi Masuda — Game Freak / The Pokémon Company / Nintendo.
- **Source URL**: https://musical-artifacts.com/artifacts/8297 (direct archive: https://musical-artifacts.com/artifacts/8297/Pokemon_FireRed_and_LeafGreen_Soundfont.zip). Released as a 15 MB zip containing the 7 MB SF2, the 7 MB `(0 ADSR)` variant, and a status PNG. Ripped using GBAMusRipper, double-checked against the VGM and Pokémon Sound Sources. Banks: 0=general+GB presets, 1=closed hi-hat, 2=SFX, 3=unused, 128=drumkits. License: CC-BY (per the page footer link).
- Full embedded metadata + page description in [`soundfont-sources.md`](./soundfont-sources.md).
- **sha256**: `c9430711e41a0a96293b64d0ef76061d77ca3d695d8d092ef705d023c3715ac1`
- **md5**: `c86d3bb9d008d963766ca6c6aa9a8afb`
- **Aliases by hash**: `~/Downloads/PokeSoundfonts/Pokemon_FireRed_and_LeafGreen_Soundfont/Pokemon FireRed and LeafGreen.sf2` (byte-identical).

### Pok_mon_GBA.sf2 — 924,998 bytes (904 KB)
- **R2 key**: `soundfonts/Pok_mon_GBA.sf2`
- **Used by**: SoundPlayer dropdown "Pokémon GBA (Mills)".
- **Original filename**: `Pok_mon_GBA.sf2`. Bank `INAM`: `Pokémon Ruby/Sapphire/Emerald/FireRed/LeafGreen Soundfont` — a single SF2 covering all four GBA Pokémon games (44 presets).
- **Author**: **Braedon Mills** (`IENG: Braedon Mills`, original `ICRD: 2025-11-29T00:54:12Z`, built with Polyphone). License: **CC-BY 3.0 Unported** per the artifact page.
- **Source URL**: https://musical-artifacts.com/artifacts/7166 (direct: https://musical-artifacts.com/artifacts/7166/Pok_mon_GBA.sf2). Uploaded by Braedon Mills himself on Oct 10, 2025; the file is updated occasionally — last updated 2026-05-09 swapped program 62 from "Synth Brass" to "Charang". Re-fetch when the page's "last updated" advances.
- **sha256** (current revision, on R2): `059acfa8e37eb0180ec4ad674439e7fe9c13746fd84f6d260e27fe8ddf430b31`
- **md5**: `54df8bc2a92acdf611f80ed17e762f88`
- **Prior revisions seen**:
  - sha256 `3f865e4c9261a2464cb4529b364e2ab84ccf208900d17ef7cd5d62750e00a1d3` / md5 `575c22794ef35c55287949e1758cbc21` — pre-2026-05-09; preset 62 was "Synth Brass" instead of program 84 "Charang".
- **Aliases by hash**: `~/Downloads/PokeSoundfonts/Pok_mon_GBA.sf2` matches the prior-revision hash; redownload from #7166 to refresh.

### GeneralUser-GS.sf2 — 32,322,864 bytes (30.8 MB)
- **R2 key**: `soundfonts/GeneralUser-GS.sf2`
- **Used by**: SoundPlayer dropdown "GeneralUser GS".
- **Provenance**: Christian Collins's _GeneralUser GS_ — widely-used GM/GS soundfont.
- **Original filename**: typically `GeneralUser GS v<version>.sf2`. We renamed for the URL.
- **Source URL**: https://schristiancollins.com/generaluser.php
- **sha256**: `c278464b823daf9c52106c0957f752817da0e52964817ff682fe3a8d2f8446ce`
- **md5**: `1cc160a92fadb6a43eb1695563524982`

### Pokemon-Emerald-Updated-2025-08-29.sf2 — 59,574,844 bytes (57 MB)
- **R2 key**: `soundfonts/Pokemon-Emerald-Updated-2025-08-29.sf2`
- **Original filename**: `Pokemon Emerald Soundfont (Updated August 29, 2025).sf2`
- **Author**: **MezmerKaiser** (`ICOP: Ripped and assembled by MezmerKaiser`, channel https://www.youtube.com/@MezmerKaiser725). Embedded comment: "Please credit if used!".
- **Source URL**: https://www.mediafire.com/file/ysbtegcf4tc6uxd/Pokemon_Emerald_Soundfont_%28Updated_April_20%2C_2021%29.sf2/file
- **Note**: Mediafire URL slug still says "April 20, 2021" but the file behind it was rotated. Always re-check the hash if re-fetched.
- **Discovery**: Reddit https://www.reddit.com/r/PokemonRMXP/comments/14dctyr/ → musical-artifacts.com #579 → YouTube https://www.youtube.com/watch?v=USc2yLnBuRo (description carries the Mediafire link).
- **sha256**: `cee9f4507a7ac3ad13947442177c9da9d37bae3aa5924049f02c892e36466ae5`
- **md5**: `ae6e9105a9f72652da581d37a2b06b40`

### Pokemon-RSE-v2.0-unofficial.sf2 — 37,144,280 bytes (35.4 MB)
- **R2 key**: `soundfonts/Pokemon-RSE-v2.0-unofficial.sf2`
- **Original filename**: `Pokemon_RSE_v2.0__Unofficial_Update_.sf2`
- **Authors** (`ICOP` / `ICMT` in the SF2): _"Samples Ripped By **MezmerKaiser**, Unoficial Update made by **IkaMusumeYiyaRoxie**"_; copyright `(c) 2011-2015 MezmerKaiser, Pokémon (C) Nintendo, Game Freak, The Pokemon Company. (C) 2018 IkaMusumeYiyaRoxie`. The unofficial update fixed drum-kit preset placement (moved to bank 128). Embedded metadata identifies IkaMusumeYiyaRoxie as the otherwise-unnamed re-uploader on artifact #579.
- **Source URL**: https://musical-artifacts.com/artifacts/579/Pokemon_RSE_v2.0__Unofficial_Update_.sf2
- **Catalogue**: https://musical-artifacts.com/artifacts/579
- **License**: Licensing Gray Area / Non-free.
- **sha256**: `f9e8c7b85f8bbd88e8c1f1c6d80356ecb81dd36e1542c999f0bee28fb2eb2ebc`
- **md5**: `fab54240c3cabecda719c43ba02df6b3`

### Pokemon-Emerald-Actual.sf2 — 25,903,042 bytes (24.7 MB)
- **R2 key**: `soundfonts/Pokemon-Emerald-Actual.sf2`
- **Original filename**: `Pokemon Emerald Soundfont (Actual).sf2`
- **Original SF2 author**: MezmerKaiser (channel https://www.youtube.com/@MezmerKaiser725, video https://www.youtube.com/watch?v=USc2yLnBuRo "Pokémon Emerald Soundfont Download").
- **Source URL**: https://www.mediafire.com/file/d94xrp62alnaai2/Pokemon+Emerald+Soundfont+%28Actual%29.sf2 (linked as a "Mirror" from musical-artifacts #579).
- **Catalogue**: https://musical-artifacts.com/artifacts/579 (under "Mirrors" / "More info").
- **License**: same gray-area as #579.
- **sha256**: `252bb5c42cc28772c30280a8765dc3a0371601c604c56c2cb0845d195595b1c2`
- **md5**: `a48f652eba5f77275e89690c2800ace5`

### Pokemon-FireRed-LeafGreen-0ADSR.sf2 — 7,327,300 bytes (7.0 MB)
- **R2 key**: `soundfonts/Pokemon-FireRed-LeafGreen-0ADSR.sf2`
- **Used by**: not yet wired into a dropdown — kept on R2 as a companion to the regular VGK file. Useful in DAW workflows where the envelope curve is more of a hindrance than a help.
- **Original filename**: `(0 ADSR) Pokemon FireRed and LeafGreen.sf2`.
- **Author**: VideoGameKid (same as the regular VGK).
- **Source URL**: https://musical-artifacts.com/artifacts/8297 — bundled with the regular file in `Pokemon_FireRed_and_LeafGreen_Soundfont.zip`. Per the page: "Made a 0 ADSR version where the ADSR for every single instrument is 0 (that way you can guys can have as much creative freedom with using it in a DAW)".
- **sha256**: `72a782006de17a531198331149a02967e834b5b6184454f4112ee3aea1b210b3`
- **md5**: `aaa4b06017e202a976b152885e787fe2`

## Source-archive mirrors on R2 (`soundfonts/archives/`)

We mirror the upstream zip archives so we have a hash-stable copy if the artifact pages or Mediafire links rotate. They are not loaded by the synth.

### archives/musical-artifacts-8297-Pokemon_FireRed_and_LeafGreen_Soundfont.zip — 5,037,802 bytes (4.8 MB)
- **Source**: https://musical-artifacts.com/artifacts/8297/Pokemon_FireRed_and_LeafGreen_Soundfont.zip
- **Contents**: regular VGK SF2 + (0 ADSR) variant + status PNG.
- **sha256**: `a256746323254edef4c1584a784449e78c3df791392f6995bc5024bf1367be4a`
- **md5**: `7e2b173758eae72bb4f9c8adf2aa5332`

### archives/musical-artifacts-1150-PKMN_FRLG.zip — 76,235,922 bytes (72.7 MB)
- **Source**: https://musical-artifacts.com/artifacts/1150/PKMN_FRLG.zip (Exabyte U).
- **Contents**: 315 single-instrument SF2s + 60 FRLG MIDIs + a Read Me!.txt. The MIDIs in `[PKMN FRLG]/` are the source for our `mus_pallet.mid` and other Pallet/FRLG fixtures.
- **sha256**: `6347fbe5693312882530e3af528db16c5074a83352dbb1e04f52044e7059b6cc`
- **md5**: `8af7e7d2fed9ec94b0f3f4754b0ff821`

_(The PKMN FRLG sample pack, formerly listed as local-only, is now mirrored to R2 at `archives/musical-artifacts-1150-PKMN_FRLG.zip` — see Source-archive mirrors above. The local unzipped tree under `~/Downloads/PokeSoundfonts/PKMN FRLG/` is convenience-only; the canonical copy is the upstream artifact + our R2 mirror by hash.)_

## Uploading new soundfonts

The CDN bucket is **`hexhive-prod`** (Cloudflare R2, custom-domain mapped to `cdn.hexhive.app`). The R2 credentials live in Railway production env vars (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`); the linked `railway` CLI can read them directly. R2 is S3-compatible — use the AWS CLI with `--endpoint-url` and `region=auto`:

```bash
# Pull live creds from Railway production
R2_ACCESS_KEY_ID=$(railway variables --kv | sed -n 's/^R2_ACCESS_KEY_ID=//p')
R2_SECRET_ACCESS_KEY=$(railway variables --kv | sed -n 's/^R2_SECRET_ACCESS_KEY=//p')
R2_ACCOUNT_ID=$(railway variables --kv | sed -n 's/^R2_ACCOUNT_ID=//p')
export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto
ENDPOINT="https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"

# Upload
aws --endpoint-url "$ENDPOINT" s3 cp \
  "/path/to/local/Whatever.sf2" \
  "s3://hexhive-prod/soundfonts/Whatever.sf2" \
  --content-type application/octet-stream

# Verify (sha256 of the served object)
curl -sS "https://cdn.hexhive.app/soundfonts/Whatever.sf2" | sha256sum
```

After upload, document the file in this catalogue with hashes, original filename, source URL(s), and discovery chain. If the new SF2 should appear in the in-app soundfont dropdown, edit `SOUNDFONTS` in `src/lib/components/listings/sound/SoundPlayer.svelte` and the matching list in `src/routes/sounds/midi-lab/+page.svelte`.

## How the bucket is wired

- Cloudflare R2 bucket `hexhive-prod` (account `8221f737e4a1c585b1bccde05a0ec790`).
- Custom domain `cdn.hexhive.app` is mapped to the bucket via Cloudflare DNS — every key under any prefix is served at `https://cdn.hexhive.app/<key>`.
- The `soundfonts/` prefix is a convention for static, public-by-design assets; uploaded listing files (sprites, sounds, scripts, romhacks) live under `listings/<listingId>/<versionId>/<filename>` from the upload-flow code in `src/lib/storage/r2.ts`.
- The bucket also has a `pub-…r2.dev` public-bucket URL but we don't use it; everything goes through `cdn.hexhive.app` so we keep CORS/headers control.

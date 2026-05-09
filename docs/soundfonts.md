# Soundfonts

Inventory of every SF2 referenced by HexHive's MIDI playback (production `/sounds/[slug]` `SoundPlayer.svelte`, `/sounds/midi-lab` page) plus the local working stash under `~/Downloads/PokeSoundfonts/`. R2 binaries live in the Cloudflare bucket `hexhive-prod` under the `soundfonts/` prefix and are served at `https://cdn.hexhive.app/soundfonts/<file>` via the bucket's custom-domain mapping.

Hashes (sha256 + md5) are recorded so we can detect duplicates across mirrors, verify uploads, and identify a soundfont when a third-party redistributes it under a different filename. Originally-distributed filenames are preserved here even when the R2 key was renamed for URL hygiene.

## Status snapshot

| R2 file | Original filename | Source URL recorded? |
|---|---|---|
| `Pokemon-FireRed-LeafGreen-VGK.sf2` | `Pokemon FireRed and LeafGreen.sf2` | ❌ — see "Missing source URLs" |
| `Pok_mon_GBA.sf2` | `Pok_mon_GBA.sf2` | ❌ — see "Missing source URLs" |
| `GeneralUser-GS.sf2` | `GeneralUser GS v<version>.sf2` | ✅ |
| `Pokemon-Emerald-Updated-2025-08-29.sf2` | `Pokemon Emerald Soundfont (Updated August 29, 2025).sf2` | ✅ |
| `Pokemon-RSE-v2.0-unofficial.sf2` | `Pokemon_RSE_v2.0__Unofficial_Update_.sf2` | ✅ |
| `Pokemon-Emerald-Actual.sf2` | `Pokemon Emerald Soundfont (Actual).sf2` | ✅ |
| _(local-only)_ `(0 ADSR) Pokemon FireRed and LeafGreen.sf2` | same | ❌ — bundled with VGK source archive |
| _(local-only sample pack)_ `PKMN FRLG/` (315 single-instrument SF2s + 60 MIDIs) | `PKMN_FRLG.zip` | ❌ — by "Exabyte U", origin unknown |

## Missing source URLs

These three need their origin tracked down so we can credit + re-fetch:

1. **`Pokemon FireRed and LeafGreen.sf2`** — the file behind R2 `Pokemon-FireRed-LeafGreen-VGK.sf2`. The local source archive is `Pokemon_FireRed_and_LeafGreen_Soundfont.zip` (sha256 `a256…`); we don't know which YouTube/Mediafire/musical-artifacts page hosts that zip. Filename style + the bundled `(0 ADSR)` variant suggest a single uploader rather than musical-artifacts. The directory also contains `General Completed SF2 Rips In Order (6).png` — a status PNG that looks like it's from a YouTube channel or Discord tracking SF2 rip progress.
2. **`Pok_mon_GBA.sf2`** — Latin-1-mangled filename style (the `_` is where "é" got stripped) is characteristic of musical-artifacts.com URLs. Likely candidate: a "Pokémon GBA" / "Mills" entry on musical-artifacts.com — check.
3. **`PKMN FRLG/`** instrument pack — readme says **"Ripped & Sorted By Exabyte U"**. 315 single-instrument SF2s (each named after the canonical instrument + the track it was extracted from, e.g. `Trumpet (Battle! Trainer).sf2`) plus 60 MIDIs in `[PKMN FRLG]/`. Source archive `PKMN_FRLG.zip` (sha256 `6347…`). Likely on Exabyte U's YouTube channel or Discord.

## Hosted on `cdn.hexhive.app/soundfonts/`

### Pokemon-FireRed-LeafGreen-VGK.sf2 — 7,329,446 bytes (7.0 MB)
- **R2 key**: `soundfonts/Pokemon-FireRed-LeafGreen-VGK.sf2`
- **Used by**: midi-lab default; SoundPlayer dropdown "FireRed/LeafGreen (VGK)" (default).
- **Original filename**: `Pokemon FireRed and LeafGreen.sf2` (`-VGK` suffix and `Pokemon-FireRed-LeafGreen-` prefix were our renames). The "VGK" labelling was a hopeful guess that turned out to be wrong — keep the R2 key for stability but the canonical filename is the one in the source archive.
- **Source URL**: _unknown — TODO_. Found via Google "fire red soundfont gba". Bundled in `Pokemon_FireRed_and_LeafGreen_Soundfont.zip` (sha256 `a256746323254edef4c1584a784449e78c3df791392f6995bc5024bf1367be4a`) alongside `(0 ADSR) Pokemon FireRed and LeafGreen.sf2`.
- **sha256**: `c9430711e41a0a96293b64d0ef76061d77ca3d695d8d092ef705d023c3715ac1`
- **md5**: `c86d3bb9d008d963766ca6c6aa9a8afb`
- **Aliases by hash**: `~/Downloads/PokeSoundfonts/Pokemon_FireRed_and_LeafGreen_Soundfont/Pokemon FireRed and LeafGreen.sf2` (byte-identical).

### Pok_mon_GBA.sf2 — 924,998 bytes (904 KB)
- **R2 key**: `soundfonts/Pok_mon_GBA.sf2`
- **Used by**: SoundPlayer dropdown "Pokémon GBA (Mills)".
- **Original filename**: `Pok_mon_GBA.sf2` (the underscore is a Latin-1-mangled "é"; canonical title is "Pokémon GBA"). Filename style is characteristic of musical-artifacts.com.
- **Source URL**: _unknown — TODO_ (likely musical-artifacts.com; verify and back-fill).
- **sha256**: `3f865e4c9261a2464cb4529b364e2ab84ccf208900d17ef7cd5d62750e00a1d3`
- **md5**: `575c22794ef35c55287949e1758cbc21`
- **Aliases by hash**: `~/Downloads/PokeSoundfonts/Pok_mon_GBA.sf2` (byte-identical).

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
- **Source URL**: https://www.mediafire.com/file/ysbtegcf4tc6uxd/Pokemon_Emerald_Soundfont_%28Updated_April_20%2C_2021%29.sf2/file
- **Note**: Mediafire URL slug still says "April 20, 2021" but the file behind it was rotated. Always re-check the hash if re-fetched.
- **Discovery**: Reddit https://www.reddit.com/r/PokemonRMXP/comments/14dctyr/ → musical-artifacts.com #579 → YouTube https://www.youtube.com/watch?v=USc2yLnBuRo (description carries the Mediafire link).
- **sha256**: `cee9f4507a7ac3ad13947442177c9da9d37bae3aa5924049f02c892e36466ae5`
- **md5**: `ae6e9105a9f72652da581d37a2b06b40`

### Pokemon-RSE-v2.0-unofficial.sf2 — 37,144,280 bytes (35.4 MB)
- **R2 key**: `soundfonts/Pokemon-RSE-v2.0-unofficial.sf2`
- **Original filename**: `Pokemon_RSE_v2.0__Unofficial_Update_.sf2`
- **Source URL**: https://musical-artifacts.com/artifacts/579/Pokemon_RSE_v2.0__Unofficial_Update_.sf2
- **Catalogue**: https://musical-artifacts.com/artifacts/579
- **sha256**: `f9e8c7b85f8bbd88e8c1f1c6d80356ecb81dd36e1542c999f0bee28fb2eb2ebc`
- **md5**: `fab54240c3cabecda719c43ba02df6b3`

### Pokemon-Emerald-Actual.sf2 — 25,903,042 bytes (24.7 MB)
- **R2 key**: `soundfonts/Pokemon-Emerald-Actual.sf2`
- **Original filename**: `Pokemon Emerald Soundfont (Actual).sf2`
- **Source URL**: https://www.mediafire.com/file/d94xrp62alnaai2/Pokemon+Emerald+Soundfont+%28Actual%29.sf2
- **Catalogue**: https://musical-artifacts.com/artifacts/579 (under "More Info" / external links).
- **sha256**: `252bb5c42cc28772c30280a8765dc3a0371601c604c56c2cb0845d195595b1c2`
- **md5**: `a48f652eba5f77275e89690c2800ace5`

## Local-only stash (`~/Downloads/PokeSoundfonts/`)

These are kept locally — either variants of an existing R2 file we haven't decided to host, or a sample pack that doesn't fit the "single SF2 to load into the synth" shape.

### (0 ADSR) Pokemon FireRed and LeafGreen.sf2 — 7,327,300 bytes (7.0 MB)
- **Local path**: `~/Downloads/PokeSoundfonts/Pokemon_FireRed_and_LeafGreen_Soundfont/(0 ADSR) Pokemon FireRed and LeafGreen.sf2`
- **Original filename**: same.
- **Provenance**: bundled in `Pokemon_FireRed_and_LeafGreen_Soundfont.zip` next to the regular VGK file. The "0 ADSR" variant zeros the envelope — instruments cut off cleanly with no attack/decay/sustain/release curve, useful for sample-accurate playback of GBA samples.
- **Source URL**: _unknown — same archive as VGK (TODO)_.
- **sha256**: `72a782006de17a531198331149a02967e834b5b6184454f4112ee3aea1b210b3`
- **md5**: `aaa4b06017e202a976b152885e787fe2`

### `PKMN FRLG/` — Exabyte U sample pack
- **Local path**: `~/Downloads/PokeSoundfonts/PKMN FRLG/`
- **Source archive**: `PKMN_FRLG.zip` (76,235,922 bytes).
  - **sha256**: `6347fbe5693312882530e3af528db16c5074a83352dbb1e04f52044e7059b6cc`
  - **md5**: `8af7e7d2fed9ec94b0f3f4754b0ff821`
- **Contents**: 315 small SF2s, each containing a single instrument extracted from a specific FRLG track (named like `Trumpet (Battle! Trainer).sf2`, `Tuba (The S.S. Anne).sf2`). Sorted into folders: Bass, Brass, Choirs & Hits, Chrom. Perc, Guitars, Organs & Pianos, Percussion, SFX+, Strings, Synths+, Woodwinds. Plus a 60-MIDI subfolder `[PKMN FRLG]/` with the FRLG soundtrack as standard MIDI files.
- **Credits** (from `Read Me!.txt`):
  > Ripped & Sorted By Exabyte U.
  > Midi names are courtesy of various YT Channels and sites.
  > No credit is needed, just don't claim as your own.
- **Source URL**: _unknown — TODO_. Likely Exabyte U's YouTube channel or a Mediafire link in a video description.
- **Use case**: not loaded by the synth (per-instrument SF2s aren't SoundFont banks in the GM sense). Useful as ground-truth sample isolations for A/B-testing what each FRLG instrument actually sounds like, and as MIDI source material for the lab.

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

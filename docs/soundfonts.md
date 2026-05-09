# Soundfonts

Inventory of every SF2 referenced by HexHive's MIDI playback — production `/sounds/[slug]` (`SoundPlayer.svelte`) and the `/sounds/midi-lab` page. SF2 binaries are **not** checked into the repo; they live in the Cloudflare R2 bucket served at `cdn.hexhive.app/soundfonts/`.

Hashes are recorded so we can detect duplicates across mirrors, verify uploads, and identify a soundfont when a third-party redistributes it under a different filename.

## Hosted on `cdn.hexhive.app/soundfonts/`

### Pokemon-FireRed-LeafGreen-VGK.sf2 — 7,329,446 bytes (7.0 MB)
- **R2 key**: `soundfonts/Pokemon-FireRed-LeafGreen-VGK.sf2`
- **Used by**: midi-lab (hard-coded default); SoundPlayer dropdown "FireRed/LeafGreen (VGK)" (default).
- **VGK** = "Voicegroup Kollection" — an SF2 stitched together from the FRLG sample/voicegroup data.
- **Original filename**: `Pokemon-FireRed-LeafGreen-VGK.sf2` (verbatim).
- **Source URL**: _unknown — TODO_ (found via Google "fire red soundfont gba").
- **sha256**: `c9430711e41a0a96293b64d0ef76061d77ca3d695d8d092ef705d023c3715ac1`
- **md5**: `c86d3bb9d008d963766ca6c6aa9a8afb`

### Pok_mon_GBA.sf2 — 924,998 bytes (904 KB)
- **R2 key**: `soundfonts/Pok_mon_GBA.sf2`
- **Used by**: SoundPlayer dropdown "Pokémon GBA (Mills)".
- **Original filename**: `Pok_mon_GBA.sf2` (the underscore is a Latin-1-mangled "é"; canonical title is "Pokémon GBA"). Filename style is musical-artifacts.com.
- **Source URL**: _unknown — TODO_ (likely musical-artifacts.com; verify and back-fill).
- **sha256**: `3f865e4c9261a2464cb4529b364e2ab84ccf208900d17ef7cd5d62750e00a1d3`
- **md5**: `575c22794ef35c55287949e1758cbc21`
- **Aliases by hash**: `~/Downloads/Pok_mon_GBA.sf2` is byte-identical (same file).

### GeneralUser-GS.sf2 — 32,322,864 bytes (30.8 MB)
- **R2 key**: `soundfonts/GeneralUser-GS.sf2`
- **Used by**: SoundPlayer dropdown "GeneralUser GS".
- **Provenance**: Christian Collins's _GeneralUser GS_ — widely-used GM/GS soundfont.
- **Original filename**: typically `GeneralUser GS v<version>.sf2`. We renamed for the URL.
- **Source URL**: https://schristiancollins.com/generaluser.php
- **sha256**: `c278464b823daf9c52106c0957f752817da0e52964817ff682fe3a8d2f8446ce`
- **md5**: `1cc160a92fadb6a43eb1695563524982`

## Pending upload (in `~/Downloads/`)

**Discovery chain**: Reddit thread → musical-artifacts.com → YouTube → Mediafire.

- Reddit OP that surfaced all three: https://www.reddit.com/r/PokemonRMXP/comments/14dctyr/i_want_to_compose_music_for_my_game_using_the_gen/
- Catalogue page: https://musical-artifacts.com/artifacts/579 (links the YouTube video under "More Info", which carries Mediafire URLs)
- YouTube video (description has the up-to-date Mediafire link): https://www.youtube.com/watch?v=USc2yLnBuRo

### Pokemon Emerald Soundfont (Updated August 29, 2025).sf2 — 59,574,844 bytes (57 MB)
- **Proposed R2 key**: `soundfonts/Pokemon-Emerald-Updated-2025-08-29.sf2`
- **Original filename (as downloaded)**: `Pokemon Emerald Soundfont (Updated August 29, 2025).sf2`
- **Direct download**: https://www.mediafire.com/file/ysbtegcf4tc6uxd/Pokemon_Emerald_Soundfont_%28Updated_April_20%2C_2021%29.sf2/file
- **Note**: Mediafire URL slug still says "April 20, 2021" but the file behind it was rotated; the YouTube description was updated 2026-08-29 (per `Last-Modified` on the local copy: 2026-05-09). Re-check by hash if re-fetched from Mediafire.
- **sha256**: `cee9f4507a7ac3ad13947442177c9da9d37bae3aa5924049f02c892e36466ae5`
- **md5**: `ae6e9105a9f72652da581d37a2b06b40`

### Pokemon_RSE_v2.0__Unofficial_Update_.sf2 — 37,144,280 bytes (36 MB)
- **Proposed R2 key**: `soundfonts/Pokemon-RSE-v2.0-unofficial.sf2`
- **Original filename (as downloaded)**: `Pokemon_RSE_v2.0__Unofficial_Update_.sf2`
- **Direct download**: https://musical-artifacts.com/artifacts/579/Pokemon_RSE_v2.0__Unofficial_Update_.sf2
- **Catalogue**: https://musical-artifacts.com/artifacts/579
- **sha256**: `f9e8c7b85f8bbd88e8c1f1c6d80356ecb81dd36e1542c999f0bee28fb2eb2ebc`
- **md5**: `fab54240c3cabecda719c43ba02df6b3`

### Pokemon Emerald Soundfont (Actual).sf2 — 25,903,042 bytes (25 MB)
- **Proposed R2 key**: `soundfonts/Pokemon-Emerald-Actual.sf2`
- **Original filename (as downloaded)**: `Pokemon Emerald Soundfont (Actual).sf2`
- **Direct download**: https://www.mediafire.com/file/d94xrp62alnaai2/Pokemon+Emerald+Soundfont+%28Actual%29.sf2
- **Catalogue**: https://musical-artifacts.com/artifacts/579 (linked under "More Info" / external).
- **sha256**: `252bb5c42cc28772c30280a8765dc3a0371601c604c56c2cb0845d195595b1c2`
- **md5**: `a48f652eba5f77275e89690c2800ace5`

## Upload commands

The R2 credentials for the public CDN bucket aren't in the local `.env` (it points to `hexhive-dev`). Run these against the CDN bucket — substitute your account id, access key, secret, and bucket name:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
ENDPOINT="https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
BUCKET="<cdn-bucket-name>"

aws --endpoint-url "$ENDPOINT" s3 cp \
  "$HOME/Downloads/Pokemon Emerald Soundfont (Updated August 29, 2025).sf2" \
  "s3://$BUCKET/soundfonts/Pokemon-Emerald-Updated-2025-08-29.sf2" \
  --content-type application/octet-stream

aws --endpoint-url "$ENDPOINT" s3 cp \
  "$HOME/Downloads/Pokemon_RSE_v2.0__Unofficial_Update_.sf2" \
  "s3://$BUCKET/soundfonts/Pokemon-RSE-v2.0-unofficial.sf2" \
  --content-type application/octet-stream

aws --endpoint-url "$ENDPOINT" s3 cp \
  "$HOME/Downloads/Pokemon Emerald Soundfont (Actual).sf2" \
  "s3://$BUCKET/soundfonts/Pokemon-Emerald-Actual.sf2" \
  --content-type application/octet-stream
```

Verify after upload:

```bash
for f in Pokemon-Emerald-Updated-2025-08-29 Pokemon-RSE-v2.0-unofficial Pokemon-Emerald-Actual; do
  curl -sS "https://cdn.hexhive.app/soundfonts/$f.sf2" | sha256sum
done
```

Expected sha256s match the values above.

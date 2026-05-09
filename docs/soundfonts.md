# Soundfonts

Inventory of every SF2 referenced by HexHive's MIDI playback — production `/sounds/[slug]` (`SoundPlayer.svelte`) and the `/sounds/midi-lab` page. SF2 binaries are **not** checked into the repo; they live in the Cloudflare R2 bucket `hexhive-prod` under the `soundfonts/` prefix, served at `https://cdn.hexhive.app/soundfonts/<file>` via the bucket's custom domain mapping.

Hashes are recorded so we can detect duplicates across mirrors, verify uploads, and identify a soundfont when a third-party redistributes it under a different filename. Originally-distributed filenames are preserved here even when the R2 key was renamed for URL hygiene.

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
- **Aliases by hash**: a local copy under `~/Downloads/PokeSoundfonts/` (the personal sort folder for unfetched downloads) is byte-identical (same file).

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

## Uploading new soundfonts

The CDN bucket is **`hexhive-prod`** (Cloudflare R2, custom-domain mapped to `cdn.hexhive.app`). The R2 credentials live in Railway production env vars (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`), which the linked `railway` CLI can read directly. R2 is S3-compatible — use the AWS CLI with `--endpoint-url` and `region=auto`:

```bash
# Pull live creds from Railway production
eval "$(railway variables --kv 2>/dev/null \
  | awk -F= '/^R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY|ACCOUNT_ID)=/{print "export "$0}')"

export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=auto
ENDPOINT="https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"

# Upload
aws --endpoint-url "$ENDPOINT" s3 cp \
  "/path/to/local/Whatever.sf2" \
  "s3://hexhive-prod/soundfonts/Whatever.sf2" \
  --content-type application/octet-stream

# Verify (sha256 of the served object)
curl -sS "https://cdn.hexhive.app/soundfonts/Whatever.sf2" | sha256sum
```

Then add a section to this file with the file's hashes, original filename, source URL(s), and discovery chain. If the new SF2 should appear in the in-app soundfont dropdown, edit `SOUNDFONTS` in `src/lib/components/listings/sound/SoundPlayer.svelte`.

## How the bucket is wired

- Cloudflare R2 bucket `hexhive-prod` (account `8221f737e4a1c585b1bccde05a0ec790`).
- Custom domain `cdn.hexhive.app` is mapped to the bucket via Cloudflare DNS — every key under any prefix is served at `https://cdn.hexhive.app/<key>`.
- The `soundfonts/` prefix is a convention for static, public-by-design assets; uploaded listing files (sprites, sounds, scripts, romhacks) live under `listings/<listingId>/<versionId>/<filename>` from the upload-flow code in `src/lib/storage/r2.ts`.
- The bucket also has a `pub-…r2.dev` public-bucket URL but we don't use it; everything goes through `cdn.hexhive.app` so we keep CORS/headers control.

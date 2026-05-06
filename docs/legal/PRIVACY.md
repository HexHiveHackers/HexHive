# HexHive Privacy

Last updated: 2026-05-06

HexHive is an independent fan-made hub for Pokémon ROM-hack assets — patches, sprites, sounds, and scripts. This page explains what information we hold about you, what we use it for, what we don't do with it, and how you can take it back. It's not legal advice.

## In short

- We try to keep as little about you as we reasonably can.
- We don't sell your data, run advertising, build behavioural profiles, or feed your content into machine-learning training.
- If you delete your account, we delete your profile, listings, and uploads.

## What we keep about you

### If you only browse and download

You don't need an account to look at HexHive or to download files. While you do, the only HexHive-specific data we hold is per-download bookkeeping: which listing was downloaded and when. That's how the public download counter on each listing works.

Separately, our infrastructure providers automatically log routine technical metadata for every HTTP request (IP address, user-agent, request path, response status). We use those logs only for security, abuse detection, and debugging. They are kept for a short rolling window — typically 30 to 90 days — and then rotated.

### If you sign in

HexHive uses third-party identity providers (Google, GitHub, or Discord) and / or WebAuthn passkeys. The first time you sign in we receive from the provider, and store, a stable account identifier, your email address, and the display name and avatar URL the provider gives us. We never see, receive, or store the password you use with the provider. If you register a passkey we store the public-key credential only — never your private key, biometric data, or device-side secrets.

### If you set up a profile

You can pick a HexHive **username**, write a short **bio**, and upload an **avatar**. This information is public — it appears on your profile page, on listings you publish, and in any comments you post.

### If you upload content

When you publish a listing we keep the files you upload (patches, sprites, audio, scripts), the metadata you fill in (titles, descriptions, tags, base-ROM identification, version notes), and any cover images. Published listings are public.

### If you report something

When you submit a moderation report — anonymously or signed in — we keep the report contents and, if you were signed in, the link between the report and your account. We use this to triage and respond.

## What we use it for

| What we hold | Why |
|---|---|
| Per-download counters | So each listing's download number is accurate and resistant to abuse. |
| Account identifier, email, provider-supplied profile fields | So you can sign in and so we can reach you about account or moderation events. |
| HexHive username, bio, avatar | So you have a public identity on listings and comments. |
| Files and listing metadata you upload | So they can be browsed and downloaded by other users. |
| Moderation reports | So we can act on them and follow up. |
| Infrastructure logs | Operational security, abuse prevention, debugging. |

## What we don't do

- No advertising or advertising cookies.
- No third-party analytics or tracking pixels.
- No selling, renting, or trading your personal data.
- No use of your content to train machine-learning models.
- No building behavioural profiles for any purpose.

## Where the data lives

HexHive is a small project running on third-party infrastructure. The following providers process data on our behalf:

- **Cloudflare R2** — object storage for uploaded files.
- **Turso (libSQL)** — application database (accounts, profiles, listings, moderation, comments).
- **Your chosen sign-in provider** (Google, GitHub, or Discord) — only at sign-in time, only to verify your identity.
- **Transactional email provider**, when configured — only for account-related security and service emails.

These providers may operate outside your country of residence, including in the United States.

## Cookies and local storage

We set a single **session cookie** after you sign in, issued by our authentication library, so you stay signed in between visits. It's HTTP-only and used only for authentication. We do not use any other cookies.

We may use the browser's **localStorage** on your own device to remember in-progress upload drafts so you don't lose them on refresh. That data stays in your browser; we never read it from the server.

## Your controls

While signed in, you can:

- View and edit your profile from your **Account settings**.
- Edit, take down, or fully delete any listing you own.
- **Delete your account** from Account settings. Doing so removes your profile, your listings, your uploaded files, and your moderation reports. Routine backups may still contain echoes for a short time before being overwritten on normal rotation.
- Sign out at any time.

If you'd like a copy of the data we hold about you, or you'd like us to correct or erase something, open an issue or message us through the project's [GitHub issues](https://github.com/jmynes/hexhive/issues).

## Children

HexHive is not directed to children under 13. We don't knowingly collect personal information from children. If you believe a child has created an account, please tell us and we'll remove it.

## How we look after the data

- HTTPS / TLS for everything in transit.
- No plaintext passwords on our servers — sign-in is OAuth or a passkey.
- HTTP-only signed session cookies.
- Least-privilege service credentials and restricted database access.
- Server-side validation of every uploaded file's type and size, with SVG uploads explicitly blocked to mitigate XSS.
- Periodic review of dependencies and access permissions.

No internet service is perfectly secure, and we can't promise otherwise.

## When this changes

Privacy practices for a small project change as the project itself changes. We'll update the date at the top whenever we revise this page, and we'll surface a notice on the site for material changes.

## Reaching us

For privacy questions or anything else covered above: project's [GitHub issues](https://github.com/jmynes/hexhive/issues).

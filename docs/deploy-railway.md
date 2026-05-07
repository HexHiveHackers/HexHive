# Deploying HexHive to Railway

HexHive runs as a single Bun service on Railway. Two long-lived
environments, **staging** and **production**, are defined in
`railway.toml`; they share build/start commands and differ only in the
service variables you set in the Railway dashboard.

This guide assumes you have a Railway account, the `railway` CLI
installed (`bun x @railway/cli` or `npm i -g @railway/cli`), and a
GitHub remote at `git@github.com:hexhivemind/HexHive`.

## 1. Create the Railway project

In the Railway dashboard:

1. **New Project → Deploy from GitHub repo →** pick `hexhivemind/HexHive`.
2. Rename the auto-created environment to `production`.
3. **Settings → Environments → New Environment →** name it `staging`,
   tracking the `staging` branch (create the branch first if it doesn't
   exist).

Railway will auto-detect `railway.toml` and use Nixpacks with Bun.

## 2. Provision external services

HexHive's data lives outside Railway. Create one set per environment:

| Service          | Production resource | Staging resource    |
|------------------|---------------------|---------------------|
| Turso (libSQL)   | `hexhive-prod`      | `hexhive-staging`   |
| Cloudflare R2    | `hexhive-prod`      | `hexhive-staging`   |
| OAuth clients    | one per provider, redirect URIs include the prod URL | same, redirect URIs include the staging URL |

Run `bun run db:migrate` against each Turso DB once before the first
deploy (locally, with `DATABASE_URL` pointed at the Turso URL).

## 3. Set service variables

In Railway → your service → **Variables**, set for **both** environments
(values differ per env):

```
DATABASE_URL=libsql://...turso.io
DATABASE_AUTH_TOKEN=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=hexhive-{prod|staging}
R2_PUBLIC_BASE_URL=https://...r2.dev   # or your custom CDN
BETTER_AUTH_SECRET=<32-byte random>
BETTER_AUTH_URL=https://<your-domain>  # must match the domain users hit
GOOGLE_CLIENT_ID=...                   # omit any provider you aren't using
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

`PORT` is provided by Railway automatically — `svelte-adapter-bun` reads
it. Don't set it yourself.

## 4. Domains

- Each environment gets a free `*.up.railway.app` subdomain. Use those
  while testing.
- When ready, attach a custom domain (e.g. `hexhive.app` to production,
  `staging.hexhive.app` to staging) under **Settings → Domains**.
- After attaching a domain, update `BETTER_AUTH_URL` for that
  environment, and add the new URL as an authorized redirect in each
  OAuth provider's console.

## 5. Deploy

Push to `main` → production deploys. Push to `staging` → staging
deploys. The first deploy takes a few minutes (Bun + dep install +
SvelteKit build); subsequent deploys reuse the Nixpacks layer cache.

Tail logs with `railway logs --environment production` (or `staging`).

## Notes

- HexHive's local dev R2 fallback writes to `.dev-storage/` on disk.
  Railway's filesystem is ephemeral across redeploys, so the real R2
  vars **must** be set before the first deploy — otherwise uploads land
  on disk and disappear at the next restart.
- The build runs `bun install --frozen-lockfile`, so `bun.lock` must be
  committed and current (it is). Forgetting to commit a lockfile change
  is the most common cause of a Nixpacks failure.
- Migrations are not run automatically. After a schema change: locally,
  `DATABASE_URL=<turso-url> bun run db:migrate` against staging first,
  then production.

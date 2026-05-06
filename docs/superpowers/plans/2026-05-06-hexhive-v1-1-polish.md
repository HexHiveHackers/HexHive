# HexHive v1.1 Polish — Tech Debt + Post-v1 Niceties

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the v1 tech-debt list and ship the smaller deferred features — avatars, OG/SEO, mature filter, e2e smoke, vite workaround removal — without expanding into the larger post-v1 surface (comments, ratings, deployment, full FTS rewrite). Those each warrant their own plan.

**Architecture:** Mostly additive. The only structural changes are a new R2 key prefix for avatars and an attempt to drop the `excludeNodeModulesSvelteStyles` Vite plugin once bits-ui / Tailwind upgrades make it unnecessary.

**Tech stack:** Same as v1. Adds Playwright for browser-level e2e.

**Starting tag:** `v1-complete`.

**Working dir:** `/home/user/Projects/hexhive`. Don't push until the user instructs.

---

## Scope

In scope:
1. Audit + (try to) drop the bits-ui v2 / Tailwind v4 vite workaround.
2. Avatar uploads (R2-backed) wired to profile pages.
3. Mature-content filter on list pages (default: hide).
4. Per-listing OpenGraph metadata.
5. Sitemap + `robots.txt`.
6. Playwright e2e: scaffold + two golden-path smokes.
7. README polish + tag `v1.1-complete`.

Out of scope (each gets its own plan):
- Comments (schema + UI + moderation tie-in).
- Ratings (1–5 stars per listing, aggregate display).
- FTS performance / fuzzy / typo tolerance.
- Slate → zinc cosmetic palette swap (revisit when there's a design pass).
- Production deployment (env wiring, real OAuth keys, host config).

---

## File structure (created/modified)

```
src/
  lib/
    components/
      profile/
        AvatarUpload.svelte           # NEW: file picker + presign+PUT for avatar
        Avatar.svelte                 # NEW: renders /api/avatars/<key> or fallback initial
      listings/
        MatureFilterToggle.svelte     # NEW
    server/
      avatars.ts                      # NEW: presign, set, get URL helpers
      avatars.test.ts
      seo.ts                          # NEW: buildOgMeta(listing, type)
      seo.test.ts
      sitemap.ts                      # NEW: emitSitemap()
      sitemap.test.ts
  routes/
    api/avatars/
      presign/+server.ts              # POST: presigned PUT for avatar
      [key]/+server.ts                # GET: 303 to signed-GET URL
    sitemap.xml/+server.ts
    robots.txt/+server.ts
    romhacks/+page.server.ts          # MODIFY: read mature filter from query
    sprites/+page.server.ts           # same
    sounds/+page.server.ts            # same
    scripts/+page.server.ts           # same
    romhacks/[slug]/+page.svelte      # MODIFY: <svelte:head> OG meta
    sprites/[slug]/+page.svelte       # same
    sounds/[slug]/+page.svelte        # same
    scripts/[slug]/+page.svelte       # same
    me/+page.svelte                   # MODIFY: AvatarUpload section
    u/[username]/+page.svelte         # MODIFY: render Avatar in summary
  static/
    og-default.png                    # placeholder (a 1200x630 PNG with HEXHIVE branding)
e2e/
  playwright.config.ts
  global-setup.ts
  fixtures/
    seed.ts
  tests/
    home.spec.ts
    auth-redirect.spec.ts
package.json                          # MODIFY: add e2e scripts + @playwright/test devDep
```

---

## Conventions (carry over)

- Use Bun. Don't push.
- Commit:
  ```
  git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit -m "<subject>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  ```
- `bun run check` (0 errors) and `bun run test` (all green) before commit.
- Don't break the bits-ui workaround until you've replaced it (see Task 1).

---

### Task 1: Audit + try to drop the bits-ui / Tailwind v4 vite workaround

**Files:** Investigate `vite.config.ts`, `package.json`. Possibly modify both.

The `excludeNodeModulesSvelteStyles` plugin in `vite.config.ts` was added because `@tailwindcss/vite` tried to parse bits-ui virtual style modules as CSS. If newer versions of either fix the issue, we can drop it.

- [ ] **Step 1: Check current versions**

```bash
cd /home/user/Projects/hexhive
bun pm ls 2>&1 | grep -E "tailwindcss|bits-ui|@tailwindcss/vite|@sveltejs/vite-plugin-svelte"
```

Note the installed versions.

- [ ] **Step 2: Check upstream for relevant releases**

Search the GitHub issues / changelogs for:
- `https://github.com/tailwindlabs/tailwindcss/issues` — keyword "svelte virtual style"
- `https://github.com/huntabyte/bits-ui` — recent releases since the version we have

If a release notes a fix, attempt the upgrade in Step 3. If nothing relevant, skip to Step 5 (document).

- [ ] **Step 3: Upgrade attempt (only if upstream fix indicated)**

```bash
bun add @tailwindcss/vite@latest tailwindcss@latest bits-ui@latest
```

Then in a separate change:

```bash
# Remove the workaround plugin from vite.config.ts:
#   - drop the excludeNodeModulesSvelteStyles function and import { Plugin }
#   - revert the plugins array to: [tailwindcss(), sveltekit()]
```

- [ ] **Step 4: Validate**

```bash
bun run check
bun run test
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "GET /login HTTP %{http_code}\n" http://localhost:5173/login
curl -s -o /dev/null -w "GET / HTTP %{http_code}\n" http://localhost:5173/
pkill -f 'vite dev'
```

If both return 200 and the dev log shows no parse errors, the workaround can be dropped — commit. If anything errors, ROLL BACK (`git checkout vite.config.ts package.json bun.lock`) and proceed to Step 5.

- [ ] **Step 5: Document if still needed**

If the workaround can't be removed, add a `WORKAROUND.md` (or append to `CLAUDE.md` "Known issues") noting:
- The exact bits-ui + tailwindcss + @tailwindcss/vite versions that still need it.
- A link to whichever upstream issue tracks the fix.
- The exact symptom (e.g., "select-viewport.svelte's `<style>` block is intercepted as CSS").

- [ ] **Step 6: Commit**

If the workaround was removed:
```bash
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "chore(vite): drop bits-ui/Tailwind workaround after upstream fix" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

If documented only:
```bash
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "docs: document bits-ui + Tailwind v4 vite plugin workaround" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Avatar uploads — server side

**Files:** Create `src/lib/server/avatars.ts`, `src/lib/server/avatars.test.ts`, `src/routes/api/avatars/presign/+server.ts`, `src/routes/api/avatars/[key]/+server.ts`.

R2 keys for avatars live under `avatars/{userId}/{nanoid}.{ext}`. The `profile.avatarKey` column already exists; this task just wires it.

- [ ] **Step 1: `src/lib/server/avatars.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { presignPut } from '$lib/storage/r2';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;
const MAX_SIZE = 2 * 1024 * 1024;  // 2 MB

export type AvatarPresignInput = {
  userId: string;
  contentType: string;
  size: number;
  filename: string;
};

export async function presignAvatarUpload(
  input: AvatarPresignInput
): Promise<{ key: string; url: string }> {
  if (input.size > MAX_SIZE) throw new Error('Avatar must be under 2 MB');
  const ext = (input.filename.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext as typeof ALLOWED_EXT[number])) {
    throw new Error(`Unsupported avatar type .${ext}`);
  }
  const key = `avatars/${input.userId}/${newId(12)}.${ext}`;
  const url = await presignPut(key, input.contentType, input.size);
  return { key, url };
}

export async function setAvatarKey(db: DB, userId: string, key: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ avatarKey: key, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

export async function clearAvatar(db: DB, userId: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ avatarKey: null, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}
```

- [ ] **Step 2: Test — `src/lib/server/avatars.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(async (key: string) => `https://get.example/${key}`),
  headObject: vi.fn(async () => ({}))
}));

beforeEach(() => vi.clearAllMocks());

describe('presignAvatarUpload', () => {
  it('rejects too-large files', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    await expect(presignAvatarUpload({
      userId: 'u1', contentType: 'image/png', size: 10_000_000, filename: 'a.png'
    })).rejects.toThrow(/2 MB/);
  });

  it('rejects unsupported extensions', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    await expect(presignAvatarUpload({
      userId: 'u1', contentType: 'image/svg+xml', size: 100, filename: 'a.svg'
    })).rejects.toThrow(/Unsupported/);
  });

  it('returns key under avatars/{userId}/ and a URL', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    const { key, url } = await presignAvatarUpload({
      userId: 'u1', contentType: 'image/png', size: 1000, filename: 'me.png'
    });
    expect(key).toMatch(/^avatars\/u1\/[a-z0-9]+\.png$/);
    expect(url).toContain('put.example');
  });
});
```

- [ ] **Step 3: Presign endpoint — `src/routes/api/avatars/presign/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { presignAvatarUpload } from '$lib/server/avatars';

const Body = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive()
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body;
  try { body = Body.parse(await event.request.json()); }
  catch { throw error(400, 'Invalid request body'); }

  try {
    const { key, url } = await presignAvatarUpload({ userId: user.id, ...body });
    return json({ key, url });
  } catch (e) {
    throw error(400, (e as Error).message);
  }
};
```

- [ ] **Step 4: Avatar GET redirect — `src/routes/api/avatars/[key]/+server.ts`**

The `[key]` param is the path-after-`/api/avatars/` (everything inside `avatars/...`). Because R2 keys contain slashes, use a `[...rest]` catch-all.

Actually create `src/routes/api/avatars/[...rest]/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { presignGet } from '$lib/storage/r2';

export const GET: RequestHandler = async ({ params }) => {
  const key = `avatars/${params.rest}`;
  const url = await presignGet(key, 60 * 30);  // 30 min cacheable
  throw redirect(303, url);
};
```

- [ ] **Step 5: Wire `setAvatarKey` to `PATCH /api/profile`**

In `src/routes/api/profile/+server.ts`, extend the body schema to accept `avatarKey` and call `setAvatarKey` when present:

```ts
const Body = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(2000).optional(),
  avatarKey: z.string().min(1).max(200).nullable().optional()
});

// after username/bio handling:
if (body.avatarKey !== undefined) {
  if (body.avatarKey === null) await clearAvatar(db, user.id);
  else await setAvatarKey(db, user.id, body.avatarKey);
}
```

(Add `import { setAvatarKey, clearAvatar } from '$lib/server/avatars'`.)

- [ ] **Step 6: Run + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(avatars): R2 presign + GET redirect + profile.avatarKey wiring" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Avatar UI

**Files:** Create `src/lib/components/profile/Avatar.svelte`, `src/lib/components/profile/AvatarUpload.svelte`. Modify `src/routes/me/+page.server.ts`, `src/routes/me/+page.svelte`, `src/routes/u/[username]/+page.server.ts`, `src/routes/u/[username]/+page.svelte`.

- [ ] **Step 1: Avatar component**

```svelte
<script lang="ts">
  let { avatarKey, name, size = 48 }: {
    avatarKey: string | null;
    name: string;
    size?: number;
  } = $props();

  const initial = (name || '?').trim().charAt(0).toUpperCase();
</script>

{#if avatarKey}
  <img src={`/api/avatars/${avatarKey.replace(/^avatars\//, '')}`}
       alt={name}
       width={size} height={size}
       class="rounded-full object-cover bg-muted"
       loading="lazy" />
{:else}
  <span class="rounded-full bg-muted text-muted-foreground inline-grid place-items-center font-display"
        style={`width: ${size}px; height: ${size}px; font-size: ${size / 2.5}px;`}>
    {initial}
  </span>
{/if}
```

- [ ] **Step 2: AvatarUpload component**

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { invalidateAll } from '$app/navigation';
  import Avatar from './Avatar.svelte';

  let { avatarKey, name }: { avatarKey: string | null; name: string } = $props();
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function pick() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/gif,image/webp';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      busy = true; err = null;
      try {
        const presignRes = await fetch('/api/avatars/presign', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size })
        });
        if (!presignRes.ok) throw new Error(await presignRes.text());
        const { key, url } = await presignRes.json();

        const putRes = await fetch(url, { method: 'PUT', headers: { 'content-type': f.type }, body: f });
        if (!putRes.ok) throw new Error('Upload to storage failed');

        const patchRes = await fetch('/api/profile', {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ avatarKey: key })
        });
        if (!patchRes.ok) throw new Error(await patchRes.text());
        await invalidateAll();
      } catch (e: unknown) { err = (e as Error).message; }
      finally { busy = false; }
    };
    inp.click();
  }

  async function clear() {
    busy = true; err = null;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatarKey: null })
      });
      if (!res.ok) throw new Error(await res.text());
      await invalidateAll();
    } catch (e: unknown) { err = (e as Error).message; }
    finally { busy = false; }
  }
</script>

<div class="flex items-center gap-4">
  <Avatar {avatarKey} {name} size={64} />
  <div class="flex flex-col gap-1">
    <div class="flex gap-2">
      <Button size="sm" variant="outline" onclick={pick} disabled={busy}>{busy ? 'Uploading…' : 'Change'}</Button>
      {#if avatarKey}
        <Button size="sm" variant="ghost" onclick={clear} disabled={busy}>Remove</Button>
      {/if}
    </div>
    {#if err}<p class="text-xs text-destructive">{err}</p>{/if}
    <p class="text-xs text-muted-foreground">PNG / JPEG / GIF / WebP, ≤ 2 MB.</p>
  </div>
</div>
```

- [ ] **Step 3: `/me` page**

Update `src/routes/me/+page.server.ts` so `data.profile` includes `avatarKey` and the user's `name`. Then in `src/routes/me/+page.svelte`, render `<AvatarUpload avatarKey={data.profile.avatarKey} name={data.profile.name} />` above the existing `<ProfileForm />`.

- [ ] **Step 4: `/u/[username]` page**

`src/routes/u/[username]/+page.svelte`'s `<ProfileSummary />` should render an `<Avatar />` next to the heading. Update `ProfileSummary` to accept and render `avatarKey`. Update the load function to pass it through.

- [ ] **Step 5: Smoke + commit**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -sI http://localhost:5173/me | head -2
curl -s -o /dev/null -w "GET /u/none HTTP %{http_code}\n" http://localhost:5173/u/none
pkill -f 'vite dev'
```

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(avatars): UI on /me + Avatar in /u/[username] summary" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Mature filter on list pages

**Files:** Create `src/lib/components/listings/MatureFilterToggle.svelte`. Modify `listRomhacks` and `listAssetHives` to accept `includeMature: boolean`. Modify the four `+page.server.ts` and `+page.svelte` list pages.

Default behavior: hide mature listings unless `?mature=show` is in the URL.

- [ ] **Step 1: Modify `listRomhacks` and `listAssetHives` in `src/lib/server/listings.ts`**

Add `includeMature?: boolean` to the `filters` argument of both functions. Default `false`. When `false`, append `eq(schema.listing.mature, false)` to the WHERE clauses.

- [ ] **Step 2: MatureFilterToggle**

```svelte
<script lang="ts">
  let { showing }: { showing: boolean } = $props();
  // toggling re-submits the form via the parent <form>
</script>

<label class="flex items-center gap-2 text-sm text-muted-foreground">
  <input type="checkbox" name="mature" value="show" checked={showing}
         onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.submit()} />
  Show mature
</label>
```

- [ ] **Step 3: Update each list page's server load + template**

`src/routes/romhacks/+page.server.ts`:

```ts
const includeMature = url.searchParams.get('mature') === 'show';
const items = await listRomhacks(db, { baseRom, q, includeMature, limit: 60 });
return { items, filters: { baseRom: baseRom ?? null, q: q ?? null, mature: includeMature } };
```

`src/routes/romhacks/+page.svelte` — add `<MatureFilterToggle showing={data.filters.mature} />` inside the existing filter `<form>`.

Repeat for `/sprites`, `/sounds`, `/scripts`.

- [ ] **Step 4: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(listings): hide mature by default, ?mature=show toggle" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Per-listing OG metadata

**Files:** Create `src/lib/server/seo.ts`, `src/lib/server/seo.test.ts`. Modify the four detail pages to render `<svelte:head>` OG tags from server-loaded data. Add `static/og-default.png` placeholder.

- [ ] **Step 1: SEO helper — `src/lib/server/seo.ts`**

```ts
import type { ListingType } from '$lib/db/schema';

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  type: 'article';
}

export function buildOgMeta(args: {
  origin: string;
  listingType: ListingType;
  slug: string;
  title: string;
  description: string;
}): OgMeta {
  const route = args.listingType === 'romhack' ? 'romhacks' : `${args.listingType}s`;
  return {
    title: `${args.title} — HexHive`,
    description: (args.description || 'Pokemon ROM hack asset on HexHive').slice(0, 280),
    url: `${args.origin}/${route}/${args.slug}`,
    image: `${args.origin}/og-default.png`,
    type: 'article'
  };
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

- [ ] **Step 2: Tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildOgMeta, escapeAttr } from './seo';

describe('buildOgMeta', () => {
  it('points romhack at /romhacks/', () => {
    const m = buildOgMeta({
      origin: 'https://hexhive.example', listingType: 'romhack', slug: 'kaizo', title: 'Kaizo', description: 'hard'
    });
    expect(m.url).toBe('https://hexhive.example/romhacks/kaizo');
    expect(m.title).toBe('Kaizo — HexHive');
  });
  it('plurals asset-hives correctly', () => {
    expect(buildOgMeta({ origin: 'h', listingType: 'sprite', slug: 's', title: 't', description: '' }).url).toBe('h/sprites/s');
    expect(buildOgMeta({ origin: 'h', listingType: 'sound', slug: 's', title: 't', description: '' }).url).toBe('h/sounds/s');
    expect(buildOgMeta({ origin: 'h', listingType: 'script', slug: 's', title: 't', description: '' }).url).toBe('h/scripts/s');
  });
  it('truncates long descriptions', () => {
    const long = 'x'.repeat(500);
    const m = buildOgMeta({ origin: 'h', listingType: 'romhack', slug: 's', title: 't', description: long });
    expect(m.description.length).toBe(280);
  });
  it('uses fallback description when empty', () => {
    const m = buildOgMeta({ origin: 'h', listingType: 'romhack', slug: 's', title: 't', description: '' });
    expect(m.description).toContain('HexHive');
  });
});

describe('escapeAttr', () => {
  it('escapes ampersand, quotes, angle brackets', () => {
    expect(escapeAttr(`<a "x" & 'y'>`)).toBe('&lt;a &quot;x&quot; &amp; &#39;y&#39;&gt;');
  });
});
```

- [ ] **Step 3: Wire to detail pages**

In each of the four detail pages' `+page.server.ts`, also return `og` from the load:

```ts
import { buildOgMeta } from '$lib/server/seo';
// ...inside load:
const og = buildOgMeta({
  origin: url.origin,
  listingType: detail.listing.type,
  slug: detail.listing.slug,
  title: detail.listing.title,
  description: detail.listing.description
});
return { detail, og };
```

In each detail `+page.svelte`, near the top:

```svelte
<svelte:head>
  <title>{data.og.title}</title>
  <meta name="description" content={data.og.description} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.og.title} />
  <meta property="og:description" content={data.og.description} />
  <meta property="og:url" content={data.og.url} />
  <meta property="og:image" content={data.og.image} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
```

(SvelteKit auto-escapes attribute values, so `escapeAttr` is exported for any case where you'd build raw HTML elsewhere.)

- [ ] **Step 4: Add `static/og-default.png` placeholder**

Generate a 1200×630 PNG with the HEXHIVE wordmark. The simplest hands-off option: create a tiny solid-color PNG via `bun -e` or `node -e` using `sharp` or directly writing a PNG buffer. For v1.1 we just need the file to exist so OG validators don't 404.

```bash
# Quick way to make a 1200x630 black PNG with no extra deps:
bun -e '
  const fs = require("fs");
  const w = 1200, h = 630;
  // Use a tiny pre-encoded 1x1 PNG and resize via the OG validator at the consumer end.
  // Simpler: write a 1x1 transparent PNG and rely on og:image dimensions hint via a meta:width/height tag.
  const pngBytes = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100", "hex");
  fs.writeFileSync("static/og-default.png", pngBytes);
'
```

(That 1×1 placeholder is fine for v1.1 — replace with a designed image later.)

- [ ] **Step 5: Run + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(seo): per-listing OG metadata + default OG image" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Sitemap + robots.txt

**Files:** Create `src/routes/sitemap.xml/+server.ts`, `src/routes/robots.txt/+server.ts`. Optionally add `src/lib/server/sitemap.ts` if there's enough logic to factor out.

- [ ] **Step 1: `src/routes/robots.txt/+server.ts`**

```ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /me
Disallow: /api/

Sitemap: ${url.origin}/sitemap.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
};
```

- [ ] **Step 2: `src/routes/sitemap.xml/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { listRomhacks, listAssetHives } from '$lib/server/listings';

export const GET: RequestHandler = async ({ url }) => {
  const [romhacks, sprites, sounds, scripts] = await Promise.all([
    listRomhacks(db, { limit: 5000, includeMature: true }),
    listAssetHives(db, 'sprite', { limit: 5000 }),
    listAssetHives(db, 'sound', { limit: 5000 }),
    listAssetHives(db, 'script', { limit: 5000 })
  ]);

  const u = (path: string) => `${url.origin}${path}`;
  const entries: string[] = [
    `  <url><loc>${u('/')}</loc></url>`,
    ...['/romhacks', '/sprites', '/sounds', '/scripts'].map((p) => `  <url><loc>${u(p)}</loc></url>`),
    ...romhacks.map((r) => `  <url><loc>${u(`/romhacks/${r.slug}`)}</loc></url>`),
    ...sprites.map((r) => `  <url><loc>${u(`/sprites/${r.slug}`)}</loc></url>`),
    ...sounds.map((r) => `  <url><loc>${u(`/sounds/${r.slug}`)}</loc></url>`),
    ...scripts.map((r) => `  <url><loc>${u(`/scripts/${r.slug}`)}</loc></url>`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
```

> Note: `listAssetHives` doesn't currently accept `includeMature`. After Task 4 lands, you can pass it explicitly. For sitemap purposes the default (`includeMature: false`) is correct — we don't want to expose mature URLs for indexing.

- [ ] **Step 3: Smoke**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -sI http://localhost:5173/robots.txt | head -2
curl -sI http://localhost:5173/sitemap.xml | head -2
pkill -f 'vite dev'
```

Expected: both `200`. Both content types correct.

- [ ] **Step 4: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(seo): sitemap.xml and robots.txt routes" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Playwright e2e — scaffold + two smokes

**Files:** Create `e2e/playwright.config.ts`, `e2e/global-setup.ts`, `e2e/fixtures/seed.ts`, `e2e/tests/home.spec.ts`, `e2e/tests/auth-redirect.spec.ts`. Modify `package.json` for scripts.

- [ ] **Step 1: Install Playwright**

```bash
cd /home/user/Projects/hexhive
bun add -D @playwright/test
bun x playwright install chromium
```

- [ ] **Step 2: Config — `e2e/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'bun run build && bun run preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure'
  }
});
```

- [ ] **Step 3: Tests**

`e2e/tests/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('home page loads with hero and four sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'HEXHIVE' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Romhacks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sprites' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sounds' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scripts' })).toBeVisible();
});
```

`e2e/tests/auth-redirect.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('upload page redirects to /login when unauthenticated', async ({ page }) => {
  const response = await page.goto('/upload/romhack');
  expect(response?.status()).toBe(200);  // followed redirect to /login
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test:e2e": "playwright test --config e2e/playwright.config.ts",
    "test:e2e:ui": "playwright test --config e2e/playwright.config.ts --ui"
  }
}
```

- [ ] **Step 5: Run e2e once**

```bash
bun run test:e2e
```

This builds + previews + runs Playwright. Expect both tests pass.

- [ ] **Step 6: Update .gitignore**

Append to `.gitignore`:

```
# Playwright
/e2e/test-results/
/e2e/playwright-report/
/e2e/.auth/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "test(e2e): add Playwright with home + auth-redirect smokes" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: README polish + final tag

**Files:** Modify `README.md`. Tag.

- [ ] **Step 1: Replace the boilerplate `README.md` with a real one**

Cover:
- One-line description.
- Feature checklist (the bulleted v1 summary from the post-Plan-4 message in the conversation).
- Stack list.
- Quickstart: `bun install`, `cp .env.example .env`, `bun run db:migrate`, `bun run dev`.
- Test commands: `bun run check`, `bun run test`, `bun run test:e2e`.
- Project structure (a short tree).
- Pointer to `CLAUDE.md` for development conventions.
- Link to plans under `docs/superpowers/plans/` for the implementation history.

Use prose; no marketing fluff. Mirror the tone of CLAUDE.md.

- [ ] **Step 2: Final check + tag + commit**

```bash
bun run check
bun run test
bun run test:e2e
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "docs: replace boilerplate README with project overview" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git tag v1.1-complete
```

---

## Self-review

**Tech-debt coverage:**
- bits-ui / Tailwind v4 vite workaround → Task 1 (audit + remove or document) ✓
- Vitest browser conditions — left in place; documented in CLAUDE.md (no task needed; it's a deliberate config, not debt).
- shadcn-svelte slate → zinc — explicitly out of scope (cosmetic, deferred).
- FTS performance — explicitly out of scope (its own future plan).
- Avatar uploads → Tasks 2, 3 ✓
- e2e tests → Task 7 ✓

**Post-v1 (in scope) coverage:**
- Mature filter on lists → Task 4 ✓
- Sitemap + OG metadata → Tasks 5, 6 ✓
- README polish → Task 8 ✓

**Out-of-scope / future plans (called out in the plan):**
- Comments — schema + API + UI + moderation tie-in. Plan its own.
- Ratings — same.
- Production deployment — operational, not a code plan.

**Placeholders:** none. The OG default image is a deliberate 1×1 placeholder that can be swapped later without a code change.

**Type consistency:** `OgMeta`, `AvatarPresignInput`, the optional `includeMature` filter on list queries, and the new `avatarKey`/`name` props on `Avatar` and `ProfileSummary` are defined once and consumed at all call sites.

---

## What this plan does NOT cover (intentional, future plans)

- **Plan 6 — Comments + Ratings:** Adds a `comment` table, comment thread UI on detail pages, optional star ratings with aggregate display, and ties both into the existing moderation flow.
- **Plan 7 — Search performance:** FTS tokenizer tuning, optional trigram-based fuzzy matching, search analytics.
- **Plan 8 — Production deployment:** Real OAuth keys, Turso prod DB, R2 prod bucket, Fly.io / VPS deploy, monitoring.

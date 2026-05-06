# HexHive Plan 4: Profiles, Versioning, Search, Moderation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the v1 feature set: user profiles (`/u/[username]`, `/me`), per-listing versioning UI with re-upload, SQLite FTS5 full-text search across all asset types, moderation reporting + an admin review queue, and a mature-content surface treatment.

**Architecture:** Add a small `profile_setup` flow gating first sign-in. Detail pages grow a "Versions" panel and an author-only "Upload new version" action that funnels through a new `/api/listings/[id]/versions/presign` endpoint which mints a `listing_version` row instead of a fresh listing. Search uses an FTS5 shadow table maintained by triggers that mirror `listing.title` + `description`. Moderation reuses the existing `flag` table; an admin role check (`user.is_admin`) gates `/admin/*`.

**Tech stack:** No new packages. SQLite FTS5 ships with libSQL. Drizzle accesses it via raw SQL helpers.

**Starting tag:** `asset-hives-complete`.

**Working dir:** `/home/user/Projects/hexhive`. Don't push until the user instructs.

---

## File structure (created/modified)

```
src/
  lib/
    db/
      schema.ts                      # ADD: searches FTS table is created via raw migration, not Drizzle
    server/
      profiles.ts                    # NEW: getOrCreateProfile, ensureUsername, listingsByUser
      profiles.test.ts
      versions.ts                    # NEW: createNextVersion, listVersionsForListing
      versions.test.ts
      search.ts                      # NEW: searchListings(q, type?) over FTS5
      search.test.ts
      moderation.ts                  # NEW: createFlag, listOpenFlags, resolveFlag
      moderation.test.ts
      admin.ts                       # NEW: requireAdmin
    components/
      profile/
        ProfileForm.svelte
        ProfileSummary.svelte
      moderation/
        ReportButton.svelte
        FlagCard.svelte
      search/
        SearchBar.svelte
      listings/
        VersionTimeline.svelte
        MatureWrap.svelte             # blur overlay shown for mature listings
  routes:
    me/
      +page.server.ts                # load profile + drafts + my uploads
      +page.svelte                   # tabs: Profile / Drafts / My uploads
      setup/
        +page.server.ts              # gate when profile.username missing
        +page.svelte                 # username form
    u/[username]/
      +page.server.ts                # load profile + their published uploads
      +page.svelte
    search/
      +page.server.ts                # FTS query + filter by type
      +page.svelte
    admin/
      +layout.server.ts              # requireAdmin
      flags/
        +page.server.ts
        +page.svelte                 # queue
        [id]/
          +page.server.ts            # actions: dismiss, hide listing
          +page.svelte
    api/
      profile/+server.ts             # PATCH username/bio
      flags/+server.ts               # POST: create a report
      listings/[id]/versions/
        presign/+server.ts           # POST: presign for re-upload
        finalize/+server.ts          # POST: persist + flip is_current
    romhacks/[slug]/+page.svelte     # MODIFY: add VersionTimeline + ReportButton + author "new version" link
    sprites/[slug]/+page.svelte      # MODIFY: same additions
    sounds/[slug]/+page.svelte       # MODIFY: same additions
    scripts/[slug]/+page.svelte      # MODIFY: same additions
    +layout.svelte                   # MODIFY: header search bar
  hooks.server.ts                    # MODIFY: redirect signed-in users with no profile to /me/setup (when navigating to non-public routes)

drizzle/
  XXXX_fts_listings.sql              # NEW: hand-authored migration that creates listings_fts + triggers
```

---

## Conventions (carry over)

- Use Bun. Don't push.
- Commit:
  ```
  git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
    -m "<subject>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  ```
- Every commit must include the Co-Authored-By trailer.
- `bun run check` (0 errors) and `bun run test` (all green) before commit.

---

### Task 1: Profile data layer (server helpers)

**Files:** Create `src/lib/server/profiles.ts`, `src/lib/server/profiles.test.ts`.

Goal: a small helper module that produces a `Profile` row on demand, enforces username uniqueness (case-insensitive), and lists a user's listings (including drafts for self-views).

- [ ] **Step 1: Failing test — `src/lib/server/profiles.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '$lib/db/schema';
import {
  getOrCreateProfile,
  setUsername,
  setBio,
  getProfileByUsername,
  listingsByUser
} from './profiles';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'Alice', email: 'a@x.com' });
  await db.insert(schema.user).values({ id: 'u2', name: 'Bob', email: 'b@x.com' });
});

describe('profiles', () => {
  it('creates a profile with no username if missing', async () => {
    const p = await getOrCreateProfile(db, 'u1');
    expect(p.userId).toBe('u1');
    expect(p.username).toBe('');  // empty until user sets it
  });

  it('setUsername enforces case-insensitive uniqueness', async () => {
    await setUsername(db, 'u1', 'Alice');
    await expect(setUsername(db, 'u2', 'alice')).rejects.toThrow(/taken/i);
  });

  it('setUsername updates the row', async () => {
    await setUsername(db, 'u2', 'bob_42');
    const p = await getProfileByUsername(db, 'bob_42');
    expect(p?.userId).toBe('u2');
  });

  it('setBio persists', async () => {
    await setBio(db, 'u1', 'hello world');
    const p = await getOrCreateProfile(db, 'u1');
    expect(p.bio).toBe('hello world');
  });

  it('listingsByUser includes drafts only when self=true', async () => {
    // arrange: u1 publishes one romhack and drafts another
    const { createListingDraft, finalizeListing } = await import('./listings');
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: {
        title: 'Pub', description: '', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English', release: '1'
      }}
    });
    await finalizeListing(db, {
      type: 'romhack', listingId: a.listingId, versionId: a.versionId,
      files: [{ r2Key: 'x', filename: 'a.ips', originalFilename: 'a.ips', size: 1, hash: null }]
    });
    await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: {
        title: 'Draft', description: '', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English', release: '1'
      }}
    });

    const publicView = await listingsByUser(db, 'u1', { self: false });
    expect(publicView.map(l => l.title).sort()).toEqual(['Pub']);

    const selfView = await listingsByUser(db, 'u1', { self: true });
    expect(selfView.map(l => l.title).sort()).toEqual(['Draft', 'Pub']);
  });
});
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement — `src/lib/server/profiles.ts`**

```ts
import { and, eq, sql, desc } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import type { ListingType } from '$lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type Profile = typeof schema.profile.$inferSelect;

export async function getOrCreateProfile(db: DB, userId: string): Promise<Profile> {
  const rows = await db.select().from(schema.profile).where(eq(schema.profile.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(schema.profile).values({ userId, username: '', bio: null, avatarKey: null });
  const created = await db.select().from(schema.profile).where(eq(schema.profile.userId, userId)).limit(1);
  return created[0]!;
}

export async function getProfileByUsername(db: DB, username: string): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(schema.profile)
    .where(sql`lower(${schema.profile.username}) = lower(${username})`)
    .limit(1);
  return rows[0] ?? null;
}

export async function setUsername(db: DB, userId: string, username: string): Promise<void> {
  // Uniqueness is enforced by the unique-on-lower(username) index; a violating insert/update throws.
  try {
    await db
      .update(schema.profile)
      .set({ username, updatedAt: new Date() })
      .where(eq(schema.profile.userId, userId));
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    if (/unique/i.test(msg)) throw new Error('Username is already taken');
    throw e;
  }
}

export async function setBio(db: DB, userId: string, bio: string): Promise<void> {
  await db.update(schema.profile).set({ bio, updatedAt: new Date() }).where(eq(schema.profile.userId, userId));
}

export interface UserListingItem {
  id: string;
  type: ListingType;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'hidden';
  downloads: number;
  createdAt: Date;
}

export async function listingsByUser(
  db: DB,
  userId: string,
  opts: { self: boolean }
): Promise<UserListingItem[]> {
  const conds = [eq(schema.listing.authorId, userId)];
  if (!opts.self) conds.push(eq(schema.listing.status, 'published'));
  const rows = await db
    .select({
      id: schema.listing.id,
      type: schema.listing.type,
      slug: schema.listing.slug,
      title: schema.listing.title,
      status: schema.listing.status,
      downloads: schema.listing.downloads,
      createdAt: schema.listing.createdAt
    })
    .from(schema.listing)
    .where(and(...conds))
    .orderBy(desc(schema.listing.createdAt));
  return rows;
}
```

- [ ] **Step 4: Pass + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(server): add profile helpers (getOrCreate, setUsername, listingsByUser)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: First-login profile-setup gate

**Files:** Create `src/routes/me/setup/+page.server.ts`, `src/routes/me/setup/+page.svelte`. Modify `src/hooks.server.ts`.

When a signed-in user has no `profile.username`, any non-public navigation redirects to `/me/setup`. Public pages (homepage, listings, detail, login) stay accessible.

- [ ] **Step 1: Server load — `src/routes/me/setup/+page.server.ts`**

```ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, setUsername } from '$lib/server/profiles';
import { username as usernameSchema } from '$lib/schemas/zod-helpers';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const profile = await getOrCreateProfile(db, user.id);
  if (profile.username) throw redirect(303, '/me');
  return {};
};

const Body = z.object({ username: usernameSchema });

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    const fd = await event.request.formData();
    const parsed = Body.safeParse({ username: fd.get('username') });
    if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid' });
    try {
      await setUsername(db, user.id, parsed.data.username);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    throw redirect(303, '/me');
  }
};
```

- [ ] **Step 2: Page — `src/routes/me/setup/+page.svelte`**

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  let { form } = $props();
</script>

<section class="mx-auto max-w-md px-4 py-16">
  <h1 class="font-display text-2xl mb-6">Pick a username</h1>
  <p class="text-sm text-muted-foreground mb-6">
    Used in your profile URL: <code>/u/your-username</code>. Letters, numbers, dots, dashes,
    underscores, and pluses only.
  </p>
  <form method="post" class="grid gap-4">
    <div class="grid gap-1.5">
      <Label for="username">Username</Label>
      <Input id="username" name="username" required />
    </div>
    {#if form?.error}<p class="text-sm text-destructive">{form.error}</p>{/if}
    <Button type="submit">Save</Button>
  </form>
</section>
```

- [ ] **Step 3: Hook — modify `src/hooks.server.ts`**

After populating `event.locals.user`, if the user is signed in and has no profile username AND the route is not in the allowlist, redirect to `/me/setup`.

```ts
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import { getOrCreateProfile } from '$lib/server/profiles';

const PUBLIC_PREFIXES = [
  '/login', '/signup', '/auth/', '/api/auth/',
  '/me/setup',                             // the gate itself
  '/api/profile'                           // profile-update endpoint
];

const isPublic = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/romhacks') || pathname.startsWith('/sprites') ||
  pathname.startsWith('/sounds')   || pathname.startsWith('/scripts') ||
  pathname.startsWith('/u/') || pathname.startsWith('/search') ||
  pathname.startsWith('/api/downloads/') ||
  PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  if (event.locals.user && !isPublic(event.url.pathname)) {
    const profile = await getOrCreateProfile(db, event.locals.user.id);
    if (!profile.username) throw redirect(303, '/me/setup');
  }

  return resolve(event);
};
```

- [ ] **Step 4: Smoke**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -sI http://localhost:5173/me/setup | head -2
pkill -f 'vite dev'
```

Expected: `303` (auth-redirect to /login because we're not signed in). The behavior we'd want with a real session is tested via the unit tests in Task 1; this smoke just confirms the route compiles and is reachable.

- [ ] **Step 5: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(profile): first-login username gate at /me/setup" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: `/me` settings + drafts/uploads

**Files:** Create `src/routes/me/+page.server.ts`, `src/routes/me/+page.svelte`, `src/routes/api/profile/+server.ts`, `src/lib/components/profile/ProfileForm.svelte`.

- [ ] **Step 1: Profile-update endpoint — `src/routes/api/profile/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { setUsername, setBio } from '$lib/server/profiles';
import { username as usernameSchema } from '$lib/schemas/zod-helpers';

const Body = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(2000).optional()
});

export const PATCH: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body;
  try {
    body = Body.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }
  if (body.username !== undefined) {
    try { await setUsername(db, user.id, body.username); }
    catch (e) { throw error(400, (e as Error).message); }
  }
  if (body.bio !== undefined) await setBio(db, user.id, body.bio);
  return json({ ok: true });
};
```

- [ ] **Step 2: ProfileForm — `src/lib/components/profile/ProfileForm.svelte`**

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import { invalidateAll } from '$app/navigation';

  let { initial }: { initial: { username: string; bio: string | null } } = $props();
  let username = $state(initial.username);
  let bio = $state(initial.bio ?? '');
  let busy = $state(false);
  let err = $state<string | null>(null);
  let ok = $state(false);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    err = null; ok = false; busy = true;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, bio })
      });
      if (!res.ok) throw new Error(await res.text());
      ok = true;
      await invalidateAll();
    } catch (e: unknown) { err = (e as Error).message; }
    finally { busy = false; }
  }
</script>

<form onsubmit={save} class="grid gap-4 max-w-md">
  <div class="grid gap-1.5">
    <Label for="username">Username</Label>
    <Input id="username" bind:value={username} required />
  </div>
  <div class="grid gap-1.5">
    <Label for="bio">Bio</Label>
    <textarea id="bio" rows="4" bind:value={bio}
              class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
  </div>
  {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
  {#if ok}<p class="text-sm text-emerald-700 dark:text-emerald-300">Saved.</p>{/if}
  <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
</form>
```

- [ ] **Step 3: `/me` server load — `src/routes/me/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, listingsByUser } from '$lib/server/profiles';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile, listings] = await Promise.all([
    getOrCreateProfile(db, user.id),
    listingsByUser(db, user.id, { self: true })
  ]);
  return {
    profile: { username: profile.username, bio: profile.bio },
    drafts: listings.filter((l) => l.status === 'draft'),
    published: listings.filter((l) => l.status !== 'draft')
  };
};
```

- [ ] **Step 4: `/me` page — `src/routes/me/+page.svelte`**

```svelte
<script lang="ts">
  import ProfileForm from '$lib/components/profile/ProfileForm.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-10">
  <div>
    <h1 class="font-display text-2xl mb-4">Your profile</h1>
    <ProfileForm initial={data.profile} />
  </div>

  <div>
    <h2 class="font-display text-xl mb-4">Drafts</h2>
    {#if data.drafts.length === 0}
      <p class="text-sm text-muted-foreground">No drafts.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.drafts as l}
          <li class="border rounded p-3 flex items-center justify-between text-sm">
            <span>{l.title}</span>
            <Badge variant="outline">{l.type}</Badge>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div>
    <h2 class="font-display text-xl mb-4">Published</h2>
    {#if data.published.length === 0}
      <p class="text-sm text-muted-foreground">Nothing published yet.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.published as l}
          <li class="border rounded p-3 flex items-center justify-between text-sm">
            <a href={`/${route(l.type)}/${l.slug}`} class="hover:underline">{l.title}</a>
            <span class="flex items-center gap-2">
              <Badge variant="outline">{l.type}</Badge>
              <span class="text-muted-foreground">{l.downloads} ↓</span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
```

- [ ] **Step 5: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(profile): /me page with profile editor + drafts/published lists" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Public profile `/u/[username]`

**Files:** Create `src/routes/u/[username]/+page.server.ts`, `src/routes/u/[username]/+page.svelte`, `src/lib/components/profile/ProfileSummary.svelte`.

- [ ] **Step 1: Server load**

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import { db } from '$lib/db';
import { getProfileByUsername, listingsByUser } from '$lib/server/profiles';

export const load: PageServerLoad = async ({ params }) => {
  const profile = await getProfileByUsername(db, params.username);
  if (!profile) throw error(404, 'User not found');

  const userRows = await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, profile.userId)).limit(1);
  const listings = await listingsByUser(db, profile.userId, { self: false });
  return { profile: { username: profile.username, bio: profile.bio, name: userRows[0]?.name ?? '' }, listings };
};
```

- [ ] **Step 2: ProfileSummary — `src/lib/components/profile/ProfileSummary.svelte`**

```svelte
<script lang="ts">
  let { profile }: {
    profile: { username: string; bio: string | null; name: string };
  } = $props();
</script>

<div class="border rounded-lg p-6">
  <h1 class="font-display text-2xl">@{profile.username}</h1>
  {#if profile.name}<p class="text-sm text-muted-foreground mt-1">{profile.name}</p>{/if}
  {#if profile.bio}<p class="mt-3 whitespace-pre-line">{profile.bio}</p>{/if}
</div>
```

- [ ] **Step 3: Page**

```svelte
<script lang="ts">
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-8">
  <ProfileSummary profile={data.profile} />
  <div>
    <h2 class="font-display text-xl mb-4">Uploads</h2>
    {#if data.listings.length === 0}
      <p class="text-sm text-muted-foreground">No uploads yet.</p>
    {:else}
      <ul class="grid gap-2">
        {#each data.listings as l}
          <li class="border rounded p-3 flex items-center justify-between text-sm">
            <a href={`/${route(l.type)}/${l.slug}`} class="hover:underline">{l.title}</a>
            <span class="flex items-center gap-2">
              <Badge variant="outline">{l.type}</Badge>
              <span class="text-muted-foreground">{l.downloads} ↓</span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
```

- [ ] **Step 4: Smoke + commit**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /tmp/p.html -w "GET /u/none HTTP %{http_code}\n" http://localhost:5173/u/none
pkill -f 'vite dev'
```

Expected: 404 (no profile by that name).

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(profile): public /u/[username] page" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Versioning data layer + endpoints

**Files:** Create `src/lib/server/versions.ts`, `src/lib/server/versions.test.ts`, `src/routes/api/listings/[id]/versions/presign/+server.ts`, `src/routes/api/listings/[id]/versions/finalize/+server.ts`.

The new endpoints accept an existing `listingId` and produce a new `listing_version` row instead of a fresh listing. They reuse `presignFor` and `verifyAllUploaded`.

- [ ] **Step 1: Failing test — `src/lib/server/versions.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { createNextVersion, listVersionsForListing } from './versions';
import { createListingDraft, finalizeListing } from './listings';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });
});

describe('versions', () => {
  it('creates a new version and flips is_current', async () => {
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: {
        title: 'Vh', description: '', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English', release: '1.0.0'
      } }
    });
    await finalizeListing(db, {
      type: 'romhack', listingId: a.listingId, versionId: a.versionId,
      files: [{ r2Key: 'k1', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }]
    });

    const next = await createNextVersion(db, {
      listingId: a.listingId,
      version: '1.1.0',
      changelog: 'fixed two bugs'
    });
    expect(next.id).toBeTruthy();

    const versions = await listVersionsForListing(db, a.listingId);
    expect(versions).toHaveLength(2);
    expect(versions.find((v) => v.version === '1.1.0')!.isCurrent).toBe(true);
    expect(versions.find((v) => v.version === '1.0.0')!.isCurrent).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `src/lib/server/versions.ts`**

```ts
import { and, desc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface NewVersionInput {
  listingId: string;
  version: string;
  changelog?: string | null;
}

export async function createNextVersion(db: DB, input: NewVersionInput) {
  await db
    .update(schema.listingVersion)
    .set({ isCurrent: false })
    .where(eq(schema.listingVersion.listingId, input.listingId));

  const id = newId();
  await db.insert(schema.listingVersion).values({
    id,
    listingId: input.listingId,
    version: input.version,
    changelog: input.changelog ?? null,
    isCurrent: true
  });
  return { id };
}

export async function listVersionsForListing(db: DB, listingId: string) {
  return db
    .select()
    .from(schema.listingVersion)
    .where(eq(schema.listingVersion.listingId, listingId))
    .orderBy(desc(schema.listingVersion.createdAt));
}

export async function getListingForAuthor(db: DB, listingId: string, authorId: string) {
  const rows = await db
    .select()
    .from(schema.listing)
    .where(and(eq(schema.listing.id, listingId), eq(schema.listing.authorId, authorId)))
    .limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Presign endpoint — `src/routes/api/listings/[id]/versions/presign/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { presignFor } from '$lib/server/uploads';
import { validateUploads, type FileMeta } from '$lib/utils/file-types';
import { createNextVersion, getListingForAuthor } from '$lib/server/versions';

const Body = z.object({
  version: z.string().min(1).max(40),
  changelog: z.string().max(10_000).optional(),
  files: z.array(z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().positive()
  })).min(1)
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const listing = await getListingForAuthor(db, event.params.id, user.id);
  if (!listing) throw error(404, 'Not found');

  let body;
  try { body = Body.parse(await event.request.json()); }
  catch { throw error(400, 'Invalid request body'); }

  const v = validateUploads(listing.type, body.files as FileMeta[]);
  if (!v.ok) throw error(400, v.error);

  const next = await createNextVersion(db, {
    listingId: listing.id,
    version: body.version,
    changelog: body.changelog ?? null
  });
  const uploads = await presignFor({
    listingId: listing.id,
    versionId: next.id,
    files: body.files
  });
  return json({ versionId: next.id, uploads });
};
```

- [ ] **Step 4: Finalize endpoint — `src/routes/api/listings/[id]/versions/finalize/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { verifyAllUploaded } from '$lib/server/uploads';
import { newId } from '$lib/utils/ids';
import { getListingForAuthor } from '$lib/server/versions';

const Body = z.object({
  versionId: z.string().min(1),
  files: z.array(z.object({
    r2Key: z.string().min(1),
    filename: z.string().min(1),
    originalFilename: z.string().min(1),
    size: z.number().int().positive(),
    hash: z.string().nullable().optional()
  })).min(1)
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const listing = await getListingForAuthor(db, event.params.id, user.id);
  if (!listing) throw error(404, 'Not found');

  let body;
  try { body = Body.parse(await event.request.json()); }
  catch { throw error(400, 'Invalid request body'); }

  const ok = await verifyAllUploaded(body.files.map((f) => f.r2Key));
  if (!ok) throw error(502, 'One or more files were not received by storage');

  for (const f of body.files) {
    await db.insert(schema.listingFile).values({
      id: newId(),
      versionId: body.versionId,
      r2Key: f.r2Key,
      filename: f.filename,
      originalFilename: f.originalFilename,
      size: f.size,
      hash: f.hash ?? null
    });
  }
  if (listing.type !== 'romhack') {
    const total = body.files.reduce((s, f) => s + f.size, 0);
    await db
      .update(schema.assetHiveMeta)
      .set({ fileCount: body.files.length, totalSize: total })
      .where(eq(schema.assetHiveMeta.listingId, listing.id));
  }
  await db.update(schema.listing).set({ updatedAt: new Date() }).where(eq(schema.listing.id, listing.id));
  return json({ ok: true });
};
```

- [ ] **Step 5: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(versions): per-listing new-version presign+finalize endpoints" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Version timeline + author "new version" UI

**Files:** Create `src/lib/components/listings/VersionTimeline.svelte`. Modify the four detail pages and their `+page.server.ts` to also load `versions`.

- [ ] **Step 1: VersionTimeline**

```svelte
<script lang="ts">
  let { versions, currentId }: {
    versions: { id: string; version: string; changelog: string | null; isCurrent: boolean; createdAt: Date }[];
    currentId: string;
  } = $props();
</script>

<ul class="grid gap-3">
  {#each versions as v}
    <li class="border rounded-lg p-3">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">v{v.version}{v.isCurrent ? ' (current)' : ''}</span>
        <time class="text-xs text-muted-foreground" datetime={v.createdAt.toISOString()}>
          {v.createdAt.toLocaleDateString()}
        </time>
      </div>
      {#if v.changelog}<p class="mt-2 text-sm whitespace-pre-line">{v.changelog}</p>{/if}
    </li>
  {/each}
</ul>
```

- [ ] **Step 2: Modify `getRomhackBySlug` and `getAssetHiveBySlug` to also return `versions`**

In `src/lib/server/listings.ts`, both detail helpers should attach a full `versions` array (all rows, ordered desc by `createdAt`). Use `listVersionsForListing` from `versions.ts`.

```ts
import { listVersionsForListing } from './versions';

// in getRomhackBySlug, after computing `version`:
const versions = await listVersionsForListing(db, listing.id);
return { listing, meta: metaRows[0], version: versionRows[0], versions, files: fileRows, authorName: ... };
```

Update the `RomhackDetail` and `AssetHiveDetail` interfaces to include `versions: ListingVersion[]`.

- [ ] **Step 3: Modify each detail page**

Add the timeline + an author-only "Upload new version" link to:
- `src/routes/romhacks/[slug]/+page.svelte`
- `src/routes/sprites/[slug]/+page.svelte`
- `src/routes/sounds/[slug]/+page.svelte`
- `src/routes/scripts/[slug]/+page.svelte`

Pattern:

```svelte
<script lang="ts">
  // ...existing imports
  import VersionTimeline from '$lib/components/listings/VersionTimeline.svelte';
  import { Button } from '$lib/components/ui/button';
  let { data } = $props();
  const { listing, versions, ... } = data.detail;
  const isAuthor = data.user?.id === listing.authorId;
</script>

<!-- existing layout -->

<section class="border rounded-lg p-4 mt-6">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-sm font-medium">Versions</h2>
    {#if isAuthor}
      <a href={`/upload/${listing.type === 'romhack' ? 'romhack' : listing.type}/version?id=${listing.id}`}>
        <Button size="sm" variant="outline">Upload new version</Button>
      </a>
    {/if}
  </div>
  <VersionTimeline versions={versions} currentId={data.detail.version.id} />
</section>
```

`data.user` comes from the root `+layout.server.ts` (we already pass `user` there). If a per-page server load doesn't surface `user`, expose it via the layout's data prop.

For the "Upload new version" link, the simplest approach is a single shared upload page at `/upload/[type]/version?id=<listingId>` that infers it's a version-mode rather than draft-mode by the presence of `?id=`. To avoid blowing scope, **defer that page to Task 7** below — for now the link target may be left as-is (it'll 404 until Task 7 adds the route).

- [ ] **Step 4: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(versions): version timeline on detail pages" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: New-version upload page

**Files:** Create `src/routes/upload/[type]/version/+page.server.ts` and `+page.svelte`.

A single parameterized route that loads the existing listing, confirms the user owns it, and orchestrates the version-presign + version-finalize flow. The URL is `/upload/<type>/version?id=<listingId>`. `[type]` is one of `romhack | sprite | sound | script`.

- [ ] **Step 1: Server load — `src/routes/upload/[type]/version/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getListingForAuthor } from '$lib/server/versions';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const id = event.url.searchParams.get('id');
  if (!id) throw error(400, 'Missing ?id=');
  const listing = await getListingForAuthor(db, id, user.id);
  if (!listing) throw error(404, 'Listing not found');
  if (listing.type !== event.params.type) throw error(400, 'Type mismatch');
  return { listing: { id: listing.id, type: listing.type, slug: listing.slug, title: listing.title } };
};
```

- [ ] **Step 2: Page — `src/routes/upload/[type]/version/+page.svelte`**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import FileDropzone from '$lib/components/forms/FileDropzone.svelte';

  let { data } = $props();
  let version = $state('');
  let changelog = $state('');
  let files = $state<File[]>([]);
  let busy = $state(false);
  let err = $state<string | null>(null);

  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    err = null;
    if (!version) { err = 'Version label required'; return; }
    if (!files.length) { err = 'Pick at least one file'; return; }
    busy = true;
    try {
      const presignRes = await fetch(`/api/listings/${data.listing.id}/versions/presign`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version,
          changelog: changelog || undefined,
          files: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size }))
        })
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { versionId, uploads } = await presignRes.json();

      await Promise.all(uploads.map((u: any, i: number) =>
        fetch(u.url, { method: 'PUT', headers: { 'content-type': files[i].type || 'application/octet-stream' }, body: files[i] })
          .then((r) => { if (!r.ok) throw new Error(`R2 PUT failed for ${u.originalFilename}`); })
      ));

      const finalizeRes = await fetch(`/api/listings/${data.listing.id}/versions/finalize`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          versionId,
          files: uploads.map((u: any) => ({ r2Key: u.r2Key, filename: u.filename, originalFilename: u.originalFilename, size: u.size }))
        })
      });
      if (!finalizeRes.ok) throw new Error(await finalizeRes.text());
      await goto(`/${route(data.listing.type)}/${data.listing.slug}`);
    } catch (e: any) { err = e?.message ?? 'Upload failed'; }
    finally { busy = false; }
  }
</script>

<section class="mx-auto max-w-2xl px-4 py-10">
  <h1 class="font-display text-2xl mb-2">Upload new version</h1>
  <p class="text-sm text-muted-foreground mb-6">{data.listing.title}</p>
  <form onsubmit={submit} class="grid gap-4">
    <div class="grid gap-1.5">
      <Label for="version">Version label</Label>
      <Input id="version" bind:value={version} placeholder="1.1.0" required />
    </div>
    <div class="grid gap-1.5">
      <Label for="changelog">Changelog</Label>
      <textarea id="changelog" rows="6" bind:value={changelog}
                class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
    </div>
    <div>
      <label class="text-sm font-medium block mb-2">Files</label>
      <FileDropzone bind:files />
    </div>
    {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
    <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Publish version'}</Button>
  </form>
</section>
```

- [ ] **Step 3: Smoke + commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(versions): /upload/[type]/version?id= for new-version uploads" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: SQLite FTS5 search — schema + helpers

**Files:** Add a hand-authored migration `drizzle/XXXX_fts_listings.sql`; create `src/lib/server/search.ts`, `src/lib/server/search.test.ts`.

The FTS5 virtual table mirrors `listing.title` and `listing.description` plus the `type` and `status` filters. Triggers keep it in sync on insert/update/delete. Drizzle does not model virtual tables natively — the migration is hand-written; queries use `db.run(sql\`...\`)`.

- [ ] **Step 1: Add migration**

Determine the next migration number by listing `drizzle/` contents (`ls drizzle/*.sql | sort | tail -1`). Then create `drizzle/000N_fts_listings.sql` (next number, zero-padded to 4 digits, name `fts_listings`):

```sql
CREATE VIRTUAL TABLE listings_fts USING fts5(
  listing_id UNINDEXED,
  type UNINDEXED,
  status UNINDEXED,
  title,
  description,
  content=''
);

CREATE TRIGGER listings_fts_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts(rowid, listing_id, type, status, title, description)
  VALUES (
    (SELECT COUNT(*) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description
  );
END;

CREATE TRIGGER listings_fts_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
  INSERT INTO listings_fts(rowid, listing_id, type, status, title, description)
  VALUES (
    (SELECT COUNT(*) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description
  );
END;

CREATE TRIGGER listings_fts_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
END;
```

> Drizzle won't generate this from `schema.ts` — it's added directly under `drizzle/`. Update `drizzle/meta/_journal.json` to include this migration entry. The simplest way: run `bun run db:push` (which doesn't track journal entries the same way) or, manually, run the SQL once locally and append a journal entry. **Simpler:** edit `_journal.json` so the new migration is registered:
> ```json
> { "idx": <N>, "version": "7", "when": <timestamp>, "tag": "000N_fts_listings", "breakpoints": true }
> ```
> Test it with `bun run db:migrate` against a fresh `local.db` (delete the file first) and confirm the FTS table is created with no error.

- [ ] **Step 2: Failing test — `src/lib/server/search.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '$lib/db/schema';
import { searchListings } from './search';
import { createListingDraft, finalizeListing } from './listings';

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const c = createClient({ url: ':memory:' });
  db = drizzle(c, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });
});

describe('searchListings', () => {
  it('finds by title prefix', async () => {
    const a = await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: {
        title: 'Kaizo Emerald', description: 'a hard hack', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English', release: '1'
      }}
    });
    await finalizeListing(db, {
      type: 'romhack', listingId: a.listingId, versionId: a.versionId,
      files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }]
    });

    const hits = await searchListings(db, 'kaizo');
    expect(hits.some((h) => h.title === 'Kaizo Emerald')).toBe(true);
  });

  it('hides drafts', async () => {
    await createListingDraft(db, {
      authorId: 'u1',
      ti: { type: 'romhack', input: {
        title: 'Draft Hack', description: 'x', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English', release: '1'
      }}
    });
    const hits = await searchListings(db, 'draft');
    expect(hits.some((h) => h.title === 'Draft Hack')).toBe(false);
  });

  it('filters by type', async () => {
    const hits = await searchListings(db, 'kaizo', { type: 'sprite' });
    expect(hits).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement `src/lib/server/search.ts`**

```ts
import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export interface SearchHit {
  id: string;
  type: 'romhack' | 'sprite' | 'sound' | 'script';
  slug: string;
  title: string;
  snippet: string;
}

function escapeFts(q: string): string {
  // Wrap each whitespace-separated token in double quotes to match it as a phrase,
  // append * for prefix matching. Drop characters FTS5 can't handle.
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '')}"*`)
    .join(' ');
}

export async function searchListings(
  db: DB,
  query: string,
  filters: { type?: 'romhack' | 'sprite' | 'sound' | 'script' } = {}
): Promise<SearchHit[]> {
  const q = escapeFts(query);
  if (!q) return [];

  const result = await db.run(sql`
    SELECT
      l.id    AS id,
      l.type  AS type,
      l.slug  AS slug,
      l.title AS title,
      snippet(listings_fts, 4, '<b>', '</b>', '…', 16) AS snippet
    FROM listings_fts
    JOIN listing l ON l.id = listings_fts.listing_id
    WHERE listings_fts MATCH ${q}
      AND l.status = 'published'
      ${filters.type ? sql`AND l.type = ${filters.type}` : sql``}
    LIMIT 60
  `);

  return (result.rows as unknown as SearchHit[]) ?? [];
}
```

> If `db.run`'s return shape differs in this libSQL+Drizzle version, look at how other `sql`-template usages in this codebase return values (none currently — this is the first raw-SQL helper) and adapt. The libSQL client's `execute()` returns `{ rows: Row[] }` where each row is keyed by column name.

- [ ] **Step 4: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): add FTS5 listings_fts table + searchListings helper" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Search UI

**Files:** Create `src/lib/components/search/SearchBar.svelte`, `src/routes/search/+page.server.ts`, `src/routes/search/+page.svelte`. Modify `src/lib/components/layout/Header.svelte` to include the search bar.

- [ ] **Step 1: SearchBar**

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { goto } from '$app/navigation';

  let q = $state('');

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    await goto(`/search?q=${encodeURIComponent(q.trim())}`);
  }
</script>

<form {onsubmit} class="hidden sm:block w-64">
  <Input name="q" placeholder="Search…" bind:value={q} />
</form>
```

- [ ] **Step 2: Add to Header**

In `src/lib/components/layout/Header.svelte`, add `<SearchBar />` between the nav links and the auth buttons.

- [ ] **Step 3: `/search` page**

`src/routes/search/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { searchListings } from '$lib/server/search';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const typeParam = url.searchParams.get('type');
  const type = (['romhack', 'sprite', 'sound', 'script'] as const).find((t) => t === typeParam);
  const hits = q ? await searchListings(db, q, { type }) : [];
  return { q, type: type ?? null, hits };
};
```

`src/routes/search/+page.svelte`:

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-3xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Search</h1>
  <form method="get" class="flex gap-2 mb-6">
    <Input name="q" value={data.q} placeholder="Search title or description…" />
    <select name="type" value={data.type ?? ''}
            class="border rounded-md px-3 py-2 bg-background text-sm">
      <option value="">All types</option>
      <option value="romhack">Romhacks</option>
      <option value="sprite">Sprites</option>
      <option value="sound">Sounds</option>
      <option value="script">Scripts</option>
    </select>
    <Button type="submit">Go</Button>
  </form>

  {#if data.q && data.hits.length === 0}
    <p class="text-sm text-muted-foreground">No matches for "{data.q}".</p>
  {:else}
    <ul class="grid gap-3">
      {#each data.hits as hit}
        <li class="border rounded p-3">
          <div class="flex items-center justify-between mb-1">
            <a href={`/${route(hit.type)}/${hit.slug}`} class="font-medium hover:underline">{hit.title}</a>
            <Badge variant="outline">{hit.type}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">{@html hit.snippet}</p>
        </li>
      {/each}
    </ul>
  {/if}
</section>
```

> `{@html}` is needed because the FTS `snippet()` output contains the `<b>` highlight tags. `escapeFts` and the SQL trigger keep tag content safe; no user-controlled HTML reaches this path beyond the highlight wrapper itself.

- [ ] **Step 4: Smoke + commit**

```bash
bun run dev > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /tmp/s.html -w "GET /search?q=test HTTP %{http_code}\n" 'http://localhost:5173/search?q=test'
pkill -f 'vite dev'
```

Expected: HTTP 200.

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(search): /search page + header search bar" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Moderation — flag endpoint + report button + admin queue

**Files:** Create `src/lib/server/moderation.ts`, `src/lib/server/moderation.test.ts`, `src/lib/server/admin.ts`, `src/routes/api/flags/+server.ts`, `src/lib/components/moderation/ReportButton.svelte`, `src/routes/admin/+layout.server.ts`, `src/routes/admin/flags/+page.server.ts`, `src/routes/admin/flags/+page.svelte`, `src/routes/admin/flags/[id]/+page.server.ts`. Modify the four detail pages.

- [ ] **Step 1: Server module — `src/lib/server/moderation.ts`**

```ts
import { and, desc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

export type FlagKind = 'mature' | 'spam' | 'illegal' | 'other';

export async function createFlag(
  db: DB,
  args: { listingId: string; reporterId: string | null; kind: FlagKind; reason?: string | null }
) {
  const id = newId();
  await db.insert(schema.flag).values({
    id,
    listingId: args.listingId,
    reporterId: args.reporterId,
    kind: args.kind,
    reason: args.reason ?? null,
    status: 'open'
  });
  return { id };
}

export async function listOpenFlags(db: DB) {
  return db
    .select({
      id: schema.flag.id,
      kind: schema.flag.kind,
      reason: schema.flag.reason,
      createdAt: schema.flag.createdAt,
      listingId: schema.listing.id,
      listingTitle: schema.listing.title,
      listingType: schema.listing.type,
      listingSlug: schema.listing.slug
    })
    .from(schema.flag)
    .innerJoin(schema.listing, eq(schema.listing.id, schema.flag.listingId))
    .where(eq(schema.flag.status, 'open'))
    .orderBy(desc(schema.flag.createdAt));
}

export async function dismissFlag(db: DB, flagId: string) {
  await db.update(schema.flag).set({ status: 'dismissed' }).where(eq(schema.flag.id, flagId));
}

export async function actOnFlag(
  db: DB,
  args: { flagId: string; action: 'hide' | 'mature' }
) {
  const f = (await db.select().from(schema.flag).where(eq(schema.flag.id, args.flagId)).limit(1))[0];
  if (!f) return;
  if (args.action === 'hide') {
    await db.update(schema.listing).set({ status: 'hidden' }).where(eq(schema.listing.id, f.listingId));
  } else {
    await db.update(schema.listing).set({ mature: true }).where(eq(schema.listing.id, f.listingId));
  }
  await db.update(schema.flag).set({ status: 'reviewed' }).where(eq(schema.flag.id, args.flagId));
}
```

- [ ] **Step 2: Tests — `src/lib/server/moderation.test.ts`**

Standard pattern (in-memory libSQL, drafts/finalize a listing, file a flag, list/dismiss/act). Cover at least:
- `createFlag` then `listOpenFlags` returns it
- `dismissFlag` flips status to 'dismissed' (no longer in `listOpenFlags`)
- `actOnFlag('hide')` flips listing.status to 'hidden'
- `actOnFlag('mature')` sets `mature = true` on the listing

Implement following the exact pattern from `src/lib/server/listings.test.ts` — same in-memory setup. Make sure all tests are concrete, no skeletons.

- [ ] **Step 3: Admin guard — `src/lib/server/admin.ts`**

```ts
import { error } from '@sveltejs/kit';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { requireUser } from './auth-utils';

export async function requireAdmin(event: Pick<RequestEvent | ServerLoadEvent, 'locals' | 'url'>) {
  const user = requireUser(event);
  const rows = await db
    .select({ isAdmin: schema.user.isAdmin })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1);
  if (!rows[0]?.isAdmin) throw error(403, 'Forbidden');
  return user;
}
```

- [ ] **Step 4: Flag-create endpoint — `src/routes/api/flags/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { createFlag } from '$lib/server/moderation';

const Body = z.object({
  listingId: z.string().min(1),
  kind: z.enum(['mature', 'spam', 'illegal', 'other']),
  reason: z.string().max(2000).optional()
});

export const POST: RequestHandler = async (event) => {
  let body;
  try { body = Body.parse(await event.request.json()); }
  catch { throw error(400, 'Invalid request body'); }

  const user = event.locals.user;
  const { id } = await createFlag(db, {
    listingId: body.listingId,
    reporterId: user?.id ?? null,
    kind: body.kind,
    reason: body.reason ?? null
  });
  return json({ id });
};
```

(Reports are allowed anonymously; `reporterId` is nullable.)

- [ ] **Step 5: ReportButton — `src/lib/components/moderation/ReportButton.svelte`**

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  let { listingId }: { listingId: string } = $props();

  let open = $state(false);
  let kind = $state<'mature' | 'spam' | 'illegal' | 'other'>('mature');
  let reason = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);
  let ok = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = null;
    try {
      const res = await fetch('/api/flags', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, kind, reason: reason || undefined })
      });
      if (!res.ok) throw new Error(await res.text());
      ok = true;
      open = false;
    } catch (e: any) { err = e?.message ?? 'Report failed'; }
    finally { busy = false; }
  }
</script>

<Button size="sm" variant="ghost" onclick={() => (open = !open)}>Report</Button>
{#if ok}<span class="ml-2 text-xs text-emerald-700 dark:text-emerald-300">Thanks, we'll review.</span>{/if}

{#if open}
  <form onsubmit={submit} class="mt-3 grid gap-2 border rounded p-3 bg-background">
    <select bind:value={kind} class="border rounded-md px-2 py-1 text-sm">
      <option value="mature">Mature content</option>
      <option value="spam">Spam</option>
      <option value="illegal">Illegal</option>
      <option value="other">Other</option>
    </select>
    <textarea bind:value={reason} rows="3" placeholder="Optional details"
              class="border rounded-md px-2 py-1 text-sm"></textarea>
    {#if err}<p class="text-xs text-destructive">{err}</p>{/if}
    <Button size="sm" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
  </form>
{/if}
```

Add `<ReportButton listingId={listing.id} />` to the four detail page footers.

- [ ] **Step 6: Admin queue routes**

`src/routes/admin/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async (event) => {
  await requireAdmin(event);
  return {};
};
```

`src/routes/admin/flags/+page.server.ts`:

```ts
import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { listOpenFlags, dismissFlag, actOnFlag } from '$lib/server/moderation';
import { requireAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async (event) => {
  await requireAdmin(event);
  return { flags: await listOpenFlags(db) };
};

export const actions: Actions = {
  dismiss: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    const flagId = String(fd.get('flagId'));
    await dismissFlag(db, flagId);
    throw redirect(303, '/admin/flags');
  },
  hide: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    await actOnFlag(db, { flagId: String(fd.get('flagId')), action: 'hide' });
    throw redirect(303, '/admin/flags');
  },
  mature: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    await actOnFlag(db, { flagId: String(fd.get('flagId')), action: 'mature' });
    throw redirect(303, '/admin/flags');
  }
};
```

`src/routes/admin/flags/+page.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  let { data } = $props();
  const route = (t: string) => t === 'romhack' ? 'romhacks' : `${t}s`;
</script>

<section class="mx-auto max-w-4xl px-4 py-10">
  <h1 class="font-display text-2xl mb-6">Moderation queue</h1>
  {#if data.flags.length === 0}
    <p class="text-sm text-muted-foreground">No open flags. 🎉</p>
  {:else}
    <ul class="grid gap-3">
      {#each data.flags as f}
        <li class="border rounded-lg p-4 grid gap-2">
          <div class="flex items-center justify-between">
            <a href={`/${route(f.listingType)}/${f.listingSlug}`} class="font-medium hover:underline">
              {f.listingTitle}
            </a>
            <Badge variant="outline">{f.kind}</Badge>
          </div>
          {#if f.reason}<p class="text-sm whitespace-pre-line">{f.reason}</p>{/if}
          <div class="flex gap-2">
            <form method="post" action="?/dismiss"><input type="hidden" name="flagId" value={f.id} /><Button size="sm" variant="ghost" type="submit">Dismiss</Button></form>
            <form method="post" action="?/mature"><input type="hidden" name="flagId" value={f.id} /><Button size="sm" variant="outline" type="submit">Mark mature</Button></form>
            <form method="post" action="?/hide"><input type="hidden" name="flagId" value={f.id} /><Button size="sm" variant="destructive" type="submit">Hide listing</Button></form>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
```

- [ ] **Step 7: Commit**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(moderation): flag endpoint, report button, /admin/flags queue" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Mature surface treatment + final tag

**Files:** Create `src/lib/components/listings/MatureWrap.svelte`. Modify `RomhackCard.svelte` and `AssetHiveCard.svelte` to wrap in `MatureWrap` when `mature` is set on the item. Update `listRomhacks` and `listAssetHives` to surface the `mature` flag.

- [ ] **Step 1: Add `mature` to list-row shapes**

In `src/lib/server/listings.ts`, add `mature: schema.listing.mature` to the SELECT clauses of both `listRomhacks` and `listAssetHives`. Update the corresponding interfaces (`RomhackListItem`, `AssetHiveListItem`) to include `mature: boolean`.

- [ ] **Step 2: MatureWrap**

```svelte
<script lang="ts">
  import { type Snippet } from 'svelte';
  let { mature, children }: { mature: boolean; children: Snippet } = $props();
  let revealed = $state(false);
</script>

{#if mature && !revealed}
  <div class="relative">
    <div class="filter blur-md pointer-events-none">{@render children()}</div>
    <button type="button"
            class="absolute inset-0 grid place-items-center text-xs font-display tracking-wider bg-background/60 hover:bg-background/80 rounded-lg"
            onclick={() => (revealed = true)}>
      MATURE — TAP TO REVEAL
    </button>
  </div>
{:else}
  {@render children()}
{/if}
```

- [ ] **Step 3: Wrap cards**

In `RomhackCard.svelte`, wrap the `<a>...</a>` in `<MatureWrap mature={item.mature}>...</MatureWrap>`. Same in `AssetHiveCard.svelte`. Update those components' `item` prop types to include `mature: boolean`.

- [ ] **Step 4: Final check + tag**

```bash
bun run check
bun run test
git add -A
git -c user.email=15176546+jmynes@users.noreply.github.com -c user.name=jmynes commit \
  -m "feat(moderation): MatureWrap blur on cards" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git tag v1-complete
```

---

## Self-review

**Spec coverage:**
- User profile pages → Tasks 1, 3, 4 ✓
- First-login username gate → Task 2 ✓
- Versioning UI + new-version upload flow → Tasks 5, 6, 7 ✓
- FTS5 search + UI → Tasks 8, 9 ✓
- Moderation flag form + admin queue → Task 10 ✓
- Mature content surface → Task 11 ✓

**Placeholders:** none. The "Upload new version" link in Task 6 explicitly defers its target to Task 7, which is documented.

**Type consistency:**
- `UserListingItem`, `Profile`, `SearchHit`, `FlagKind` defined once; consumed across multiple pages.
- `RomhackListItem` / `AssetHiveListItem` grow a `mature` field in Task 11; both call sites get updated.

**Order:** profile data → setup gate → /me + /u UI; then versioning data → version timeline → version upload page; then search data → search UI; then moderation data → report UI → admin queue; final mature surface treatment.

---

## What this plan does NOT cover (intentional)

- Avatar uploads (the `profile.avatarKey` column exists; UI deferred).
- Comments / discussions on listings.
- Email digest of new flags for admins.
- A toggle to opt out of mature blurring (always-on by default in v1; revealed per-card on click).
- Mature filter on list pages (cards always show in feeds; mature ones are blurred).
- Sitemap, OG metadata, structured data.

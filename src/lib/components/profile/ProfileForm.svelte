<script lang="ts">

  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let {
    initial,
  }: {
    initial: {
      username: string;
      alias: string | null;
      pronouns: string | null;
      bio: string | null;
      contactEmail: string | null;
      hideActivity: boolean;
    };
  } = $props();
  // One-time seed from the prop; the form is then locally editable.
  let username = $state(untrack(() => initial.username));
  let alias = $state(untrack(() => initial.alias ?? ''));
  let pronouns = $state(untrack(() => initial.pronouns ?? ''));
  let bio = $state(untrack(() => initial.bio ?? ''));
  let contactEmail = $state(untrack(() => initial.contactEmail ?? ''));
  let hideActivity = $state(untrack(() => initial.hideActivity));
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
        body: JSON.stringify({ username, alias, pronouns, bio, contactEmail, hideActivity })
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
    <Label for="alias">Alias <span class="text-xs text-muted-foreground font-normal">(optional, public display name)</span></Label>
    <Input
      id="alias"
      placeholder="Yak Attack"
      maxlength={80}
      bind:value={alias}
    />
    <p class="text-xs text-muted-foreground">
      Shown alongside your @handle. Leave blank to display only your username.
    </p>
  </div>
  <div class="grid gap-1.5">
    <Label for="pronouns">Pronouns <span class="text-xs text-muted-foreground font-normal">(optional, public)</span></Label>
    <Input
      id="pronouns"
      placeholder="she/her, they/them, xe/xem…"
      maxlength={80}
      bind:value={pronouns}
    />
  </div>
  <div class="grid gap-1.5">
    <Label for="bio">Bio</Label>
    <textarea id="bio" rows="4" bind:value={bio}
              class="border rounded-md px-3 py-2 bg-background text-sm"></textarea>
  </div>
  <div class="grid gap-1.5">
    <Label for="contactEmail">Contact email <span class="text-xs text-muted-foreground font-normal">(optional, public)</span></Label>
    <Input
      id="contactEmail"
      type="email"
      placeholder="you@example.com"
      bind:value={contactEmail}
    />
    <p class="text-xs text-muted-foreground">
      Shown on your public profile. Not verified, not used for sign-in or notifications.
    </p>
  </div>
  <label class="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
    <input
      type="checkbox"
      bind:checked={hideActivity}
      class="mt-0.5 h-4 w-4 rounded border-input bg-background accent-primary"
    />
    <span class="grid gap-1">
      <span class="text-sm font-medium">Hide last-active timestamp</span>
      <span class="text-xs text-muted-foreground">
        When on, your last-active time is hidden from your profile and the public users directory.
      </span>
    </span>
  </label>
  {#if err}<p class="text-sm text-destructive">{err}</p>{/if}
  {#if ok}<p class="text-sm text-emerald-700 dark:text-emerald-300">Saved.</p>{/if}
  <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
</form>

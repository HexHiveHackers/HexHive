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

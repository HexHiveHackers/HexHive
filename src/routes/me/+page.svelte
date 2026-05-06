<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import AvatarUpload from '$lib/components/profile/AvatarUpload.svelte';
  import ProfileForm from '$lib/components/profile/ProfileForm.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let { data, form } = $props();
  const route = (t: string) => (t === 'romhack' ? 'romhacks' : `${t}s`);

  let confirmingDelete = $state(false);
  let confirmText = $state('');
</script>

<section class="mx-auto max-w-4xl px-4 py-10 grid gap-10">
  <div>
    <h1 class="font-display text-2xl mb-4">Your profile</h1>
    <div class="grid gap-6">
      <AvatarUpload avatarKey={data.profile.avatarKey} name={data.profile.name} />
      <ProfileForm initial={data.profile} />
    </div>
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

  <div class="border border-destructive/40 rounded-lg p-5">
    <h2 class="font-display text-lg mb-2 text-destructive">Danger zone</h2>
    <p class="text-sm text-muted-foreground mb-4">
      Permanently delete your account and all of your uploads (romhacks, sprites, sounds, scripts,
      avatar, files in storage). This cannot be undone.
    </p>
    {#if !confirmingDelete}
      <Button
        variant="destructive"
        onclick={() => {
          confirmingDelete = true;
          confirmText = '';
        }}
      >
        <Trash2 size={16} />
        Delete my account
      </Button>
    {:else}
      <form method="post" action="?/deleteAccount" class="grid gap-3">
        <Label for="confirmUsername" class="text-sm">
          Type <code class="font-mono font-medium">{data.profile.username}</code> to confirm:
        </Label>
        <Input
          id="confirmUsername"
          name="confirmUsername"
          autocomplete="off"
          bind:value={confirmText}
          required
        />
        {#if form?.deleteError}
          <p class="text-sm text-destructive">{form.deleteError}</p>
        {/if}
        <div class="flex gap-2">
          <Button
            type="submit"
            variant="destructive"
            disabled={confirmText !== data.profile.username}
          >
            <Trash2 size={16} />
            Delete forever
          </Button>
          <Button
            type="button"
            variant="ghost"
            onclick={() => {
              confirmingDelete = false;
              confirmText = '';
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    {/if}
  </div>
</section>

<script lang="ts">
  import { SiDiscord, SiGithub, SiGoogle } from '@icons-pack/svelte-simple-icons';
  import { Loader2, Trash2, Unplug } from '@lucide/svelte';
  import { invalidateAll } from '$app/navigation';
  import type { SocialProvider } from '$lib/auth';
  import { authClient } from '$lib/auth-client';
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

  const providerLabel: Record<SocialProvider, string> = {
    github: 'GitHub',
    discord: 'Discord',
    google: 'Google',
  };
  // Brand accent shown on hover and as the icon foreground in connected
  // rows. Discord blurple, Google blue, GitHub adopts foreground.
  const providerColor: Record<SocialProvider, string> = {
    github: 'currentColor',
    discord: '#5865F2',
    google: '#4285F4',
  };
  function providerIcon(p: SocialProvider) {
    if (p === 'github') return SiGithub;
    if (p === 'discord') return SiDiscord;
    return SiGoogle;
  }

  let busyProvider = $state<SocialProvider | null>(null);
  let connectionError = $state<string | null>(null);

  async function linkProvider(p: SocialProvider) {
    busyProvider = p;
    connectionError = null;
    try {
      // Triggers the OAuth round-trip; the user's browser navigates away
      // and comes back to /me with the new account row attached.
      await authClient.linkSocial({ provider: p, callbackURL: '/me' });
    } catch (err) {
      connectionError = err instanceof Error ? err.message : 'Failed to link provider.';
      busyProvider = null;
    }
  }

  async function unlinkProvider(p: SocialProvider, accountId: string) {
    if (data.connections.length <= 1) return;
    busyProvider = p;
    connectionError = null;
    try {
      const res = await authClient.unlinkAccount({ providerId: p, accountId });
      if (res.error) throw new Error(res.error.message ?? 'Unlink failed');
      await invalidateAll();
    } catch (err) {
      connectionError = err instanceof Error ? err.message : 'Failed to unlink provider.';
    } finally {
      busyProvider = null;
    }
  }
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
    <h2 class="font-display text-xl mb-4">Connections</h2>
    <p class="text-sm text-muted-foreground mb-4">
      Sign-in providers attached to this HexHive account. Add another so you can sign in either way,
      or remove one you no longer use. You need at least one provider linked.
    </p>

    {#if data.connections.length > 0}
      <ul class="grid gap-2 mb-4">
        {#each data.connections as c (c.provider + c.accountId)}
          {@const Icon = providerIcon(c.provider)}
          {@const onlyOne = data.connections.length <= 1}
          <li class="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <span class="flex items-center gap-2 min-w-0">
              <Icon size={16} color={providerColor[c.provider]} />
              <span class="font-medium">{providerLabel[c.provider]}</span>
              <span class="text-xs text-muted-foreground truncate">·  Linked
                {new Date(c.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={onlyOne || busyProvider === c.provider}
              title={onlyOne
                ? 'Add another provider before unlinking your only sign-in method.'
                : `Unlink ${providerLabel[c.provider]}`}
              onclick={() => unlinkProvider(c.provider, c.accountId)}
            >
              {#if busyProvider === c.provider}
                <Loader2 size={14} class="animate-spin" />
              {:else}
                <Unplug size={14} />
              {/if}
              Unlink
            </Button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if data.availableProviders.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted-foreground">Add another:</span>
        {#each data.availableProviders as p (p)}
          {@const Icon = providerIcon(p)}
          <Button
            size="sm"
            variant="outline"
            disabled={busyProvider !== null}
            onclick={() => linkProvider(p)}
          >
            {#if busyProvider === p}
              <Loader2 size={14} class="animate-spin" />
            {:else}
              <Icon size={14} color={providerColor[p]} />
            {/if}
            {providerLabel[p]}
          </Button>
        {/each}
      </div>
    {/if}

    {#if connectionError}
      <p class="mt-3 text-sm text-destructive">{connectionError}</p>
    {/if}
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

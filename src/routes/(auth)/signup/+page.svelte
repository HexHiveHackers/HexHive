<script lang="ts">
  import { SiDiscord, SiGithub } from '@icons-pack/svelte-simple-icons';
  import { authClient } from '$lib/auth-client';
  import GoogleColorIcon from '$lib/components/icons/GoogleColorIcon.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  let { data } = $props();
  let loading = $state<string | null>(null);

  async function oauth(provider: 'google' | 'github' | 'discord') {
    loading = provider;
    await authClient.signIn.social({ provider, callbackURL: '/' });
  }

  const has = (p: 'google' | 'github' | 'discord') => data.enabledSocialProviders.includes(p);
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Create account</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <p class="text-sm text-muted-foreground">
      Sign up with an OAuth provider. You can add a passkey afterward in your account settings.
    </p>
    {#if has('github')}
      <Button
        variant="outline"
        disabled={!!loading}
        onclick={() => oauth('github')}
        class="justify-center gap-3"
      >
        <SiGithub size={18} />
        {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
      </Button>
    {/if}
    {#if has('google')}
      <Button
        variant="outline"
        disabled={!!loading}
        onclick={() => oauth('google')}
        class="justify-center gap-3"
      >
        <GoogleColorIcon size={18} />
        {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </Button>
    {/if}
    {#if has('discord')}
      <Button
        variant="outline"
        disabled={!!loading}
        onclick={() => oauth('discord')}
        class="justify-center gap-3"
      >
        <SiDiscord size={18} color="#5865F2" />
        {loading === 'discord' ? 'Redirecting…' : 'Continue with Discord'}
      </Button>
    {/if}
    {#if data.enabledSocialProviders.length === 0}
      <p class="text-sm text-muted-foreground text-center border rounded-md p-3">
        No OAuth providers configured on this server. Set <code>GOOGLE_CLIENT_ID</code>,
        <code>GITHUB_CLIENT_ID</code>, or <code>DISCORD_CLIENT_ID</code> (and their secrets) in
        <code>.env</code> to enable.
      </p>
    {/if}
    <Separator />
    <p class="text-sm text-muted-foreground text-center">
      Already have an account? <a class="underline" href="/login">Sign in</a>
    </p>
  </CardContent>
</Card>

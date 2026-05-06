<script lang="ts">
  import { SiDiscord, SiGithub } from '@icons-pack/svelte-simple-icons';
  import { KeyRound } from '@lucide/svelte';
  import { authClient } from '$lib/auth-client';
  import GoogleColorIcon from '$lib/components/icons/GoogleColorIcon.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  let loading = $state<string | null>(null);

  async function oauth(provider: 'google' | 'github' | 'discord') {
    loading = provider;
    await authClient.signIn.social({ provider, callbackURL: '/' });
  }

  async function passkey() {
    loading = 'passkey';
    await authClient.signIn.passkey();
    loading = null;
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Sign in</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('github')}
      class="justify-start gap-3"
    >
      <SiGithub size={18} />
      {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
    </Button>
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('google')}
      class="justify-start gap-3"
    >
      <GoogleColorIcon size={18} />
      {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
    </Button>
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('discord')}
      class="justify-start gap-3"
    >
      <SiDiscord size={18} color="#5865F2" />
      {loading === 'discord' ? 'Redirecting…' : 'Continue with Discord'}
    </Button>
    <Separator />
    <Button disabled={!!loading} onclick={passkey} class="gap-2">
      <KeyRound size={16} />
      {loading === 'passkey' ? 'Authenticating…' : 'Sign in with passkey'}
    </Button>
    <p class="text-sm text-muted-foreground text-center">
      No account? <a class="underline" href="/signup">Sign up</a>
    </p>
  </CardContent>
</Card>

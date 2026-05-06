<script lang="ts">
  import { SiDiscord, SiGithub } from '@icons-pack/svelte-simple-icons';
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
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Create account</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <p class="text-sm text-muted-foreground">
      Sign up with an OAuth provider. You can add a passkey afterward in your account settings.
    </p>
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('github')}
      class="justify-center gap-3"
    >
      <SiGithub size={18} />
      {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
    </Button>
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('google')}
      class="justify-center gap-3"
    >
      <GoogleColorIcon size={18} />
      {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
    </Button>
    <Button
      variant="outline"
      disabled={!!loading}
      onclick={() => oauth('discord')}
      class="justify-center gap-3"
    >
      <SiDiscord size={18} color="#5865F2" />
      {loading === 'discord' ? 'Redirecting…' : 'Continue with Discord'}
    </Button>
    <Separator />
    <p class="text-sm text-muted-foreground text-center">
      Already have an account? <a class="underline" href="/login">Sign in</a>
    </p>
  </CardContent>
</Card>

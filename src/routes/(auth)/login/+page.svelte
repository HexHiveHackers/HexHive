<script lang="ts">
  import { authClient } from '$lib/auth-client';
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
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('github')}>
      {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
    </Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('google')}>
      Continue with Google
    </Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('discord')}>
      Continue with Discord
    </Button>
    <Separator />
    <Button disabled={!!loading} onclick={passkey}>
      {loading === 'passkey' ? 'Authenticating…' : 'Sign in with passkey'}
    </Button>
    <p class="text-sm text-muted-foreground text-center">
      No account? <a class="underline" href="/signup">Sign up</a>
    </p>
  </CardContent>
</Card>

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
</script>

<Card>
  <CardHeader>
    <CardTitle class="font-display text-xl tracking-wide">Create account</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3">
    <p class="text-sm text-muted-foreground">Sign up with an OAuth provider. You can add a passkey afterward in your account settings.</p>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('github')}>Continue with GitHub</Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('google')}>Continue with Google</Button>
    <Button variant="outline" disabled={!!loading} onclick={() => oauth('discord')}>Continue with Discord</Button>
    <Separator />
    <p class="text-sm text-muted-foreground text-center">
      Already have an account? <a class="underline" href="/login">Sign in</a>
    </p>
  </CardContent>
</Card>

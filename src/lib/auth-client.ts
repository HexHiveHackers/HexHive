import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

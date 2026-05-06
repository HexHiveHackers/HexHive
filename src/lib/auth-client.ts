import { createAuthClient } from 'better-auth/svelte';

// NOTE: better-auth 1.6.9 does not include a passkey client plugin.
// Re-add passkeyClient() once a compatible package is available.
export const authClient = createAuthClient({
  plugins: []
});

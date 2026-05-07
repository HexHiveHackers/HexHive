import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';

// Constructed on first access, not at module load. SvelteKit's post-build
// `analyse` pass imports every server module; better-auth runs `new URL(baseURL)`
// in its constructor, so an eager build with no BETTER_AUTH_URL set crashes
// the analyse pass on Railway before runtime variables are available.
function build() {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    emailAndPassword: { enabled: false },

    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? { discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET } }
        : {}),
    },

    plugins: [
      passkey({
        rpName: 'HexHive',
        rpID: new URL(env.BETTER_AUTH_URL).hostname,
        origin: env.BETTER_AUTH_URL,
      }),
    ],
  });
}

type Auth = ReturnType<typeof build>;

let cached: Auth | undefined;
function get(): Auth {
  if (!cached) cached = build();
  return cached;
}

export const auth: Auth = new Proxy({} as Auth, {
  get: (_t, prop, receiver) => Reflect.get(get(), prop, receiver),
  has: (_t, prop) => Reflect.has(get(), prop),
});

export type Session = Auth['$Infer']['Session'];

export type SocialProvider = 'google' | 'github' | 'discord';

export const enabledSocialProviders: SocialProvider[] = [
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'google' : null,
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? 'github' : null,
  env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? 'discord' : null,
].filter((p): p is SocialProvider => p !== null);

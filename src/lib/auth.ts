import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';

export const auth = betterAuth({
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

export type Session = typeof auth.$Infer.Session;

export type SocialProvider = 'google' | 'github' | 'discord';

export const enabledSocialProviders: SocialProvider[] = [
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'google' : null,
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? 'github' : null,
  env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? 'discord' : null,
].filter((p): p is SocialProvider => p !== null);

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

    // Email is decoupled from identity. Each OAuth account is mapped to
    // a synthetic per-account email so the user.email column is unique
    // by construction across providers — no two OAuth sign-ins can ever
    // collide on email, so auto-linking by email never fires
    // spuriously, and a single human can have separate HexHive accounts
    // for each provider unless they explicitly link them via /me.
    //
    // The provider's actual email is dropped on the floor; HexHive
    // doesn't run mail. Users who want a contact address set
    // profile.contact_email manually, no verification.
    account: {
      accountLinking: {
        // Manual linking via authClient.linkSocial from /me is the
        // intended path. We leave it enabled so that signed-in users
        // can attach more providers; it's harmless because synthetic
        // emails guarantee no collision-driven auto-linking happens.
        enabled: true,
        // Linking accepts mismatched provider emails because the
        // provider email is no longer the identity key.
        allowDifferentEmails: true,
      },
    },

    socialProviders: {
      // Authoritative profile fields are what the user enters on /me;
      // OAuth providers only confirm "this person controls account X
      // on provider Y". We discard everything else they hand back —
      // no name, no avatar, no email reuse — and store a synthetic
      // per-account email as the unique identity key.
      //
      // user.name is required NOT NULL by the Better-Auth core schema,
      // so each mapper sets it to the same opaque synthetic id used
      // for the email local-part. The /me/setup flow asks the user
      // for a handle (profile.username); display name (profile.alias)
      // and avatar (profile.avatar_key) are filled in from /me. The
      // user.image column is forced to null so the OAuth avatar never
      // becomes the default.
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              mapProfileToUser: (p) => ({
                email: `google-${p.sub}@oauth.hexhive.app`,
                name: `google-${p.sub}`,
              }),
            },
          }
        : {}),
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
              mapProfileToUser: (p) => ({
                email: `github-${p.id}@oauth.hexhive.app`,
                name: `github-${p.id}`,
              }),
            },
          }
        : {}),
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? {
            discord: {
              clientId: env.DISCORD_CLIENT_ID,
              clientSecret: env.DISCORD_CLIENT_SECRET,
              mapProfileToUser: (p) => ({
                email: `discord-${p.id}@oauth.hexhive.app`,
                name: `discord-${p.id}`,
              }),
            },
          }
        : {}),
    },

    // Defence-in-depth: even if a provider eventually leaks an image
    // through some path mapProfileToUser doesn't cover, force it to
    // null at the create boundary. Belt-and-braces — the mappers
    // above already strip it.
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, image: null } }),
        },
      },
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

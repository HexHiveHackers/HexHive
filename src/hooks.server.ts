import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import { getOrCreateProfile } from '$lib/server/profiles';

const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/auth/',
  '/api/auth/',
  '/me/setup',
  '/api/profile',
  '/api/avatars/',
  '/api/banners/',
  '/api/_dev_storage/',
];

const isPublic = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/romhacks') ||
  pathname.startsWith('/sprites') ||
  pathname.startsWith('/sounds') ||
  pathname.startsWith('/scripts') ||
  pathname.startsWith('/u/') ||
  pathname === '/users' ||
  pathname.startsWith('/users/') ||
  pathname.startsWith('/search') ||
  pathname.startsWith('/privacy') ||
  pathname.startsWith('/terms') ||
  pathname.startsWith('/api/downloads/') ||
  pathname.startsWith('/api/preview/') ||
  PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

// Asset-style endpoints that issue R2 redirects and never consult the
// session. Skipping the auth call here avoids paying the cost (and
// dodges a Better Auth request-state crash under heavy concurrent load
// on Bun) for the bursty thumbnail / avatar fetches a single page load
// can produce.
const SESSION_SKIP_PREFIXES = [
  '/api/preview/',
  '/api/avatars/',
  '/api/banners/',
  '/api/downloads/',
  '/api/_dev_storage/',
];

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const skipSession = SESSION_SKIP_PREFIXES.some((p) => path.startsWith(p));

  if (!skipSession) {
    const session = await auth.api.getSession({ headers: event.request.headers });
    event.locals.user = session?.user ?? null;
    event.locals.session = session?.session ?? null;
  } else {
    event.locals.user = null;
    event.locals.session = null;
  }

  if (event.locals.user && !isPublic(path)) {
    const profile = await getOrCreateProfile(db, event.locals.user.id);
    if (!profile.username) throw redirect(303, '/me/setup');
  }

  const response = await resolve(event);
  // HSTS: tell compliant browsers to always upgrade http→https for two
  // years, including subdomains, and request inclusion in the browser
  // preload list. Once a visitor has hit the site over https with this
  // header, their browser auto-rewrites future http URLs client-side
  // before any request is made, removing the 301 round-trip.
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return response;
};

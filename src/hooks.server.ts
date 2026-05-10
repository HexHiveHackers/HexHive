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

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  if (event.locals.user && !isPublic(event.url.pathname)) {
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

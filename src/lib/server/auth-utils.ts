import { redirect } from '@sveltejs/kit';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';

type AnyEvent = Pick<RequestEvent | ServerLoadEvent, 'locals' | 'url'> | { locals: App.Locals; url?: URL };

export function requireUser(event: AnyEvent) {
  const u = event.locals.user;
  if (!u) {
    const next = 'url' in event && event.url ? `?next=${encodeURIComponent(event.url.pathname + event.url.search)}` : '';
    throw redirect(303, `/login${next}`);
  }
  return u;
}

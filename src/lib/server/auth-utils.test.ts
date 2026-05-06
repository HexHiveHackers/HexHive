import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { requireUser } from './auth-utils';

type EventLike = Pick<RequestEvent, 'locals' | 'url'>;

const fakeEvent = (user: App.Locals['user']): EventLike =>
  ({
    locals: { user, session: null },
    url: new URL('http://example/test'),
  }) as unknown as EventLike;

describe('requireUser', () => {
  it('returns the user when present', () => {
    const u = { id: 'u1', email: 'a@b.com', name: 'A' };
    expect(requireUser(fakeEvent(u as App.Locals['user']))).toBe(u);
  });

  it('throws a 401 redirect equivalent when missing', () => {
    expect(() => requireUser(fakeEvent(null))).toThrow();
  });
});

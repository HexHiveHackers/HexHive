import { describe, it, expect } from 'vitest';
import { requireUser } from './auth-utils';

const fakeEvent = (user: any) => ({ locals: { user } }) as any;

describe('requireUser', () => {
  it('returns the user when present', () => {
    const u = { id: 'u1', email: 'a@b.com' };
    expect(requireUser(fakeEvent(u))).toBe(u);
  });

  it('throws a 401 redirect equivalent when missing', () => {
    expect(() => requireUser(fakeEvent(null))).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { buildEvent } from '../../../tests/event';
import { requireUser } from './auth-utils';

describe('requireUser', () => {
  it('returns the user when present', () => {
    const event = buildEvent({});
    const got = requireUser(event);
    expect(got.id).toBe('u1');
  });

  it('throws a 401 redirect equivalent when missing', () => {
    expect(() => requireUser(buildEvent({ user: null }))).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('drops falsy values', () => {
    expect(cn('a', false && 'skip', undefined, 'b')).toBe('a b');
  });
  it('merges conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

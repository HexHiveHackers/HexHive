import { describe, it, expect } from 'vitest';
import { ListingBase } from './listing';

describe('ListingBase', () => {
  it('accepts a minimal listing', () => {
    const r = ListingBase.safeParse({ title: 'Hi', description: '', permissions: ['Credit'] });
    expect(r.success).toBe(true);
  });
  it('requires a title', () => {
    expect(ListingBase.safeParse({ title: '', description: '', permissions: [] }).success).toBe(false);
  });
});

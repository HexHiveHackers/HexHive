import { describe, it, expect } from 'vitest';
import { newId, slugify, uniqueSlug } from './ids';

describe('newId', () => {
  it('produces a 21-char nanoid by default', () => {
    expect(newId()).toHaveLength(21);
  });
  it('respects a length argument', () => {
    expect(newId(12)).toHaveLength(12);
  });
});

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Kaizo Emerald')).toBe('kaizo-emerald');
  });
  it('strips diacritics and punctuation', () => {
    expect(slugify('Pokémon: Glazed!')).toBe('pokemon-glazed');
  });
  it('collapses repeated dashes and trims', () => {
    expect(slugify('  --hi--there--  ')).toBe('hi-there');
  });
  it('falls back to a random slug when input is empty', () => {
    expect(slugify('')).toMatch(/^[a-z0-9]{6,}$/);
  });
});

describe('uniqueSlug', () => {
  it('returns the candidate when no collision', async () => {
    expect(await uniqueSlug('kaizo', async () => false)).toBe('kaizo');
  });
  it('appends -2, -3, ... on collision', async () => {
    const taken = new Set(['kaizo', 'kaizo-2']);
    const res = await uniqueSlug('kaizo', async (s) => taken.has(s));
    expect(res).toBe('kaizo-3');
  });
});

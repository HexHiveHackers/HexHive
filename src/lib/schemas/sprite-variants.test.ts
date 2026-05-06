import { describe, it, expect } from 'vitest';
import { validateTriple } from './sprite-variants';

describe('validateTriple', () => {
  it('rejects unknown type', () => {
    const r = validateTriple('Bogus', 'X', 'Y');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('type');
  });

  it('rejects unknown subtype', () => {
    const r = validateTriple('Battle', 'Bogus', 'X');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('subtype');
  });

  it('accepts no-variant cases (Battle.Attack)', () => {
    expect(validateTriple('Battle', 'Attack', undefined).ok).toBe(true);
  });

  it('rejects providing a variant where none expected', () => {
    const r = validateTriple('Battle', 'Attack', 'Front');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toBe('variant');
  });

  it('accepts an enum variant (Battle.Pokemon = Front)', () => {
    expect(validateTriple('Battle', 'Pokemon', 'Front').ok).toBe(true);
  });

  it('rejects an off-list enum variant', () => {
    expect(validateTriple('Battle', 'Pokemon', 'Sideways').ok).toBe(false);
  });

  it('accepts free-form string variants (Battle.Background = "Cave")', () => {
    expect(validateTriple('Battle', 'Background', 'Cave').ok).toBe(true);
  });

  it('accepts an array of enum variants', () => {
    expect(validateTriple('Battle', 'Pokemon', ['Front', 'Back']).ok).toBe(true);
  });

  it('rejects an array containing an off-list value', () => {
    expect(validateTriple('Battle', 'Pokemon', ['Front', 'Sideways']).ok).toBe(false);
  });

  it('accepts a record of arrays for SpriteFileMap-style entries', () => {
    expect(
      validateTriple('Battle', 'Pokemon', { default: ['Front'], shiny: ['Back'] }).ok
    ).toBe(true);
  });
});

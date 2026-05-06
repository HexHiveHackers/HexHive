import { describe, it, expect } from 'vitest';
import { SoundInput } from './sound';
import { ScriptInput } from './script';
import { SpriteInput } from './sprite';

const base = { title: 't', permissions: ['Free' as const], targetedRoms: ['Emerald' as const] };

describe('SoundInput', () => {
  it('accepts a valid sound', () => {
    expect(SoundInput.safeParse({ ...base, category: 'Cry' }).success).toBe(true);
  });
  it('rejects unknown category', () => {
    expect(SoundInput.safeParse({ ...base, category: 'Boom' }).success).toBe(false);
  });
});

describe('ScriptInput', () => {
  it('rejects duplicate targetedVersions', () => {
    expect(
      ScriptInput.safeParse({
        ...base, categories: ['Feature'], features: ['Engine'],
        targetedVersions: ['v1.0', 'v1.0'], tools: ['Python']
      }).success
    ).toBe(false);
  });
  it('accepts a valid script', () => {
    expect(
      ScriptInput.safeParse({
        ...base, categories: ['Feature'], features: ['Engine'],
        targetedVersions: ['v1.0'], tools: ['Python']
      }).success
    ).toBe(true);
  });
});

describe('SpriteInput', () => {
  it('accepts a valid Battle.Pokemon entry', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' } }).success
    ).toBe(true);
  });
  it('rejects an off-list variant', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Sideways' } }).success
    ).toBe(false);
  });
  it('rejects an unknown subtype', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Nope' } }).success
    ).toBe(false);
  });
  it('accepts a fileMap with category-tagged variants', () => {
    expect(
      SpriteInput.safeParse({
        ...base,
        category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
        fileMap: {
          'frontN.png': { type: 'Battle', subtype: 'Pokemon', variant: ['default', 'Front'] }
        }
      }).success
    ).toBe(true);
  });
});

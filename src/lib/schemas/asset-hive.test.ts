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
  it('accepts a single category entry', () => {
    expect(
      SpriteInput.safeParse({ ...base, category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' } }).success
    ).toBe(true);
  });
});

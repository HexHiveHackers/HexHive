import { describe, it, expect } from 'vitest';
import { slug, username, baseRom } from './zod-helpers';

describe('slug', () => {
  it('accepts kebab-case', () => expect(slug.safeParse('kaizo-emerald').success).toBe(true));
  it('rejects digits-only', () => expect(slug.safeParse('1234').success).toBe(false));
  it('rejects uppercase', () => expect(slug.safeParse('Kaizo').success).toBe(false));
});

describe('username', () => {
  it('accepts allowed chars', () => expect(username.safeParse('user.name_1+').success).toBe(true));
  it('rejects spaces', () => expect(username.safeParse('a b').success).toBe(false));
  it('rejects @', () => expect(username.safeParse('a@b').success).toBe(false));
});

describe('baseRom', () => {
  it('accepts known roms', () => expect(baseRom.safeParse('Emerald').success).toBe(true));
  it('rejects unknown', () => expect(baseRom.safeParse('Crystal').success).toBe(false));
});

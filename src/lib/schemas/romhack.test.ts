import { describe, expect, it } from 'vitest';
import { RomhackInput } from './romhack';

const ok = {
  title: 'Kaizo',
  permissions: ['Credit'] as const,
  baseRom: 'Emerald' as const,
  baseRomVersion: 'v1.0' as const,
  baseRomRegion: 'English' as const,
  release: '1.0.0',
};

describe('RomhackInput', () => {
  it('accepts a valid romhack', () => {
    expect(RomhackInput.safeParse(ok).success).toBe(true);
  });
  it('defaults arrays', () => {
    const r = RomhackInput.parse(ok);
    expect(r.categories).toEqual([]);
    expect(r.tags).toEqual([]);
  });
  it('rejects unknown base ROM', () => {
    expect(RomhackInput.safeParse({ ...ok, baseRom: 'Crystal' }).success).toBe(false);
  });
});

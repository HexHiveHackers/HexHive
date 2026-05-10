import { describe, expect, it } from 'vitest';
import { applyChip, type ChipState, chipStateFromQuery, queryFromChipState } from './filter-state';

const empty: ChipState = {
  types: [],
  active: 'any',
  joined: 'any',
  downloads: 'any',
  listings: 'any',
  has: [],
  affiliations: [],
  hidePlaceholder: true,
  adminOnly: false,
};

describe('queryFromChipState', () => {
  it('emits canonical clauses in stable order', () => {
    const s: ChipState = { ...empty, types: ['sprite', 'sound'], has: ['hasBio'] };
    expect(queryFromChipState(s)).toBe('creates IN (sprite, sound) hasBio NOT placeholder');
  });

  it('drops placeholder clause when hidePlaceholder = false (showing all)', () => {
    const s: ChipState = { ...empty, hidePlaceholder: false };
    expect(queryFromChipState(s)).toBe('');
  });

  it('produces nothing for fully empty state', () => {
    expect(queryFromChipState({ ...empty, hidePlaceholder: false })).toBe('');
  });

  it('emits date presets correctly', () => {
    expect(queryFromChipState({ ...empty, hidePlaceholder: false, active: 'last7' })).toBe('active > -7d');
    expect(queryFromChipState({ ...empty, hidePlaceholder: false, active: 'never' })).toBe('active IS EMPTY');
  });
});

describe('chipStateFromQuery', () => {
  it('round-trips canonical chip output', () => {
    const s: ChipState = { ...empty, types: ['sprite'], active: 'last30', has: ['hasBio'] };
    const q = queryFromChipState(s);
    expect(chipStateFromQuery(q)).toEqual(s);
  });

  it('survives an unrecognized custom clause without losing it', () => {
    const q = 'creates IN (sprite) username ~ jor NOT placeholder';
    const s = chipStateFromQuery(q);
    // chip state captures what it can
    expect(s.types).toEqual(['sprite']);
    expect(s.hidePlaceholder).toBe(true);
    // custom clause survives a re-emit when applied via applyChip
    const next = applyChip(q, 'types', ['sprite', 'sound']);
    expect(next).toContain('username ~ jor');
    expect(next).toContain('creates IN (sprite, sound)');
  });
});

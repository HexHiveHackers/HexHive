import { describe, expect, it } from 'vitest';
import { clearOverrides, loadOverrides, saveOverride } from './overrides';

class MemStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? (this.store.get(k) ?? null) : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
}

describe('overrides', () => {
  it('round-trips a single override', () => {
    const s = new MemStorage();
    saveOverride('h1', 5, { bankMSB: 1, program: 5, label: 'x', reason: 'r' }, s);
    expect(loadOverrides('h1', s)).toEqual({ 5: { bankMSB: 1, program: 5, label: 'x', reason: 'r' } });
  });

  it('isolates overrides by voicegroup hash', () => {
    const s = new MemStorage();
    saveOverride('h1', 5, { bankMSB: 0, program: 5, label: 'a', reason: 'r' }, s);
    saveOverride('h2', 5, { bankMSB: 0, program: 6, label: 'b', reason: 'r' }, s);
    expect(loadOverrides('h1', s)[5].program).toBe(5);
    expect(loadOverrides('h2', s)[5].program).toBe(6);
  });

  it('removes an override when null is passed', () => {
    const s = new MemStorage();
    saveOverride('h1', 5, { bankMSB: 0, program: 5, label: 'a', reason: '' }, s);
    saveOverride('h1', 5, null, s);
    expect(loadOverrides('h1', s)).toEqual({});
  });

  it('drops malformed entries on load', () => {
    const s = new MemStorage();
    s.setItem(
      'hexhive:midi-lab:overrides:v1:h1',
      JSON.stringify({ 5: 'nope', 6: { bankMSB: 1, program: 2, label: 'ok', reason: '' } }),
    );
    expect(loadOverrides('h1', s)).toEqual({ 6: { bankMSB: 1, program: 2, label: 'ok', reason: '' } });
  });

  it('clearOverrides wipes the bucket', () => {
    const s = new MemStorage();
    saveOverride('h1', 5, { bankMSB: 0, program: 5, label: 'a', reason: '' }, s);
    clearOverrides('h1', s);
    expect(loadOverrides('h1', s)).toEqual({});
  });
});

// Per-voicegroup persistence of preset overrides. Keyed by voicegroup hash
// so two MIDIs that share the same voicegroup share their overrides.

import type { MappingChoice } from './preset-map';

const KEY_PREFIX = 'hexhive:midi-lab:overrides:v1:';

interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as { localStorage?: Storage };
  return g.localStorage ?? null;
}

export function loadOverrides(vgHash: string, storage: Storage | null = getStorage()): Record<number, MappingChoice> {
  if (!storage) return {};
  const raw = storage.getItem(KEY_PREFIX + vgHash);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<number, MappingChoice> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const slot = Number.parseInt(k, 10);
      if (!Number.isInteger(slot) || slot < 0 || slot > 127) continue;
      if (!isMappingChoice(v)) continue;
      out[slot] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveOverride(
  vgHash: string,
  slot: number,
  choice: MappingChoice | null,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) return;
  const current = loadOverrides(vgHash, storage);
  if (choice === null) delete current[slot];
  else current[slot] = choice;
  storage.setItem(KEY_PREFIX + vgHash, JSON.stringify(current));
}

export function clearOverrides(vgHash: string, storage: Storage | null = getStorage()): void {
  if (!storage) return;
  storage.removeItem(KEY_PREFIX + vgHash);
}

function isMappingChoice(v: unknown): v is MappingChoice {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.bankMSB === 'number' &&
    typeof o.program === 'number' &&
    typeof o.label === 'string' &&
    typeof o.reason === 'string'
  );
}

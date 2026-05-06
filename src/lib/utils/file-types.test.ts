import { describe, it, expect } from 'vitest';
import { validateUploads, ROMHACK_LIMITS } from './file-types';

describe('validateUploads (romhack)', () => {
  it('accepts a single .ips under cap', () => {
    const r = validateUploads('romhack', [
      { filename: 'patch.ips', contentType: 'application/octet-stream', size: 2_000_000 }
    ]);
    expect(r.ok).toBe(true);
  });

  it('rejects a disallowed extension', () => {
    const r = validateUploads('romhack', [
      { filename: 'evil.exe', contentType: 'application/octet-stream', size: 100 }
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/extension/i);
  });

  it('rejects when file exceeds per-file size cap', () => {
    const r = validateUploads('romhack', [
      { filename: 'huge.ips', contentType: 'application/octet-stream', size: ROMHACK_LIMITS.perFileBytes + 1 }
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });

  it('rejects when total exceeds total-size cap', () => {
    const big = ROMHACK_LIMITS.perFileBytes;
    const files = Array.from({ length: 5 }, (_, i) => ({
      filename: `p${i}.ips`,
      contentType: 'application/octet-stream',
      size: big
    }));
    const r = validateUploads('romhack', files);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/total/i);
  });

  it('rejects empty file list', () => {
    expect(validateUploads('romhack', []).ok).toBe(false);
  });
});

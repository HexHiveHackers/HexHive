import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(async (key: string) => `https://get.example/${key}`),
  headObject: vi.fn(async () => ({})),
}));

beforeEach(() => vi.clearAllMocks());

describe('presignFor', () => {
  it('returns a URL per file with R2 keys under {listingId}/{versionId}/', async () => {
    const { presignFor } = await import('./uploads');
    const out = await presignFor({
      listingId: 'L1',
      versionId: 'V1',
      files: [{ filename: 'patch.ips', contentType: 'application/octet-stream', size: 100 }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].r2Key).toMatch(/^L1\/V1\/[a-z0-9]+-patch\.ips$/);
    expect(out[0].url).toContain('put.example');
  });
});

describe('verifyAllUploaded', () => {
  it('returns true when every HEAD succeeds', async () => {
    const { verifyAllUploaded } = await import('./uploads');
    expect(await verifyAllUploaded(['a', 'b'])).toBe(true);
  });

  it('returns false when any HEAD throws', async () => {
    const r2 = await import('$lib/storage/r2');
    vi.mocked(r2.headObject).mockImplementationOnce(async () => {
      throw new Error('not found');
    });
    const { verifyAllUploaded } = await import('./uploads');
    expect(await verifyAllUploaded(['a', 'b'])).toBe(false);
  });
});

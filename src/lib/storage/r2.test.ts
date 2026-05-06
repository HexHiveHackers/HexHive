import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: {
    R2_ACCOUNT_ID: 'acc',
    R2_ACCESS_KEY_ID: 'k',
    R2_SECRET_ACCESS_KEY: 's',
    R2_BUCKET: 'b',
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example/url'),
}));

beforeEach(() => vi.clearAllMocks());

describe('r2', () => {
  it('signs a PUT URL with the right bucket and key', async () => {
    const { presignPut } = await import('./r2');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const url = await presignPut('uploads/abc.bin', 'application/octet-stream', 1024);
    expect(url).toBe('https://signed.example/url');
    const cmd = (getSignedUrl as any).mock.calls[0][1];
    expect(cmd.input.Bucket).toBe('b');
    expect(cmd.input.Key).toBe('uploads/abc.bin');
    expect(cmd.input.ContentType).toBe('application/octet-stream');
    expect(cmd.input.ContentLength).toBe(1024);
  });

  it('signs a GET URL', async () => {
    const { presignGet } = await import('./r2');
    const url = await presignGet('uploads/abc.bin');
    expect(url).toBe('https://signed.example/url');
  });
});

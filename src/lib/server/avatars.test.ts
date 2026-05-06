import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(async (key: string) => `https://get.example/${key}`),
  headObject: vi.fn(async () => ({})),
}));

beforeEach(() => vi.clearAllMocks());

describe('presignAvatarUpload', () => {
  it('rejects too-large files', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    await expect(
      presignAvatarUpload({
        userId: 'u1',
        contentType: 'image/png',
        size: 10_000_000,
        filename: 'a.png',
      }),
    ).rejects.toThrow(/2 MB/);
  });

  it('rejects unsupported extensions', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    await expect(
      presignAvatarUpload({
        userId: 'u1',
        contentType: 'image/svg+xml',
        size: 100,
        filename: 'a.svg',
      }),
    ).rejects.toThrow(/Unsupported/);
  });

  it('returns key under avatars/{userId}/ and a URL', async () => {
    const { presignAvatarUpload } = await import('./avatars');
    const { key, url } = await presignAvatarUpload({
      userId: 'u1',
      contentType: 'image/png',
      size: 1000,
      filename: 'me.png',
    });
    expect(key).toMatch(/^avatars\/u1\/[a-z0-9]+\.png$/);
    expect(url).toContain('put.example');
  });
});

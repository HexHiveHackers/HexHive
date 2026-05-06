import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEvent } from '../../../../../tests/event';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(),
  headObject: vi.fn(),
}));

const draft = { listingId: 'L', versionId: 'V', slug: 'k' };

vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('$lib/server/listings', async () => ({
  createListingDraft: vi.fn(async () => draft),
  // shim still exported elsewhere; safe to provide:
  createRomhackDraft: vi.fn(async () => draft),
}));

beforeEach(() => vi.clearAllMocks());

describe('_handlePresign (POST /api/uploads/presign)', () => {
  it('401s without a user', async () => {
    const { _handlePresign } = await import('./+server');
    await expect(_handlePresign(buildEvent({ body: { type: 'romhack' }, user: null }))).rejects.toMatchObject({
      status: 303,
    });
  });

  it('400s when validation fails', async () => {
    const { _handlePresign } = await import('./+server');
    await expect(_handlePresign(buildEvent({ body: { type: 'romhack', input: {}, files: [] } }))).rejects.toMatchObject(
      {
        status: 400,
      },
    );
  });

  it('returns presigned URLs for a valid romhack', async () => {
    const { _handlePresign } = await import('./+server');
    const res = await _handlePresign(
      buildEvent({
        body: {
          type: 'romhack',
          input: {
            title: 'Kaizo',
            permissions: ['Credit'],
            baseRom: 'Emerald',
            baseRomVersion: 'v1.0',
            baseRomRegion: 'English',
            release: '1.0.0',
          },
          files: [{ filename: 'patch.ips', contentType: 'application/octet-stream', size: 100 }],
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listingId).toBe('L');
    expect(json.versionId).toBe('V');
    expect(json.uploads).toHaveLength(1);
    expect(json.uploads[0].url).toContain('put.example');
  });
});

describe('_handlePresign — asset-hive types', () => {
  it('presigns a sound', async () => {
    const { _handlePresign } = await import('./+server');
    const res = await _handlePresign(
      buildEvent({
        body: {
          type: 'sound',
          input: {
            title: 'Cries',
            description: '',
            permissions: ['Free'],
            targetedRoms: ['Emerald'],
            category: 'Cry',
          },
          files: [{ filename: 'a.wav', contentType: 'audio/wav', size: 100 }],
        },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('presigns a sprite with valid category', async () => {
    const { _handlePresign } = await import('./+server');
    const res = await _handlePresign(
      buildEvent({
        body: {
          type: 'sprite',
          input: {
            title: 'Pack',
            description: '',
            permissions: ['Free'],
            targetedRoms: ['Emerald'],
            category: { type: 'Battle', subtype: 'Pokemon', variant: 'Front' },
          },
          files: [{ filename: 'a.png', contentType: 'image/png', size: 100 }],
        },
      }),
    );
    expect(res.status).toBe(200);
  });
});

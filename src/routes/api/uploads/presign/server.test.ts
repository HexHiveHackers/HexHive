import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://put.example/${key}`),
  presignGet: vi.fn(),
  headObject: vi.fn()
}));

const fakeDb = {} as any;
const draft = { listingId: 'L', versionId: 'V', slug: 'k' };

vi.mock('$lib/db', () => ({ db: fakeDb }));
vi.mock('$lib/server/listings', async () => ({
  createRomhackDraft: vi.fn(async () => draft)
}));

beforeEach(() => vi.clearAllMocks());

const buildEvent = (body: unknown, user: any = { id: 'u1' }) => ({
  request: new Request('http://x/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }),
  locals: { user, session: null },
  url: new URL('http://x/api/uploads/presign')
}) as any;

describe('POST /api/uploads/presign', () => {
  it('401s without a user', async () => {
    const { POST } = await import('./+server');
    await expect(POST(buildEvent({ type: 'romhack' }, null))).rejects.toMatchObject({ status: 303 });
  });

  it('400s when validation fails', async () => {
    const { POST } = await import('./+server');
    await expect(
      POST(buildEvent({ type: 'romhack', input: {}, files: [] }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('returns presigned URLs for a valid romhack', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      type: 'romhack',
      input: {
        title: 'Kaizo', permissions: ['Credit'],
        baseRom: 'Emerald', baseRomVersion: 'v1.0', baseRomRegion: 'English',
        release: '1.0.0'
      },
      files: [{ filename: 'patch.ips', contentType: 'application/octet-stream', size: 100 }]
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listingId).toBe('L');
    expect(json.versionId).toBe('V');
    expect(json.uploads).toHaveLength(1);
    expect(json.uploads[0].url).toContain('put.example');
  });
});

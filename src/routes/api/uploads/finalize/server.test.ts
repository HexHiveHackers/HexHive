import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(),
  presignGet: vi.fn(),
  headObject: vi.fn(async () => ({}))
}));
vi.mock('$lib/db', () => ({ db: {} as any }));
const finalizeMock = vi.fn(async () => {});
vi.mock('$lib/server/listings', () => ({
  finalizeListing: finalizeMock
}));

beforeEach(() => vi.clearAllMocks());

const buildEvent = (body: unknown, user: any = { id: 'u1' }) => ({
  request: new Request('http://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }),
  locals: { user, session: null },
  url: new URL('http://x/api/uploads/finalize')
}) as any;

describe('POST /api/uploads/finalize', () => {
  it('401s without a user', async () => {
    const { POST } = await import('./+server');
    await expect(POST(buildEvent({}, null))).rejects.toMatchObject({ status: 303 });
  });

  it('502s when an R2 HEAD fails', async () => {
    const { headObject } = await import('$lib/storage/r2');
    (headObject as any).mockImplementationOnce(async () => { throw new Error('no'); });
    const { POST } = await import('./+server');
    await expect(
      POST(buildEvent({
        listingId: 'L', versionId: 'V',
        files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }]
      }))
    ).rejects.toMatchObject({ status: 502 });
    expect(finalizeMock).not.toHaveBeenCalled();
  });

  it('finalizes when all keys exist', async () => {
    const { POST } = await import('./+server');
    const res = await POST(buildEvent({
      listingId: 'L', versionId: 'V',
      files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }]
    }));
    expect(res.status).toBe(200);
    expect(finalizeMock).toHaveBeenCalledOnce();
  });
});

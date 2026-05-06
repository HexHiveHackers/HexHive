import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(),
  presignGet: vi.fn(),
  headObject: vi.fn(async () => ({})),
}));
vi.mock('$lib/db', () => ({ db: {} as unknown }));
const finalizeMock = vi.fn(async () => {});
vi.mock('$lib/server/listings', () => ({
  finalizeListing: finalizeMock,
}));

beforeEach(() => vi.clearAllMocks());

type MockUser = App.Locals['user'];
const fakeUser = (id: string): MockUser => ({ id, name: 'Test', email: 't@x', image: null }) as unknown as MockUser;

// Structural event shape — our handler reads `request`, `locals`, `url`.
// Cast to the handler's specific RequestEvent type at each call site.
function buildEvent(body: unknown, user: MockUser = fakeUser('u1')) {
  return {
    request: new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user, session: null },
    url: new URL('http://x/api/uploads/finalize'),
  };
}

describe('POST /api/uploads/finalize', () => {
  it('401s without a user', async () => {
    const { POST } = await import('./+server');
    type Event = Parameters<typeof POST>[0];
    await expect(POST(buildEvent({}, null) as unknown as Event)).rejects.toMatchObject({
      status: 303,
    });
  });

  it('502s when an R2 HEAD fails', async () => {
    const r2 = await import('$lib/storage/r2');
    vi.mocked(r2.headObject).mockImplementationOnce(async () => {
      throw new Error('no');
    });
    const { POST } = await import('./+server');
    type Event = Parameters<typeof POST>[0];
    await expect(
      POST(
        buildEvent({
          listingId: 'L',
          versionId: 'V',
          files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }],
        }) as unknown as Event,
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(finalizeMock).not.toHaveBeenCalled();
  });

  it('finalizes when all keys exist', async () => {
    const { POST } = await import('./+server');
    type Event = Parameters<typeof POST>[0];
    const res = await POST(
      buildEvent({
        listingId: 'L',
        versionId: 'V',
        files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }],
      }) as unknown as Event,
    );
    expect(res.status).toBe(200);
    expect(finalizeMock).toHaveBeenCalledOnce();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEvent } from '../../../../../tests/event';

vi.mock('$lib/storage/r2', () => ({
  presignPut: vi.fn(),
  presignGet: vi.fn(),
  headObject: vi.fn(async () => ({})),
}));
vi.mock('$lib/db', () => ({ db: {} }));
const finalizeMock = vi.fn(async () => {});
vi.mock('$lib/server/listings', () => ({
  finalizeListing: finalizeMock,
}));

beforeEach(() => vi.clearAllMocks());

describe('handleFinalize (POST /api/uploads/finalize)', () => {
  it('401s without a user', async () => {
    const { handleFinalize } = await import('./+server');
    await expect(handleFinalize(buildEvent({ user: null, body: {} }))).rejects.toMatchObject({
      status: 303,
    });
  });

  it('502s when an R2 HEAD fails', async () => {
    const r2 = await import('$lib/storage/r2');
    vi.mocked(r2.headObject).mockImplementationOnce(async () => {
      throw new Error('no');
    });
    const { handleFinalize } = await import('./+server');
    await expect(
      handleFinalize(
        buildEvent({
          body: {
            listingId: 'L',
            versionId: 'V',
            files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }],
          },
        }),
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(finalizeMock).not.toHaveBeenCalled();
  });

  it('finalizes when all keys exist', async () => {
    const { handleFinalize } = await import('./+server');
    const res = await handleFinalize(
      buildEvent({
        body: {
          listingId: 'L',
          versionId: 'V',
          files: [{ r2Key: 'k', filename: 'a.ips', originalFilename: 'a.ips', size: 1 }],
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(finalizeMock).toHaveBeenCalledOnce();
  });
});

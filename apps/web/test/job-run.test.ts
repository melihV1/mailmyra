import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Koşu defteri sarmalının sözleşmesi: defter EN-İYİ-ÇABA'dır — yazılamazsa
 * iş YİNE koşar; iş başarısızsa defter 'failed' der ve hata YENİDEN fırlar.
 */

const jobCreate = vi.fn();
const jobUpdate = vi.fn();

vi.mock('../lib/db', () => ({
  prisma: {
    jobRun: {
      create: (...a: unknown[]) => jobCreate(...a),
      update: (...a: unknown[]) => jobUpdate(...a),
    },
  },
}));

const { withJobRun } = await import('../lib/job-run');

beforeEach(() => {
  jobCreate.mockReset().mockResolvedValue({ id: 'run1' });
  jobUpdate.mockReset().mockResolvedValue({});
});

describe('withJobRun', () => {
  it('records a complete run around a successful job', async () => {
    await withJobRun('run-reports', 'scheduled', async () => {});

    expect(jobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'run-reports', queue: 'scheduled', state: 'running' }),
      }),
    );
    expect(jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run1' },
        data: expect.objectContaining({ state: 'complete', error: null }),
      }),
    );
  });

  it('records failure and rethrows', async () => {
    await expect(
      withJobRun('run-reports', 'scheduled', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'failed', error: 'boom' }) }),
    );
  });

  it('still runs the job when the ledger is unreachable', async () => {
    jobCreate.mockRejectedValue(new Error('no db'));
    const fn = vi.fn().mockResolvedValue(undefined);

    await withJobRun('run-reports', 'scheduled', fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(jobUpdate).not.toHaveBeenCalled();
  });
});

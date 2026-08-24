import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesinde smoke — HTTP gövdesinden repo çağrısına tip çevirisi
 * (api-support-route emsali). Repo davranışı support-repo.test.ts'te.
 */

const openSupportCase = vi.fn();

vi.mock('../lib/repo/support', () => ({
  openSupportCase: (...args: unknown[]) => openSupportCase(...args),
}));

let session: { user: { id: string } } | null = null;

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => session,
}));

const { POST } = await import('../app/api/support/route');

function jsonReq(body: unknown): Request {
  return new Request('http://test.local/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  session = { user: { id: 'u1' } };
  openSupportCase.mockResolvedValue({ ok: true, id: 'case1', reference: 'SUP-2026-0007' });
});

describe('POST /api/support', () => {
  it('oturumsuz 401, repo hiç çağrılmaz', async () => {
    session = null;
    const res = await POST(jsonReq({ subject: 'x', category: 'billing', message: 'y' }));
    expect(res.status).toBe(401);
    expect(openSupportCase).not.toHaveBeenCalled();
  });

  it('gövdeyi repo argümanlarına çevirir ve referans döner', async () => {
    const res = await POST(jsonReq({ subject: 'Export fails', category: 'export', message: 'Nothing copies.' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reference: 'SUP-2026-0007' });
    expect(openSupportCase).toHaveBeenCalledWith('u1', {
      subject: 'Export fails',
      category: 'export',
      message: 'Nothing copies.',
    });
  });

  it('string olmayan alanlar boş stringe düşer (field sözleşmesi)', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'invalid_input' });
    const res = await POST(jsonReq({ subject: 42, category: null, message: ['x'] }));
    expect(res.status).toBe(400);
    expect(openSupportCase).toHaveBeenCalledWith('u1', { subject: '', category: '', message: '' });
  });

  it('no_org 403 olur', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'no_org' });
    const res = await POST(jsonReq({ subject: 'x', category: 'billing', message: 'y' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'no_org' });
  });

  it('invalid_input 400 olur', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'invalid_input' });
    const res = await POST(jsonReq({ subject: '', category: 'billing', message: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_input' });
  });
});

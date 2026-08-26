import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesinde smoke — HTTP gövdesinden repo çağrısına tip çevirisi
 * (api-support-route emsali). Repo davranışı support-repo.test.ts'te.
 */

const openSupportCase = vi.fn();
const addCustomerMessage = vi.fn();

vi.mock('../lib/repo/support', () => ({
  openSupportCase: (...args: unknown[]) => openSupportCase(...args),
  addCustomerMessage: (...args: unknown[]) => addCustomerMessage(...args),
}));

let session: { user: { id: string } } | null = null;

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => session,
}));

const { POST } = await import('../app/api/support/route');
const { POST: postMessage } = await import('../app/api/support/[id]/messages/route');

function jsonReq(body: unknown): Request {
  return new Request('http://test.local/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function jsonReqTo(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  session = { user: { id: 'u1' } };
  openSupportCase.mockResolvedValue({ ok: true, id: 'case1', reference: 'SUP-2026-0007' });
  addCustomerMessage.mockResolvedValue({ ok: true, id: 'msg1' });
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

describe('POST /api/support/[id]/messages', () => {
  it('oturumsuz 401, repo hiç çağrılmaz', async () => {
    session = null;
    const res = await postMessage(
      jsonReqTo('http://test.local/api/support/case1/messages', { body: 'Merhaba' }),
      params('case1'),
    );
    expect(res.status).toBe(401);
    expect(addCustomerMessage).not.toHaveBeenCalled();
  });

  it('gövdeyi repo argümanlarına birebir çevirir (kullanıcı, vaka, gövde)', async () => {
    const res = await postMessage(
      jsonReqTo('http://test.local/api/support/case1/messages', { body: 'Merhaba' }),
      params('case1'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: 'msg1' });
    expect(addCustomerMessage).toHaveBeenCalledWith('u1', 'case1', 'Merhaba');
  });

  it('not_found 404 olur', async () => {
    addCustomerMessage.mockResolvedValue({ ok: false, reason: 'not_found' });
    const res = await postMessage(
      jsonReqTo('http://test.local/api/support/case1/messages', { body: 'Merhaba' }),
      params('case1'),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('invalid_input 400 olur', async () => {
    addCustomerMessage.mockResolvedValue({ ok: false, reason: 'invalid_input' });
    const res = await postMessage(
      jsonReqTo('http://test.local/api/support/case1/messages', { body: '' }),
      params('case1'),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_input' });
  });
});

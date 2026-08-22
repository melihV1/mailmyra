import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesinde smoke test — `createSupportCase`/`setSupportCase*`/
 * `setErrorGroupState`e ne GEÇTİĞİ önemli, repo davranışı değil (o
 * admin-support-writes.test.ts / admin-errors-leads-writes.test.ts'te,
 * gerçek transaction taklidiyle test ediliyor). Amaç yalnız HTTP
 * gövdesinden repo çağrısına giden tip çevirisi (api-approvals-route emsali).
 */

const createSupportCase = vi.fn();
const setSupportCaseStatus = vi.fn();
const assignSupportCaseOwner = vi.fn();
const setSupportCasePriority = vi.fn();
const setErrorGroupState = vi.fn();

vi.mock('../lib/repo/admin', () => ({
  createSupportCase: (...args: unknown[]) => createSupportCase(...args),
  setSupportCaseStatus: (...args: unknown[]) => setSupportCaseStatus(...args),
  assignSupportCaseOwner: (...args: unknown[]) => assignSupportCaseOwner(...args),
  setSupportCasePriority: (...args: unknown[]) => setSupportCasePriority(...args),
  setErrorGroupState: (...args: unknown[]) => setErrorGroupState(...args),
  NotStaffError: class NotStaffError extends Error {},
}));

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => ({
    id: 'sess1',
    user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

const { POST: postCase } = await import('../app/api/admin/support/route');
const { POST: postStatus } = await import('../app/api/admin/support/[id]/status/route');
const { POST: postOwner } = await import('../app/api/admin/support/[id]/owner/route');
const { POST: postPriority } = await import('../app/api/admin/support/[id]/priority/route');
const { POST: postErrorState } = await import('../app/api/admin/errors/[id]/state/route');

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  createSupportCase.mockReset();
  setSupportCaseStatus.mockReset();
  assignSupportCaseOwner.mockReset();
  setSupportCasePriority.mockReset();
  setErrorGroupState.mockReset();
  createSupportCase.mockResolvedValue({ id: 'case1' });
});

describe('POST /api/admin/support — gövde → repo argümanı', () => {
  it('tam gövde repo çağrısına birebir gider', async () => {
    const res = await postCase(
      jsonReq('https://app.mailmyra.com/api/admin/support', {
        reference: 'REF-1',
        subject: 'Konu',
        requesterEmail: 'musteri@ornek.com',
        channel: 'email',
        category: 'billing',
        priority: 'urgent',
        orgId: 'org1',
        summary: 'özet',
        reason: 'destek talebi',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, id: 'case1' });
    expect(createSupportCase).toHaveBeenCalledWith(
      'u1',
      {
        reference: 'REF-1',
        subject: 'Konu',
        requesterEmail: 'musteri@ornek.com',
        channel: 'email',
        category: 'billing',
        priority: 'urgent',
        orgId: 'org1',
        summary: 'özet',
      },
      'destek talebi',
      expect.anything(),
    );
  });

  it("geçersiz kanal 400 döner, repo çağrılmaz", async () => {
    const res = await postCase(
      jsonReq('https://app.mailmyra.com/api/admin/support', {
        reference: 'REF-1',
        subject: 'Konu',
        requesterEmail: 'musteri@ornek.com',
        channel: 'carrier-pigeon',
        category: 'billing',
        priority: 'urgent',
        reason: 'destek talebi',
      }),
    );

    expect(res.status).toBe(400);
    expect(createSupportCase).not.toHaveBeenCalled();
  });

  it('geçersiz öncelik 400 döner, repo çağrılmaz', async () => {
    const res = await postCase(
      jsonReq('https://app.mailmyra.com/api/admin/support', {
        reference: 'REF-1',
        subject: 'Konu',
        requesterEmail: 'musteri@ornek.com',
        channel: 'email',
        category: 'billing',
        priority: 'asap',
        reason: 'destek talebi',
      }),
    );

    expect(res.status).toBe(400);
    expect(createSupportCase).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/support/[id]/status', () => {
  it('geçerli durum repo çağrısına gider', async () => {
    const res = await postStatus(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/status', {
        status: 'escalated',
        reason: 'müşteri ısrarcı',
      }),
      params('case1'),
    );

    expect(res.status).toBe(200);
    expect(setSupportCaseStatus).toHaveBeenCalledWith(
      'u1',
      'case1',
      'escalated',
      'müşteri ısrarcı',
      expect.anything(),
    );
  });

  it('geçersiz durum 400 döner, repo çağrılmaz', async () => {
    const res = await postStatus(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/status', {
        status: 'archived',
        reason: 'x',
      }),
      params('case1'),
    );

    expect(res.status).toBe(400);
    expect(setSupportCaseStatus).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/support/[id]/owner', () => {
  it('sahip e-postası repo çağrısına birebir gider', async () => {
    const res = await postOwner(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/owner', {
        ownerEmail: 'staff2@voldi.net',
        reason: 'devir',
      }),
      params('case1'),
    );

    expect(res.status).toBe(200);
    expect(assignSupportCaseOwner).toHaveBeenCalledWith(
      'u1',
      'case1',
      'staff2@voldi.net',
      'devir',
      expect.anything(),
    );
  });
});

describe('POST /api/admin/support/[id]/priority', () => {
  it('geçerli öncelik repo çağrısına gider', async () => {
    const res = await postPriority(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/priority', {
        priority: 'high',
        reason: 'yükseltildi',
      }),
      params('case1'),
    );

    expect(res.status).toBe(200);
    expect(setSupportCasePriority).toHaveBeenCalledWith(
      'u1',
      'case1',
      'high',
      'yükseltildi',
      expect.anything(),
    );
  });

  it('geçersiz öncelik 400 döner, repo çağrılmaz', async () => {
    const res = await postPriority(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/priority', {
        priority: 'meh',
        reason: 'x',
      }),
      params('case1'),
    );

    expect(res.status).toBe(400);
    expect(setSupportCasePriority).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/errors/[id]/state', () => {
  it('geçerli durum repo çağrısına gider', async () => {
    const res = await postErrorState(
      jsonReq('https://app.mailmyra.com/api/admin/errors/grp1/state', {
        state: 'investigating',
        reason: 'inceleniyor',
      }),
      params('grp1'),
    );

    expect(res.status).toBe(200);
    expect(setErrorGroupState).toHaveBeenCalledWith(
      'u1',
      'grp1',
      'investigating',
      'inceleniyor',
      expect.anything(),
    );
  });

  it('geçersiz durum 400 döner, repo çağrılmaz', async () => {
    const res = await postErrorState(
      jsonReq('https://app.mailmyra.com/api/admin/errors/grp1/state', {
        state: 'archived',
        reason: 'x',
      }),
      params('grp1'),
    );

    expect(res.status).toBe(400);
    expect(setErrorGroupState).not.toHaveBeenCalled();
  });
});

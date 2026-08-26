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
const listSupportMessages = vi.fn();
const addStaffReply = vi.fn();

class NotStaffError extends Error {}

vi.mock('../lib/repo/admin', () => ({
  createSupportCase: (...args: unknown[]) => createSupportCase(...args),
  setSupportCaseStatus: (...args: unknown[]) => setSupportCaseStatus(...args),
  assignSupportCaseOwner: (...args: unknown[]) => assignSupportCaseOwner(...args),
  setSupportCasePriority: (...args: unknown[]) => setSupportCasePriority(...args),
  setErrorGroupState: (...args: unknown[]) => setErrorGroupState(...args),
  listSupportMessages: (...args: unknown[]) => listSupportMessages(...args),
  addStaffReply: (...args: unknown[]) => addStaffReply(...args),
  NotStaffError,
}));

const STAFF_SESSION = {
  id: 'sess1',
  user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
  expiresAt: new Date(Date.now() + 60_000),
};
let session: typeof STAFF_SESSION | null = STAFF_SESSION;

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => session,
}));

const { POST: postCase } = await import('../app/api/admin/support/route');
const { POST: postStatus } = await import('../app/api/admin/support/[id]/status/route');
const { POST: postOwner } = await import('../app/api/admin/support/[id]/owner/route');
const { POST: postPriority } = await import('../app/api/admin/support/[id]/priority/route');
const { POST: postErrorState } = await import('../app/api/admin/errors/[id]/state/route');
const { GET: getMessages } = await import('../app/api/admin/support/[id]/messages/route');
const { POST: postReply } = await import('../app/api/admin/support/[id]/reply/route');

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(url: string): Request {
  return new Request(url);
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
  listSupportMessages.mockReset();
  addStaffReply.mockReset();
  createSupportCase.mockResolvedValue({ id: 'case1' });
  session = STAFF_SESSION;
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

describe('GET /api/admin/support/[id]/messages', () => {
  it('oturumsuz 401, repo hiç çağrılmaz', async () => {
    session = null;
    const res = await getMessages(
      getReq('https://app.mailmyra.com/api/admin/support/case1/messages'),
      params('case1'),
    );
    expect(res.status).toBe(401);
    expect(listSupportMessages).not.toHaveBeenCalled();
  });

  it('kullanıcı + vaka repo çağrısına birebir gider, sonuç ISO tarihle döner', async () => {
    listSupportMessages.mockResolvedValue([
      {
        id: 'msg1',
        authorType: 'customer',
        authorEmail: 'musteri@ornek.com',
        body: 'Merhaba',
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);
    const res = await getMessages(
      getReq('https://app.mailmyra.com/api/admin/support/case1/messages'),
      params('case1'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      messages: [
        {
          id: 'msg1',
          authorType: 'customer',
          authorEmail: 'musteri@ornek.com',
          body: 'Merhaba',
          createdAt: '2026-08-20T10:00:00.000Z',
        },
      ],
    });
    expect(listSupportMessages).toHaveBeenCalledWith('u1', 'case1', expect.anything());
  });

  it('NotStaffError 404 olur', async () => {
    listSupportMessages.mockRejectedValue(new NotStaffError('personel değil'));
    const res = await getMessages(
      getReq('https://app.mailmyra.com/api/admin/support/case1/messages'),
      params('case1'),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('vaka bulunamazsa 400 olur (sibling adminError konvansiyonu)', async () => {
    listSupportMessages.mockRejectedValue(new Error('Destek vakası case1 bulunamadı.'));
    const res = await getMessages(
      getReq('https://app.mailmyra.com/api/admin/support/case1/messages'),
      params('case1'),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Destek vakası case1 bulunamadı.' });
  });
});

describe('POST /api/admin/support/[id]/reply', () => {
  it('oturumsuz 401, repo hiç çağrılmaz', async () => {
    session = null;
    const res = await postReply(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/reply', { body: 'Merhaba, ilgileniyoruz.' }),
      params('case1'),
    );
    expect(res.status).toBe(401);
    expect(addStaffReply).not.toHaveBeenCalled();
  });

  it('kullanıcı + vaka + gövde repo çağrısına birebir gider', async () => {
    addStaffReply.mockResolvedValue({ id: 'msg2' });
    const res = await postReply(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/reply', { body: 'Merhaba, ilgileniyoruz.' }),
      params('case1'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: 'msg2' });
    expect(addStaffReply).toHaveBeenCalledWith('u1', 'case1', 'Merhaba, ilgileniyoruz.', expect.anything());
  });

  it('NotStaffError 404 olur', async () => {
    addStaffReply.mockRejectedValue(new NotStaffError('personel değil'));
    const res = await postReply(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/reply', { body: 'x' }),
      params('case1'),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('boş cevap metni 400 olur, repo hatası mesajı taşır', async () => {
    addStaffReply.mockRejectedValue(new Error('Cevap metni zorunlu.'));
    const res = await postReply(
      jsonReq('https://app.mailmyra.com/api/admin/support/case1/reply', { body: '' }),
      params('case1'),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cevap metni zorunlu.' });
  });
});

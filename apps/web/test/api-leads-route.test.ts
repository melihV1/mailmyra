import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresyon: `field()` yalnız string döner — `seats` panelden JSON SAYI
 * gelir, `field()` ile okunsaydı sessizce '' → `undefined` olurdu
 * (api-approvals-route.test.ts'teki `requiredApprovals` dersinin aynısı).
 * Route seviyesinde: `createLead`/`updateLead`e ne GEÇTİĞİ önemli, repo
 * davranışı değil (o admin-errors-leads-writes.test.ts'te test ediliyor).
 */

const createLead = vi.fn();
const updateLead = vi.fn();

vi.mock('../lib/repo/admin', () => ({
  createLead: (...args: unknown[]) => createLead(...args),
  updateLead: (...args: unknown[]) => updateLead(...args),
  NotStaffError: class NotStaffError extends Error {},
}));

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => ({
    id: 'sess1',
    user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

const { POST: postCreate } = await import('../app/api/admin/leads/route');
const { POST: postUpdate } = await import('../app/api/admin/leads/[id]/route');

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
  createLead.mockReset();
  updateLead.mockReset();
  createLead.mockResolvedValue({ id: 'lead1' });
});

describe('POST /api/admin/leads — gövde → repo argümanı', () => {
  it('tam gövde repo çağrısına birebir gider, seats sayı olarak kalır', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/leads', {
        company: 'Acme A.Ş.',
        contact: 'ayşe@acme.com',
        source: 'referral',
        seats: 25,
        stage: 'qualified',
        nextStep: 'demo planla',
        reason: 'yeni fırsat',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, id: 'lead1' });
    expect(createLead).toHaveBeenCalledWith(
      'u1',
      {
        company: 'Acme A.Ş.',
        contact: 'ayşe@acme.com',
        source: 'referral',
        seats: 25,
        stage: 'qualified',
        nextStep: 'demo planla',
      },
      'yeni fırsat',
      expect.anything(),
    );
  });

  it("seats string olarak gelirse repo çağrısına undefined olarak gider (JSON sayı yerine çöp değer)", async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/leads', {
        company: 'Acme A.Ş.',
        contact: 'ayşe@acme.com',
        source: 'referral',
        seats: 'çok',
        reason: 'yeni fırsat',
      }),
    );

    expect(res.status).toBe(200);
    expect(createLead).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ seats: undefined }),
      'yeni fırsat',
      expect.anything(),
    );
  });

  it('geçersiz stage repo çağrısına undefined olarak gider (repo kendi varsayılanına düşer)', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/leads', {
        company: 'Acme A.Ş.',
        contact: 'ayşe@acme.com',
        source: 'referral',
        stage: 'archived',
        reason: 'yeni fırsat',
      }),
    );

    expect(res.status).toBe(200);
    expect(createLead).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ stage: undefined }),
      'yeni fırsat',
      expect.anything(),
    );
  });

  it("'lost' aşama birliğine dahil — repo çağrısına aynen gider", async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/leads', {
        company: 'Acme A.Ş.',
        contact: 'ayşe@acme.com',
        source: 'referral',
        stage: 'lost',
        reason: 'kaybedildi',
      }),
    );

    expect(res.status).toBe(200);
    expect(createLead).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ stage: 'lost' }),
      'kaybedildi',
      expect.anything(),
    );
  });
});

describe('POST /api/admin/leads/[id] — gövde → repo argümanı', () => {
  beforeEach(() => {
    updateLead.mockResolvedValue(undefined);
  });

  it('tam patch repo çağrısına birebir gider, seats sayı olarak kalır', async () => {
    const res = await postUpdate(
      jsonReq('https://app.mailmyra.com/api/admin/leads/lead1', {
        stage: 'won',
        nextStep: 'sözleşme gönder',
        seats: 40,
        reason: 'kazanıldı',
      }),
      params('lead1'),
    );

    expect(res.status).toBe(200);
    expect(updateLead).toHaveBeenCalledWith(
      'u1',
      'lead1',
      { stage: 'won', nextStep: 'sözleşme gönder', seats: 40 },
      'kazanıldı',
      expect.anything(),
    );
  });

  it('seats string olarak gelirse repo çağrısına undefined olarak gider', async () => {
    const res = await postUpdate(
      jsonReq('https://app.mailmyra.com/api/admin/leads/lead1', {
        stage: 'won',
        seats: 'çok',
        reason: 'kazanıldı',
      }),
      params('lead1'),
    );

    expect(res.status).toBe(200);
    expect(updateLead).toHaveBeenCalledWith(
      'u1',
      'lead1',
      expect.objectContaining({ seats: undefined }),
      'kazanıldı',
      expect.anything(),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Müşteri destek repo sözleşmesi (Dalga A, ticket v1): kapı = oturum + org
 * üyeliği · referans OTOMATİK (SUP-<yıl>-<sıra>, P2002'de +1 ile yeniden) ·
 * channel/priority sabit ('form'/'normal') · slaDueAt kod hesaplar ·
 * requesterEmail/org oturumdan · günlük yazılamazsa vaka YİNE açılır ·
 * listeleme yalnız kendi org'u.
 *
 * Ticket v2 (spec 2026-08-26 §3/§4) eklenen sözleşme: detay + mesaj yazma
 * hâlâ oturum + KENDİ org kapısından geçer (sorguda `{ id, orgId }`, sonradan
 * filtre değil) · `authorEmail` müşteri tipine SIZMAZ · mesaj + durum
 * otomasyonu (`waiting_customer|resolved` → `open`, diğerleri değişmez) TEK
 * transaction'da · gövde trim + 2000'e kırpılır, boşsa `invalid_input`.
 */

const membershipFindFirst = vi.fn();
const userFindUnique = vi.fn();
const orgFindUnique = vi.fn();
const caseCreate = vi.fn();
const caseFindMany = vi.fn();
const caseFindFirst = vi.fn();
const activityCreate = vi.fn();
const messageFindMany = vi.fn();

const tx = {
  supportMessage: { create: vi.fn() },
  supportCase: { update: vi.fn() },
};
const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    membership: {
      findFirst: (...a: unknown[]) => membershipFindFirst(...a),
      findUnique: vi.fn(),
    },
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    supportCase: {
      create: (...a: unknown[]) => caseCreate(...a),
      findMany: (...a: unknown[]) => caseFindMany(...a),
      findFirst: (...a: unknown[]) => caseFindFirst(...a),
    },
    supportMessage: {
      findMany: (...a: unknown[]) => messageFindMany(...a),
    },
    activityEvent: { create: (...a: unknown[]) => activityCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const support = await import('../lib/repo/support');

const NOW = new Date(Date.UTC(2026, 7, 24, 9, 0));
const VALID = { subject: 'Export fails', category: 'export', message: 'Copy button does nothing.' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  membershipFindFirst.mockResolvedValue({ orgId: 'org1' });
  userFindUnique.mockResolvedValue({ email: 'owner@acme.com' });
  orgFindUnique.mockResolvedValue({ name: 'Acme' });
  // En yüksek kuyruk 6 → sıradaki 7 (eski count=6 senaryosuyla eşdeğer).
  caseFindMany.mockResolvedValue([{ reference: 'SUP-2026-0006' }]);
  caseCreate.mockImplementation(async (args: { data: { reference: string } }) => ({
    id: 'case1',
    reference: args.data.reference,
  }));
  activityCreate.mockResolvedValue({});
  caseFindFirst.mockResolvedValue(null);
  messageFindMany.mockResolvedValue([]);
  tx.supportMessage.create.mockResolvedValue({ id: 'msg1' });
  tx.supportCase.update.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

const p2002 = () => Object.assign(new Error('dup'), { code: 'P2002' });

describe('openSupportCase', () => {
  it('org üyeliği yoksa no_org döner, hiçbir yazma olmaz', async () => {
    membershipFindFirst.mockResolvedValue(null);
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: false, reason: 'no_org' });
    expect(caseCreate).not.toHaveBeenCalled();
    expect(activityCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['boş konu', { ...VALID, subject: '   ' }],
    ['boş mesaj', { ...VALID, message: '' }],
    ['geçersiz kategori', { ...VALID, category: 'weird' }],
  ])('%s → invalid_input', async (_name, input) => {
    const r = await support.openSupportCase('u1', input);
    expect(r).toEqual({ ok: false, reason: 'invalid_input' });
    expect(caseCreate).not.toHaveBeenCalled();
  });

  it('vakayı sabitler ve oturum verisiyle açar; referans en yüksek kuyruktan türer', async () => {
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: true, id: 'case1', reference: 'SUP-2026-0007' });
    const data = caseCreate.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      reference: 'SUP-2026-0007',
      subject: 'Export fails',
      orgId: 'org1',
      orgName: 'Acme',
      requesterEmail: 'owner@acme.com',
      channel: 'form',
      category: 'export',
      priority: 'normal',
      summary: 'Copy button does nothing.',
    });
    // SLA: normal = 48 saat, now'dan.
    expect(data.slaDueAt).toEqual(new Date(NOW.getTime() + 48 * 60 * 60 * 1000));
    expect(caseFindMany.mock.calls[0]![0]).toMatchObject({
      where: { reference: { startsWith: 'SUP-2026-' } },
      select: { reference: true },
    });
  });

  it('sıra boşluklu olsa da (staff elle referans girmiş) en yüksek kuyruktan devam eder', async () => {
    caseFindMany.mockResolvedValue([
      { reference: 'SUP-2026-0001' },
      { reference: 'SUP-2026-0002' },
      { reference: 'SUP-2026-0010' },
    ]);
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: true, id: 'case1', reference: 'SUP-2026-0011' });
  });

  it('ayrıştırılamayan referans kuyruğu yok sayılır', async () => {
    caseFindMany.mockResolvedValue([
      { reference: 'SUP-2026-0001' },
      { reference: 'SUP-2026-XYZ' },
      { reference: 'SUP-2026-0010' },
    ]);
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: true, id: 'case1', reference: 'SUP-2026-0011' });
  });

  it('konu/mesaj kırpılır ve sınırlanır (200/500)', async () => {
    await support.openSupportCase('u1', {
      ...VALID,
      subject: `  ${'a'.repeat(300)}  `,
      message: 'b'.repeat(600),
    });
    const data = caseCreate.mock.calls[0]![0].data;
    expect(data.subject).toBe('a'.repeat(200));
    expect(data.summary).toBe('b'.repeat(500));
  });

  it('P2002 çakışmasında sırayı +1 artırıp yeniden dener', async () => {
    caseCreate.mockRejectedValueOnce(p2002());
    const r = await support.openSupportCase('u1', VALID);
    expect(r.ok).toBe(true);
    expect(caseCreate.mock.calls[0]![0].data.reference).toBe('SUP-2026-0007');
    expect(caseCreate.mock.calls[1]![0].data.reference).toBe('SUP-2026-0008');
  });

  it('5 çakışmada pes eder ve fırlatır', async () => {
    caseCreate.mockRejectedValue(p2002());
    await expect(support.openSupportCase('u1', VALID)).rejects.toThrow();
    expect(caseCreate).toHaveBeenCalledTimes(5);
  });

  it('P2002 olmayan hata aynen fırlar, yeniden denenmez', async () => {
    caseCreate.mockRejectedValue(new Error('db down'));
    await expect(support.openSupportCase('u1', VALID)).rejects.toThrow('db down');
    expect(caseCreate).toHaveBeenCalledTimes(1);
  });

  it("org günlüğüne support.case_opened düşer", async () => {
    await support.openSupportCase('u1', VALID);
    expect(activityCreate).toHaveBeenCalledTimes(1);
    expect(activityCreate.mock.calls[0]![0].data).toMatchObject({
      orgId: 'org1',
      actorUserId: 'u1',
      type: 'support.case_opened',
      targetType: 'support',
      targetId: 'case1',
      payload: { reference: 'SUP-2026-0007', subject: 'Export fails', category: 'export' },
    });
  });

  it('günlük yazılamazsa vaka yine açılır (recordActivity yutar)', async () => {
    activityCreate.mockRejectedValue(new Error('ledger down'));
    const r = await support.openSupportCase('u1', VALID);
    expect(r.ok).toBe(true);
  });
});

describe('listOwnSupportCases', () => {
  it('org yoksa null', async () => {
    membershipFindFirst.mockResolvedValue(null);
    expect(await support.listOwnSupportCases('u1')).toBeNull();
    expect(caseFindMany).not.toHaveBeenCalled();
  });

  it('yalnız kendi org’unu, yeniden eskiye, 50 tavanla sorgular', async () => {
    caseFindMany.mockResolvedValue([
      {
        id: 'c1', reference: 'SUP-2026-0007', subject: 'Export fails',
        category: 'export', status: 'open',
        createdAt: NOW, updatedAt: NOW,
      },
    ]);
    const rows = await support.listOwnSupportCases('u1');
    expect(caseFindMany.mock.calls[0]![0]).toMatchObject({
      where: { orgId: 'org1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(rows).toEqual([
      {
        id: 'c1', reference: 'SUP-2026-0007', subject: 'Export fails',
        category: 'export', status: 'open',
        createdAt: NOW, updatedAt: NOW,
      },
    ]);
  });
});

const caseRow = (over: Record<string, unknown> = {}) => ({
  id: 'case1',
  reference: 'SUP-2026-0007',
  subject: 'Export fails',
  category: 'export',
  status: 'open',
  createdAt: NOW,
  updatedAt: NOW,
  summary: 'Copy button does nothing.',
  ...over,
});

describe('getOwnSupportCase', () => {
  it('org üyeliği yoksa null döner, vaka sorgulanmaz', async () => {
    membershipFindFirst.mockResolvedValue(null);
    const r = await support.getOwnSupportCase('u1', 'case1');
    expect(r).toBeNull();
    expect(caseFindFirst).not.toHaveBeenCalled();
  });

  it('başka org veya bilinmeyen vaka → null (kapı sorguda: { id, orgId })', async () => {
    caseFindFirst.mockResolvedValue(null);
    const r = await support.getOwnSupportCase('u1', 'case1');
    expect(r).toBeNull();
    expect(caseFindFirst.mock.calls[0]![0]).toMatchObject({
      where: { id: 'case1', orgId: 'org1' },
    });
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('detay: summary taşır, mesajlar createdAt asc, authorEmail SIZMAZ', async () => {
    caseFindFirst.mockResolvedValue(caseRow());
    messageFindMany.mockResolvedValue([
      {
        id: 'm1',
        authorType: 'customer',
        authorEmail: 'owner@acme.com',
        body: 'Hello',
        createdAt: new Date(Date.UTC(2026, 7, 24, 9, 5)),
      },
      {
        id: 'm2',
        authorType: 'staff',
        authorEmail: 'staff@voldi.net',
        body: 'Looking into it',
        createdAt: new Date(Date.UTC(2026, 7, 24, 9, 10)),
      },
    ]);

    const r = await support.getOwnSupportCase('u1', 'case1');

    expect(messageFindMany.mock.calls[0]![0]).toMatchObject({
      where: { caseId: 'case1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(r?.summary).toBe('Copy button does nothing.');
    expect(r?.messages).toHaveLength(2);
    expect(r?.messages[0]).toEqual({
      id: 'm1',
      authorType: 'customer',
      body: 'Hello',
      createdAt: new Date(Date.UTC(2026, 7, 24, 9, 5)),
    });
    for (const m of r?.messages ?? []) {
      expect(Object.prototype.hasOwnProperty.call(m, 'authorEmail')).toBe(false);
    }
  });
});

describe('addCustomerMessage', () => {
  it('org üyeliği yoksa not_found döner, hiçbir yazma olmaz', async () => {
    membershipFindFirst.mockResolvedValue(null);
    const r = await support.addCustomerMessage('u1', 'case1', 'Merhaba');
    expect(r).toEqual({ ok: false, reason: 'not_found' });
    expect(transaction).not.toHaveBeenCalled();
    expect(tx.supportMessage.create).not.toHaveBeenCalled();
  });

  it('başka org veya bilinmeyen vaka → not_found, create çağrılmaz', async () => {
    caseFindFirst.mockResolvedValue(null);
    const r = await support.addCustomerMessage('u1', 'case1', 'Merhaba');
    expect(r).toEqual({ ok: false, reason: 'not_found' });
    expect(caseFindFirst.mock.calls[0]![0]).toMatchObject({
      where: { id: 'case1', orgId: 'org1' },
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(tx.supportMessage.create).not.toHaveBeenCalled();
  });

  it('boş (yalnız boşluk) gövde → invalid_input, hiçbir sorgu atılmaz', async () => {
    const r = await support.addCustomerMessage('u1', 'case1', '   ');
    expect(r).toEqual({ ok: false, reason: 'invalid_input' });
    expect(membershipFindFirst).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('2001 karakter → saklanan gövde tam olarak 2000 karakter', async () => {
    caseFindFirst.mockResolvedValue({ id: 'case1', status: 'open' });
    const long = 'a'.repeat(2001);
    const r = await support.addCustomerMessage('u1', 'case1', long);
    expect(r).toEqual({ ok: true, id: 'msg1' });
    const data = tx.supportMessage.create.mock.calls[0]![0].data;
    expect(data.body).toHaveLength(2000);
    expect(data.body).toBe('a'.repeat(2000));
  });

  it('mesaj yazarı müşterinin kendi e-postasıdır (staff kimliği değil)', async () => {
    caseFindFirst.mockResolvedValue({ id: 'case1', status: 'open' });
    await support.addCustomerMessage('u1', 'case1', 'Merhaba');
    const data = tx.supportMessage.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      caseId: 'case1',
      authorType: 'customer',
      authorEmail: 'owner@acme.com',
      body: 'Merhaba',
    });
  });

  it.each([
    ['waiting_customer', 'open'],
    ['resolved', 'open'],
  ])('otomasyon: %s → %s, tek transaction içinde mesaj + durum', async (from, to) => {
    caseFindFirst.mockResolvedValue({ id: 'case1', status: from });
    const r = await support.addCustomerMessage('u1', 'case1', 'Merhaba');
    expect(r).toEqual({ ok: true, id: 'msg1' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.supportMessage.create).toHaveBeenCalledTimes(1);
    expect(tx.supportCase.update).toHaveBeenCalledTimes(1);
    expect(tx.supportCase.update.mock.calls[0]![0]).toMatchObject({
      where: { id: 'case1' },
      data: { status: to },
    });
  });

  it.each(['open', 'escalated'])(
    'otomasyon: %s durumu değişmez — supportCase.update HİÇ çağrılmaz',
    async (status) => {
      caseFindFirst.mockResolvedValue({ id: 'case1', status });
      const r = await support.addCustomerMessage('u1', 'case1', 'Merhaba');
      expect(r).toEqual({ ok: true, id: 'msg1' });
      expect(tx.supportMessage.create).toHaveBeenCalledTimes(1);
      expect(tx.supportCase.update).not.toHaveBeenCalled();
    },
  );
});

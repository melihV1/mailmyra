import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Müşteri destek repo sözleşmesi (Dalga A, ticket v1): kapı = oturum + org
 * üyeliği · referans OTOMATİK (SUP-<yıl>-<sıra>, P2002'de +1 ile yeniden) ·
 * channel/priority sabit ('form'/'normal') · slaDueAt kod hesaplar ·
 * requesterEmail/org oturumdan · günlük yazılamazsa vaka YİNE açılır ·
 * listeleme yalnız kendi org'u.
 */

const membershipFindFirst = vi.fn();
const userFindUnique = vi.fn();
const orgFindUnique = vi.fn();
const caseCount = vi.fn();
const caseCreate = vi.fn();
const caseFindMany = vi.fn();
const activityCreate = vi.fn();

vi.mock('../lib/db', () => ({
  prisma: {
    membership: {
      findFirst: (...a: unknown[]) => membershipFindFirst(...a),
      findUnique: vi.fn(),
    },
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    supportCase: {
      count: (...a: unknown[]) => caseCount(...a),
      create: (...a: unknown[]) => caseCreate(...a),
      findMany: (...a: unknown[]) => caseFindMany(...a),
    },
    activityEvent: { create: (...a: unknown[]) => activityCreate(...a) },
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
  caseCount.mockResolvedValue(6);
  caseCreate.mockImplementation(async (args: { data: { reference: string } }) => ({
    id: 'case1',
    reference: args.data.reference,
  }));
  activityCreate.mockResolvedValue({});
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

  it('vakayı sabitler ve oturum verisiyle açar; referans sayımdan türer', async () => {
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

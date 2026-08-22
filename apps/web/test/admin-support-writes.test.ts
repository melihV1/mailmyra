import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Destek vakası yazmalarının sözleşmesi: slaDueAt KOD hesaplar (SLA saati) ·
 * requesterEmail hiçbir denetim payload'ına girmez · izinli geçiş haritası
 * dışına çıkılmaz · sahip yalnız staff · resolved vakaya sahip/öncelik
 * atanamaz · öncelik değişince slaDueAt createdAt'ten YENİDEN hesaplanır
 * (now'dan DEĞİL) · referans P2002 dostu mesaj · bilinmeyen org tx içinde
 * reddedilir.
 */

const userFindUnique = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  supportCase: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const admin = await import('../lib/repo/admin');

const REQUESTER_EMAIL = 'musteri@ornek.com';
const CREATED_AT = new Date(Date.UTC(2026, 7, 20, 9, 0));

const openCase = (over: Record<string, unknown> = {}) => ({
  status: 'open',
  priority: 'normal',
  slaDueAt: new Date(Date.UTC(2026, 7, 22, 9, 0)),
  createdAt: CREATED_AT,
  orgId: null,
  orgName: '',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.user.findFirst.mockResolvedValue({ id: 'u2', email: 'destek@voldi.net' });
  tx.supportCase.create.mockResolvedValue({ id: 'case1' });
  tx.supportCase.findUnique.mockResolvedValue(openCase());
  tx.supportCase.update.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

/** Tüm denetim payload'larında kişisel veri taraması (KVKK emsali). */
function assertNoRequesterEmailInLedgers() {
  const payloads = tx.adminAction.create.mock.calls.map((c) => JSON.stringify(c[0]));
  for (const p of payloads) expect(p).not.toContain(REQUESTER_EMAIL);
}

describe('createSupportCase', () => {
  const input = {
    reference: 'DSK-2026-0001',
    subject: 'Fatura sorusu',
    requesterEmail: REQUESTER_EMAIL,
    channel: 'email',
    category: 'billing',
    priority: 'urgent',
  } as const;

  it('slaDueAt kod hesaplar: now + öncelik saati', async () => {
    await admin.createSupportCase('u1', input, 'e-posta geldi');

    const data = (tx.supportCase.create.mock.calls[0]![0] as { data: { slaDueAt: Date } }).data;
    const now = Date.now();
    // urgent = +4 saat; test yürütme gecikmesine tolerans.
    expect(data.slaDueAt.getTime() - now).toBeGreaterThan(3.9 * 3_600_000);
    expect(data.slaDueAt.getTime() - now).toBeLessThan(4.1 * 3_600_000);
  });

  it('denetim yazılır: support.case_created; requesterEmail hiçbir deftere sızmaz', async () => {
    await admin.createSupportCase('u1', input, 'e-posta geldi');

    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'support.case_created' }) }),
    );
    assertNoRequesterEmailInLedgers();
  });

  it('mükerrer referans P2002 → dostça mesaj', async () => {
    const { Prisma } = await import('@prisma/client');
    tx.supportCase.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(admin.createSupportCase('u1', input, 's')).rejects.toThrow('zaten kullanılmış');
  });

  it('bilinmeyen org tx içinde reddeder', async () => {
    tx.organization.findUnique.mockResolvedValue(null);
    await expect(admin.createSupportCase('u1', { ...input, orgId: 'yok' }, 's')).rejects.toThrow(
      'bulunamadı',
    );
    expect(tx.supportCase.create).not.toHaveBeenCalled();
  });
});

describe('setSupportCaseStatus', () => {
  const legalTransitions: Array<[string, string]> = [
    ['open', 'waiting_customer'],
    ['open', 'escalated'],
    ['open', 'resolved'],
    ['waiting_customer', 'open'],
    ['waiting_customer', 'escalated'],
    ['waiting_customer', 'resolved'],
    ['escalated', 'open'],
    ['escalated', 'resolved'],
    ['resolved', 'open'],
  ];

  for (const [from, to] of legalTransitions) {
    it(`izinli geçiş: ${from} → ${to}`, async () => {
      tx.supportCase.findUnique.mockResolvedValue(openCase({ status: from }));
      await admin.setSupportCaseStatus('u1', 'case1', to as never, 'geçiş');
      expect(tx.supportCase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: to }) }),
      );
    });
  }

  it('izinsiz geçiş reddedilir: resolved → escalated', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ status: 'resolved' }));
    await expect(admin.setSupportCaseStatus('u1', 'case1', 'escalated', 's')).rejects.toThrow(
      'geçilemez',
    );
    expect(tx.supportCase.update).not.toHaveBeenCalled();
  });
});

describe('assignSupportCaseOwner', () => {
  it('sahip staff değilse reddeder', async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(admin.assignSupportCaseOwner('u1', 'case1', 'x@y.com', 's')).rejects.toThrow(
      'personel olmalı',
    );
    expect(tx.supportCase.update).not.toHaveBeenCalled();
  });

  it('staff sahibi bağlar ve denetlenir', async () => {
    await admin.assignSupportCaseOwner('u1', 'case1', 'destek@voldi.net', 'iş bölümü');

    expect(tx.supportCase.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerEmail: 'destek@voldi.net' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'support.case_owner_set' }) }),
    );
  });

  it('resolved vakaya sahip atanamaz', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ status: 'resolved' }));
    await expect(admin.assignSupportCaseOwner('u1', 'case1', 'destek@voldi.net', 's')).rejects.toThrow(
      'Kapatılmış vakaya sahip atanamaz.',
    );
    expect(tx.supportCase.update).not.toHaveBeenCalled();
  });
});

describe('setSupportCasePriority', () => {
  it("öncelik değişir; slaDueAt createdAt'ten yeniden hesaplanır (now'dan DEĞİL)", async () => {
    await admin.setSupportCasePriority('u1', 'case1', 'urgent', 'eskaledi');

    expect(tx.supportCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priority: 'urgent',
          slaDueAt: new Date(CREATED_AT.getTime() + 4 * 3_600_000),
        }),
      }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'support.case_priority_set',
          before: expect.objectContaining({ priority: 'normal' }),
          after: expect.objectContaining({ priority: 'urgent' }),
        }),
      }),
    );
  });

  it('resolved vakada öncelik değiştirilemez', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ status: 'resolved' }));
    await expect(admin.setSupportCasePriority('u1', 'case1', 'urgent', 's')).rejects.toThrow();
    expect(tx.supportCase.update).not.toHaveBeenCalled();
  });
});

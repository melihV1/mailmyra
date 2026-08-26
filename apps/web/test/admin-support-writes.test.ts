import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Destek vakası yazmalarının sözleşmesi: slaDueAt KOD hesaplar (SLA saati) ·
 * requesterEmail hiçbir denetim payload'ına girmez · izinli geçiş haritası
 * dışına çıkılmaz · sahip yalnız staff · resolved vakaya sahip/öncelik
 * atanamaz · öncelik değişince slaDueAt createdAt'ten YENİDEN hesaplanır
 * (now'dan DEĞİL) · referans P2002 dostu mesaj · bilinmeyen org tx içinde
 * reddedilir.
 *
 * Ticket v2 (spec 2026-08-26 §4 personel) eklenen sözleşme: `listSupportMessages`
 * SUPPORT_REGISTER StaffAccess desenine aynen tabi (kapalıya düşme) ·
 * `addStaffReply` mesaj + `waiting_customer` otomasyonu + `AdminAction` TEK
 * transaction'da, mesaj METNİ de requesterEmail gibi HİÇBİR deftere sızmaz ·
 * commit SONRASI e-posta (unconditional) + panel bildirimi (yalnız eşleşen
 * kullanıcı varsa) best-effort — ikisi de cevabı devirmez.
 */

const userFindUnique = vi.fn();
const userFindFirst = vi.fn();
const accessCreate = vi.fn();
const caseFindUnique = vi.fn();
const messageFindMany = vi.fn();
const mailerSend = vi.fn();
const supportReplyEmailMock = vi.fn((input: { actionUrl: string; reference: string }) => ({
  subject: `Your support case ${input.reference} has a new reply`,
  html: '<p>reply</p>',
  text: 'reply',
}));
const notifyUserMock = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  supportCase: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  supportMessage: { create: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      findFirst: (...a: unknown[]) => userFindFirst(...a),
    },
    supportCase: { findUnique: (...a: unknown[]) => caseFindUnique(...a) },
    supportMessage: { findMany: (...a: unknown[]) => messageFindMany(...a) },
    staffAccess: { create: (...a: unknown[]) => accessCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

vi.mock('../lib/mail', () => ({
  getMailer: () => ({ kind: 'log', send: (...a: unknown[]) => mailerSend(...a) }),
  supportReplyEmail: (...a: [{ actionUrl: string; reference: string }]) => supportReplyEmailMock(...a),
}));

vi.mock('../lib/repo/notifications', () => ({
  notifyUser: (...a: unknown[]) => notifyUserMock(...a),
}));

const admin = await import('../lib/repo/admin');

const REQUESTER_EMAIL = 'musteri@ornek.com';
const CREATED_AT = new Date(Date.UTC(2026, 7, 20, 9, 0));

const openCase = (over: Record<string, unknown> = {}) => ({
  status: 'open',
  priority: 'normal',
  slaDueAt: new Date(Date.UTC(2026, 7, 22, 9, 0)),
  createdAt: CREATED_AT,
  reference: 'SUP-2026-0007',
  requesterEmail: REQUESTER_EMAIL,
  orgId: null,
  orgName: '',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  userFindFirst.mockResolvedValue(null);
  accessCreate.mockResolvedValue({});
  caseFindUnique.mockResolvedValue({ id: 'case1' });
  messageFindMany.mockResolvedValue([]);
  mailerSend.mockResolvedValue(undefined);
  notifyUserMock.mockResolvedValue(undefined);
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.user.findFirst.mockResolvedValue({ id: 'u2', email: 'destek@voldi.net' });
  tx.supportCase.create.mockResolvedValue({ id: 'case1' });
  tx.supportCase.findUnique.mockResolvedValue(openCase());
  tx.supportCase.update.mockResolvedValue({});
  tx.supportMessage.create.mockResolvedValue({ id: 'msg1' });
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

describe('listSupportMessages', () => {
  it('erişim günlüğü yazılamazsa iplik AÇILMAZ (kapalıya düşme)', async () => {
    accessCreate.mockRejectedValue(new Error('defter kapalı'));
    await expect(admin.listSupportMessages('u1', 'case1')).rejects.toThrow('defter kapalı');
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('erişim kaydı SUPPORT_REGISTER sentinel + targetId=caseId taşır', async () => {
    await admin.listSupportMessages('u1', 'case1', { ip: '203.0.113.9' });
    expect(accessCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'support-register',
        orgName: 'Support register',
        scope: 'support',
        targetId: 'case1',
        ip: '203.0.113.9',
      }),
    });
  });

  it('bilinmeyen vaka fırlatır — mesajlar hiç sorgulanmaz', async () => {
    caseFindUnique.mockResolvedValue(null);
    await expect(admin.listSupportMessages('u1', 'case1')).rejects.toThrow('bulunamadı');
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('mesajları createdAt asc döner; authorEmail DAHİL (staff tarafı görür)', async () => {
    const rows = [
      {
        id: 'm1',
        authorType: 'customer',
        authorEmail: REQUESTER_EMAIL,
        body: 'Merhaba',
        createdAt: new Date(Date.UTC(2026, 7, 20, 10, 0)),
      },
      {
        id: 'm2',
        authorType: 'staff',
        authorEmail: 'staff@voldi.net',
        body: 'Bakıyoruz',
        createdAt: new Date(Date.UTC(2026, 7, 20, 11, 0)),
      },
    ];
    messageFindMany.mockResolvedValue(rows);

    const result = await admin.listSupportMessages('u1', 'case1');

    expect(result).toEqual(rows);
    expect(messageFindMany.mock.calls[0]![0]).toMatchObject({
      where: { caseId: 'case1' },
      orderBy: { createdAt: 'asc' },
    });
  });
});

describe('addStaffReply', () => {
  const SENTINEL_BODY = 'sentinel-body-never-leaves-the-ledger-9f21';

  /** Denetim payload'larında ne müşteri e-postası ne mesaj metni — KVKK emsalinin izdüşümü. */
  function assertNoLeaksInLedgers() {
    const payloads = tx.adminAction.create.mock.calls.map((c) => JSON.stringify(c[0]));
    for (const p of payloads) {
      expect(p).not.toContain(REQUESTER_EMAIL);
      expect(p).not.toContain(SENTINEL_BODY);
    }
  }

  it('boş (yalnız boşluk) gövde fırlatır, transaction hiç açılmaz', async () => {
    await expect(admin.addStaffReply('u1', 'case1', '   ')).rejects.toThrow(/zorunlu/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('2001 karakter → saklanan gövde tam olarak 2000 karakter', async () => {
    await admin.addStaffReply('u1', 'case1', 'a'.repeat(2001));
    const data = tx.supportMessage.create.mock.calls[0]![0].data;
    expect(data.body).toHaveLength(2000);
    expect(data.body).toBe('a'.repeat(2000));
  });

  it('mesaj staff kimliğiyle yazılır (authorType/authorEmail = staff)', async () => {
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(tx.supportMessage.create).toHaveBeenCalledWith({
      data: { caseId: 'case1', authorType: 'staff', authorEmail: 'staff@voldi.net', body: 'Bakıyoruz' },
      select: { id: true },
    });
  });

  it('bilinmeyen vaka tx içinde reddedilir — mesaj yazılmaz', async () => {
    tx.supportCase.findUnique.mockResolvedValue(null);
    await expect(admin.addStaffReply('u1', 'case1', 'x')).rejects.toThrow('bulunamadı');
    expect(tx.supportMessage.create).not.toHaveBeenCalled();
  });

  it.each(['open', 'escalated', 'resolved'])(
    'durum otomasyonu: %s → waiting_customer (her durumdan, harita dışı)',
    async (status) => {
      tx.supportCase.findUnique.mockResolvedValue(openCase({ status }));
      await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
      expect(tx.supportCase.update).toHaveBeenCalledWith({
        where: { id: 'case1' },
        data: { status: 'waiting_customer' },
      });
    },
  );

  it('zaten waiting_customer ise durum güncellemesi HİÇ çağrılmaz', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ status: 'waiting_customer' }));
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(tx.supportCase.update).not.toHaveBeenCalled();
  });

  it('denetim: support.replied yazılır, sebep sabit "reply"', async () => {
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(tx.adminAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'support.replied',
        reason: 'reply',
        before: { status: 'open' },
        after: { messageId: 'msg1', bodyLength: 'Bakıyoruz'.length, status: 'waiting_customer' },
      }),
    });
  });

  it('denetim payload’ında mesaj METNİ ve requesterEmail HİÇ görünmez (sentinel taraması)', async () => {
    await admin.addStaffReply('u1', 'case1', SENTINEL_BODY);
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ after: expect.objectContaining({ bodyLength: SENTINEL_BODY.length }) }),
      }),
    );
    assertNoLeaksInLedgers();
  });

  it('commit SONRASI: e-posta UNCONDITIONAL gider, doğru actionUrl + reference ile', async () => {
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');

    expect(supportReplyEmailMock).toHaveBeenCalledWith({
      actionUrl: expect.stringContaining('/app/support/case1'),
      reference: 'SUP-2026-0007',
    });
    expect(mailerSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: REQUESTER_EMAIL, kind: 'support' }),
    );
  });

  it('mail/bildirim commit SONRASI çağrılır (transaction tamamlandıktan sonra)', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ orgId: 'org1', orgName: 'Acme' }));
    userFindFirst.mockResolvedValue({ id: 'u9' });

    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');

    const txOrder = transaction.mock.invocationCallOrder[0]!;
    const mailOrder = mailerSend.mock.invocationCallOrder[0]!;
    const notifyOrder = notifyUserMock.mock.invocationCallOrder[0]!;
    expect(mailOrder).toBeGreaterThan(txOrder);
    expect(notifyOrder).toBeGreaterThan(txOrder);
  });

  it('org’lu vaka + eşleşen kullanıcı: notifyUser doğru argümanlarla çağrılır', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ orgId: 'org1', orgName: 'Acme' }));
    userFindFirst.mockResolvedValue({ id: 'u9' });

    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');

    expect(userFindFirst).toHaveBeenCalledWith({
      where: { email: REQUESTER_EMAIL, memberships: { some: { orgId: 'org1' } } },
      select: { id: true },
    });
    expect(notifyUserMock).toHaveBeenCalledWith('u9', 'org1', 'support_reply', {
      reference: 'SUP-2026-0007',
    });
  });

  it('org yoksa panel bildirimi hiç denenmez (kullanıcı aranmaz), e-posta yine gider', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ orgId: null }));
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(notifyUserMock).not.toHaveBeenCalled();
    expect(mailerSend).toHaveBeenCalled();
  });

  it('eşleşen kullanıcı yoksa bildirim atlanır, e-posta yine gider', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ orgId: 'org1' }));
    userFindFirst.mockResolvedValue(null);
    await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(notifyUserMock).not.toHaveBeenCalled();
    expect(mailerSend).toHaveBeenCalled();
  });

  it('posta hatası cevabı DEVİRMEZ — mesaj kalıcı, {id} döner', async () => {
    mailerSend.mockRejectedValueOnce(new Error('smtp down'));
    const r = await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(r).toEqual({ id: 'msg1' });
  });

  it('bildirim hatası cevabı DEVİRMEZ — mesaj kalıcı, {id} döner', async () => {
    tx.supportCase.findUnique.mockResolvedValue(openCase({ orgId: 'org1' }));
    userFindFirst.mockResolvedValue({ id: 'u9' });
    notifyUserMock.mockRejectedValueOnce(new Error('db down'));
    const r = await admin.addStaffReply('u1', 'case1', 'Bakıyoruz');
    expect(r).toEqual({ id: 'msg1' });
  });
});

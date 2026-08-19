import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Süper admin modülünün güvenlik sözleşmeleri:
 *
 *   1. Her dışa açık fonksiyon, iş yapmadan önce personel kontrolü yapar.
 *   2. Kişisel veri okumaları KAPALIYA düşer: erişim günlüğü yazılamazsa
 *      veri dönmez.
 *   3. Yazmalar sebepsiz çalışmaz ve tek transaction'da denetlenir.
 *
 * Bu dosyanın asıl değeri numaralandırma testinde: modülün **bütün
 * export'larını gezip** her birinin personel olmayanı reddettiğini
 * doğruluyor. Yarın yeni bir fonksiyon eklenir ve `requireStaff`
 * unutulursa, ayrı test yazılmamış olsa bile bu kırılır.
 *
 * Veritabanı gerekmiyor: `../db` taklit ediliyor — CI'da ve
 * `TEST_DATABASE_URL` olmayan makinede de koşar.
 */

const userFindUnique = vi.fn();
const orgFindUnique = vi.fn();
const orgFindMany = vi.fn();
const accessCreate = vi.fn();
const transaction = vi.fn();

// Transaction içindeki istemci — $transaction mock'u callback'e bunu verir.
const tx = {
  organization: { findUnique: vi.fn(), update: vi.fn() },
  invoice: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  adminAction: { create: vi.fn() },
  activityEvent: { create: vi.fn() },
};

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    organization: {
      findMany: (...a: unknown[]) => orgFindMany(...a),
      findUnique: (...a: unknown[]) => orgFindUnique(...a),
    },
    senderIdentity: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn() },
    signature: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    invoice: { findMany: vi.fn() },
    staffAccess: { create: (...a: unknown[]) => accessCreate(...a), findMany: vi.fn() },
    adminAction: { findMany: vi.fn() },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

vi.mock('../lib/repo/senders', () => ({ countActiveSeats: async () => 0 }));

const admin = await import('../lib/repo/admin');

const OK_INVOICE = {
  orgId: 'org1',
  number: 'MM-2026-0001',
  issuedAt: new Date(0),
  seats: 1,
  amountCents: 100,
};

/** Her fonksiyona geçerli görünen argümanlar — kapı bunlara BAKMADAN kesmeli. */
const CALLS: Record<string, unknown[]> = {
  requireStaff: ['u1'],
  listOrganizations: ['u1'],
  getOrganization: ['u1', 'org1'],
  listOrgSenders: ['u1', 'org1'],
  setEntitlement: ['u1', 'org1', { entitledSeats: 5 }, 'ilk kurulum'],
  createInvoice: ['u1', OK_INVOICE, 'ilk fatura'],
  setInvoiceStatus: ['u1', 'inv1', 'void', 'yanlış kesildi'],
  markInvoicePaid: [
    'u1',
    'inv1',
    { paidAt: new Date(0), method: 'bank_transfer', reference: 'DEK-1' },
    'havale geldi',
  ],
  listOrgSignatures: ['u1', 'org1'],
  getSignaturePreview: ['u1', 'sig1'],
  listAdminQueues: ['u1'],
  searchAdmin: ['u1', 'acme'],
  listInvoicesAdmin: ['u1'],
  listStaffAccess: ['u1'],
  listAdminActions: ['u1'],
};

const asStaff = () =>
  userFindUnique.mockResolvedValue({ id: 'u1', email: 'staff@voldi.net', isStaff: true });
const asCustomer = () =>
  userFindUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', isStaff: false });

beforeEach(() => {
  for (const fn of [userFindUnique, orgFindUnique, orgFindMany, accessCreate, transaction]) {
    fn.mockReset();
  }
  for (const group of Object.values(tx)) for (const fn of Object.values(group)) fn.mockReset();
  // Varsayılan: transaction callback'i tx mock'uyla gerçekten koşar.
  transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
  accessCreate.mockResolvedValue({});
});

describe('requireStaff', () => {
  it('bayrak açıkken kullanıcıyı döndürür', async () => {
    asStaff();
    await expect(admin.requireStaff('u1')).resolves.toEqual({
      id: 'u1',
      email: 'staff@voldi.net',
    });
  });

  it('bayrak kapalıysa FIRLATIR — null dönmez', async () => {
    asCustomer();
    // null dönseydi çağıran yerde kontrol unutulabilir ve akış sessizce
    // devam ederdi; fırlatma unutulamaz.
    await expect(admin.requireStaff('u1')).rejects.toBeInstanceOf(admin.NotStaffError);
  });

  it('kullanıcı hiç yoksa FIRLATIR', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(admin.requireStaff('yok')).rejects.toBeInstanceOf(admin.NotStaffError);
  });
});

describe('isStaff', () => {
  it('bayrağı olduğu gibi bildirir, fırlatmaz', async () => {
    userFindUnique.mockResolvedValue({ isStaff: false });
    await expect(admin.isStaff('u1')).resolves.toBe(false);
    userFindUnique.mockResolvedValue({ isStaff: true });
    await expect(admin.isStaff('u1')).resolves.toBe(true);
  });
});

describe('personel kapısı — BÜTÜN export edilen fonksiyonlar', () => {
  const exported = Object.entries(admin)
    .filter(
      ([name, v]) => typeof v === 'function' && name !== 'isStaff' && name !== 'NotStaffError',
    )
    .map(([name]) => name);

  it('sınanacak fonksiyon listesi modülle aynı — yeni fonksiyon eklendiyse burası kırılır', () => {
    expect(exported.sort()).toEqual(Object.keys(CALLS).sort());
  });

  const table = admin as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;

  for (const [name, args] of Object.entries(CALLS)) {
    it(`${name}: personel olmayanı reddeder`, async () => {
      asCustomer();
      const fn = table[name];
      expect(fn, `${name} modülde yok`).toBeTypeOf('function');
      await expect(fn!(...args)).rejects.toBeInstanceOf(admin.NotStaffError);
    });

    it(`${name}: reddedince YAN ETKİ bırakmaz`, async () => {
      asCustomer();
      await table[name]!(...args).catch(() => undefined);
      // Kapı iş yapılmadan ÖNCE kesmeli: ne transaction açılmalı ne günlük.
      expect(transaction).not.toHaveBeenCalled();
      expect(accessCreate).not.toHaveBeenCalled();
    });
  }
});

describe('kapalıya düşme — erişim günlüğü yazılamazsa kişisel veri dönmez', () => {
  it('getOrganization: günlük hatası okumayı keser, kişisel veri HİÇ yüklenmez', async () => {
    asStaff();
    orgFindUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
    accessCreate.mockRejectedValue(new Error('disk dolu'));

    await expect(admin.getOrganization('u1', 'org1')).rejects.toThrow('disk dolu');
    // İlk findUnique kişisel veri içermeyen çözümleme; İKİNCİSİ (üyeler,
    // e-postalar) günlük başarısızsa hiç çalışmamalı.
    expect(orgFindUnique).toHaveBeenCalledTimes(1);
  });

  it('listOrgSenders: günlük hatası okumayı keser', async () => {
    asStaff();
    orgFindUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
    accessCreate.mockRejectedValue(new Error('yazılamadı'));

    await expect(admin.listOrgSenders('u1', 'org1')).rejects.toThrow('yazılamadı');
  });

  it('günlük satırı ip ve user-agent taşır', async () => {
    asStaff();
    orgFindUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });

    await admin.listOrgSenders('u1', 'org1', { ip: '203.0.113.9', userAgent: 'UA' });
    expect(accessCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: '203.0.113.9', userAgent: 'UA', scope: 'senders' }),
    });
  });
});

describe('yazmalar — sebep zorunlu, denetim transaction içinde', () => {
  beforeEach(() => {
    tx.organization.findUnique.mockResolvedValue({
      name: 'Acme',
      entitledSeats: 1,
      entitlementState: 'trial',
      trialEndsAt: null,
    });
    tx.organization.update.mockResolvedValue({
      id: 'org1',
      name: 'Acme',
      entitledSeats: 5,
      entitlementState: 'active',
      trialEndsAt: null,
    });
    tx.invoice.create.mockResolvedValue({
      id: 'inv1',
      number: 'MM-2026-0001',
      seats: 1,
      amountCents: 100,
      currency: 'USD',
    });
    tx.invoice.findUnique.mockResolvedValue({
      status: 'due',
      number: 'MM-2026-0001',
      org: { id: 'org1', name: 'Acme' },
    });
    tx.invoice.update.mockResolvedValue({ orgId: 'org1', number: 'MM-2026-0001', status: 'void' });
  });

  for (const [label, call] of [
    ['setEntitlement', () => admin.setEntitlement('u1', 'org1', { entitledSeats: 5 }, '   ')],
    ['createInvoice', () => admin.createInvoice('u1', OK_INVOICE, '')],
    ['setInvoiceStatus', () => admin.setInvoiceStatus('u1', 'inv1', 'void', '  ')],
    [
      'markInvoicePaid',
      () =>
        admin.markInvoicePaid(
          'u1',
          'inv1',
          { paidAt: new Date(0), method: 'bank_transfer' },
          '',
        ),
    ],
  ] as const) {
    it(`${label}: boş sebeple çalışmaz ve transaction açılmaz`, async () => {
      asStaff();
      await expect(call()).rejects.toThrow(/[Ss]ebep/);
      expect(transaction).not.toHaveBeenCalled();
    });
  }

  it('setEntitlement: denetim ve müşteri aktivitesi AYNI transaction içinde yazılır', async () => {
    asStaff();
    await admin.setEntitlement('u1', 'org1', { entitledSeats: 5 }, 'ilk satış', {
      ip: '203.0.113.9',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.adminAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'entitlement.set',
        reason: 'ilk satış',
        before: expect.objectContaining({ entitledSeats: 1 }),
        after: expect.objectContaining({ entitledSeats: 5 }),
      }),
    });
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'support.entitlement_changed' }),
    });
  });

  it('createInvoice: mükerrer numara NET hatayla döner (P2002)', async () => {
    asStaff();
    tx.invoice.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    await expect(admin.createInvoice('u1', OK_INVOICE, 'ilk fatura')).rejects.toThrow(
      /zaten kullanılmış/,
    );
  });

  it('setEntitlement: koltuk 1in altına indirilemez', async () => {
    asStaff();
    await expect(
      admin.setEntitlement('u1', 'org1', { entitledSeats: 0 }, 'deneme'),
    ).rejects.toThrow(/en az 1/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('createInvoice doğrulaması transaction açılmadan keser', async () => {
    asStaff();
    await expect(
      admin.createInvoice('u1', { ...OK_INVOICE, seats: 0 }, 'x'),
    ).rejects.toThrow(/en az 1/);
    await expect(
      admin.createInvoice('u1', { ...OK_INVOICE, amountCents: -1 }, 'x'),
    ).rejects.toThrow(/negatif/);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('markInvoicePaid — muhasebe kaydı', () => {
  beforeEach(() => {
    tx.invoice.findUnique.mockResolvedValue({
      status: 'due',
      number: 'MM-2026-0001',
      org: { id: 'org1', name: 'Acme' },
    });
    tx.invoice.update.mockResolvedValue({ orgId: 'org1', number: 'MM-2026-0001', status: 'paid' });
  });

  it('ödeme alanlarını yazar ve denetler', async () => {
    asStaff();
    await admin.markInvoicePaid(
      'u1',
      'inv1',
      { paidAt: new Date('2026-08-19'), method: 'bank_transfer', reference: 'DEK-42' },
      'havale dekontu geldi',
    );

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: expect.objectContaining({
        status: 'paid',
        paymentMethod: 'bank_transfer',
        paymentReference: 'DEK-42',
      }),
      select: expect.anything(),
    });
    expect(tx.adminAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'havale dekontu geldi' }),
    });
  });

  it('void faturaya ödeme kaydedilemez', async () => {
    asStaff();
    tx.invoice.findUnique.mockResolvedValue({
      status: 'void',
      number: 'MM-2026-0001',
      org: { id: 'org1', name: 'Acme' },
    });
    await expect(
      admin.markInvoicePaid(
        'u1',
        'inv1',
        { paidAt: new Date(0), method: 'cash' },
        'deneme',
      ),
    ).rejects.toThrow(/İptal edilmiş/);
  });
});

describe('setInvoiceStatus — geri açma/iptal ödeme kalıntısı bırakmaz', () => {
  it('void geçişinde ödeme alanları temizlenir', async () => {
    asStaff();
    tx.invoice.findUnique.mockResolvedValue({
      status: 'paid',
      number: 'MM-2026-0001',
      org: { id: 'org1', name: 'Acme' },
    });
    tx.invoice.update.mockResolvedValue({ orgId: 'org1', number: 'MM-2026-0001', status: 'void' });

    await admin.setInvoiceStatus('u1', 'inv1', 'void', 'iade edildi');
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: expect.objectContaining({ paidAt: null, paymentMethod: null, paymentReference: null }),
      select: expect.anything(),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Hata grubu + lead yazmalarının sözleşmesi: hata grubu platform nöbetçisiyle
 * denetlenir (org yok) · izinli geçiş haritası dışına çıkılmaz (yeniden açma
 * dahil) · lead varsayılanları KOD verir (seats 1, stage 'new', nextStep '')
 * · seats tam sayı ve ≥1 olmalı, aksi halde transaction hiç açılmaz ·
 * updateLead en az bir alan ister, aksi halde transaction hiç açılmaz ·
 * denetim payload'larında `contact` HİÇBİR ZAMAN yer almaz (Voldi'nin kendi
 * ticari kaydı olsa da) · aşama `lost` uçtan uca kabul edilir.
 */

const userFindUnique = vi.fn();

const tx = {
  errorGroup: { findUnique: vi.fn(), update: vi.fn() },
  lead: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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

const CONTACT = 'satis@ornek.com';

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.errorGroup.findUnique.mockResolvedValue({ state: 'open' });
  tx.errorGroup.update.mockResolvedValue({});
  tx.lead.create.mockResolvedValue({ id: 'lead1' });
  tx.lead.findUnique.mockResolvedValue({
    company: 'Acme',
    stage: 'new',
    nextStep: '',
    seats: 1,
  });
  tx.lead.update.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

/** Tüm denetim payload'larında `contact` taraması. */
function assertNoContactInLedgers() {
  const payloads = tx.adminAction.create.mock.calls.map((c) => JSON.stringify(c[0]));
  for (const p of payloads) expect(p).not.toContain(CONTACT);
}

describe('setErrorGroupState', () => {
  const legalTransitions: Array<[string, string]> = [
    ['open', 'investigating'],
    ['open', 'resolved'],
    ['investigating', 'open'],
    ['investigating', 'resolved'],
    ['resolved', 'open'],
  ];

  for (const [from, to] of legalTransitions) {
    it(`izinli geçiş: ${from} → ${to}`, async () => {
      tx.errorGroup.findUnique.mockResolvedValue({ state: from });
      await admin.setErrorGroupState('u1', 'err1', to as never, 'geçiş');
      expect(tx.errorGroup.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ state: to }) }),
      );
    });
  }

  it('izinsiz geçiş reddedilir: resolved → investigating', async () => {
    tx.errorGroup.findUnique.mockResolvedValue({ state: 'resolved' });
    await expect(
      admin.setErrorGroupState('u1', 'err1', 'investigating', 's'),
    ).rejects.toThrow('geçilemez');
    expect(tx.errorGroup.update).not.toHaveBeenCalled();
  });

  it('denetim platform nöbetçisiyle yazılır: error.state_set, before/after state', async () => {
    tx.errorGroup.findUnique.mockResolvedValue({ state: 'open' });
    await admin.setErrorGroupState('u1', 'err1', 'investigating', 'incelemeye alındı');

    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'error.state_set',
          orgId: 'platform',
          before: expect.objectContaining({ state: 'open' }),
          after: expect.objectContaining({ state: 'investigating' }),
        }),
      }),
    );
  });
});

describe('createLead', () => {
  const input = { company: 'Acme', contact: CONTACT, source: 'referral' } as const;

  it('varsayılanları kod verir: seats 1, stage new, nextStep boş', async () => {
    await admin.createLead('u1', input, 'fuarda tanıştık');

    const data = (tx.lead.create.mock.calls[0]![0] as {
      data: { seats: number; stage: string; nextStep: string };
    }).data;
    expect(data.seats).toBe(1);
    expect(data.stage).toBe('new');
    expect(data.nextStep).toBe('');
  });

  it('denetim yazılır: lead.created; contact hiçbir deftere sızmaz', async () => {
    await admin.createLead('u1', input, 'fuarda tanıştık');

    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'lead.created' }) }),
    );
    assertNoContactInLedgers();
  });

  it("seats 1'den küçükse transaction açılmadan reddedilir", async () => {
    await expect(
      admin.createLead('u1', { ...input, seats: 0 }, 's'),
    ).rejects.toThrow("1'den küçük olamaz");
    expect(transaction).not.toHaveBeenCalled();
  });

  it('seats tam sayı değilse transaction açılmadan reddedilir', async () => {
    await expect(
      admin.createLead('u1', { ...input, seats: 2.5 }, 's'),
    ).rejects.toThrow("1'den küçük olamaz");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("stage 'lost' uçtan uca kabul edilir", async () => {
    await admin.createLead('u1', { ...input, stage: 'lost' }, 'kaybedildi');

    const data = (tx.lead.create.mock.calls[0]![0] as { data: { stage: string } }).data;
    expect(data.stage).toBe('lost');
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ after: expect.objectContaining({ stage: 'lost' }) }) }),
    );
  });
});

describe('updateLead', () => {
  it('en az bir alan olmadan transaction açılmadan reddedilir', async () => {
    await expect(admin.updateLead('u1', 'lead1', {}, 's')).rejects.toThrow(
      'Değiştirilecek alan yok.',
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("seats 1'den küçükse transaction açılmadan reddedilir", async () => {
    await expect(
      admin.updateLead('u1', 'lead1', { seats: 0 }, 's'),
    ).rejects.toThrow("1'den küçük olamaz");
    expect(transaction).not.toHaveBeenCalled();
  });

  it('değişen alan denetlenir: before/after', async () => {
    tx.lead.findUnique.mockResolvedValue({ company: 'Acme', stage: 'new', nextStep: '', seats: 1 });
    await admin.updateLead('u1', 'lead1', { stage: 'qualified' }, 'görüşüldü');

    expect(tx.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: 'qualified' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'lead.updated',
          before: expect.objectContaining({ company: 'Acme', stage: 'new' }),
          after: expect.objectContaining({ company: 'Acme', stage: 'qualified' }),
        }),
      }),
    );
  });

  it("stage 'lost' uçtan uca kabul edilir", async () => {
    tx.lead.findUnique.mockResolvedValue({ company: 'Acme', stage: 'qualified', nextStep: '', seats: 1 });
    await admin.updateLead('u1', 'lead1', { stage: 'lost' }, 'vazgeçti');

    expect(tx.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: 'lost' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ after: expect.objectContaining({ stage: 'lost' }) }),
      }),
    );
  });

  it('denetim payload contact taşımaz', async () => {
    await admin.updateLead('u1', 'lead1', { nextStep: 'ara' }, 'takip');
    assertNoContactInLedgers();
  });

  it('bilinmeyen lead tx içinde reddeder', async () => {
    tx.lead.findUnique.mockResolvedValue(null);
    await expect(admin.updateLead('u1', 'yok', { stage: 'won' }, 's')).rejects.toThrow(
      'bulunamadı',
    );
    expect(tx.lead.update).not.toHaveBeenCalled();
  });
});

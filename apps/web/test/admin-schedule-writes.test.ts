import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Rapor zamanlaması yazmalarının sözleşmesi: `reportId` registry'de
 * KOŞTURULABİLİR olmalı · `csv` + tablosuz rapor reddedilir · `format`
 * route-level'ın YANI SIRA burada da doğrulanır (ham gövde tipi garanti
 * etmez) · alıcı 1-10 adet, hepsi `@` içerir, küçük harfe çekilir ·
 * ReportSchedule + ReportRecipient'lar AYNI transaction'da, `nextRunAt`
 * null · duraklat/sürdür yalnız DİĞER durumdan.
 */

const userFindUnique = vi.fn();

const tx = {
  reportSchedule: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  reportRecipient: { create: vi.fn() },
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

const OK_INPUT: {
  reportId: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  format: 'digest' | 'csv';
  recipients: string[];
} = {
  reportId: 'command-center',
  cadence: 'weekly',
  format: 'digest',
  recipients: ['Ops@Voldi.net'],
};

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.reportSchedule.create.mockResolvedValue({ id: 'sched1' });
  tx.reportSchedule.findUnique.mockResolvedValue({ status: 'active' });
  tx.reportSchedule.update.mockResolvedValue({});
  tx.reportRecipient.create.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

describe('createReportSchedule', () => {
  it('bilinmeyen rapor reddedilir', async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, reportId: 'yok-boyle-bir-rapor' }, 's'),
    ).rejects.toThrow('Bu rapor koşturulamıyor.');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it("format 'digest'/'csv' dışındaysa reddedilir (route doğrulasa da repo yeniden reddeder)", async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, format: 'pdf' as never }, 's'),
    ).rejects.toThrow("'digest' veya 'csv'");
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it("kadans 'daily'/'weekly'/'monthly' dışındaysa reddedilir", async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, cadence: 'hourly' as never }, 's'),
    ).rejects.toThrow(/daily.*weekly.*monthly/);
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it('csv + tablosuz rapor (command-center) reddedilir', async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, reportId: 'command-center', format: 'csv' }, 's'),
    ).rejects.toThrow('Bu raporun tablo çıktısı yok.');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it('csv + tablolu rapor (customer-health) kabul edilir', async () => {
    await admin.createReportSchedule(
      'u1',
      { ...OK_INPUT, reportId: 'customer-health', format: 'csv' },
      's',
    );
    expect(tx.reportSchedule.create).toHaveBeenCalled();
  });

  it('0 alıcı reddedilir', async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, recipients: [] }, 's'),
    ).rejects.toThrow('1-10');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it('11 alıcı reddedilir', async () => {
    const recipients = Array.from({ length: 11 }, (_, i) => `r${i}@voldi.net`);
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, recipients }, 's'),
    ).rejects.toThrow('1-10');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it('10 alıcı kabul edilir (üst sınır dahil)', async () => {
    const recipients = Array.from({ length: 10 }, (_, i) => `r${i}@voldi.net`);
    await admin.createReportSchedule('u1', { ...OK_INPUT, recipients }, 's');
    expect(tx.reportRecipient.create).toHaveBeenCalledTimes(10);
  });

  it('yinelenen alıcı (aynı adres iki kez) tek satıra düşer, ham P2002 fırlamaz', async () => {
    await admin.createReportSchedule(
      'u1',
      { ...OK_INPUT, recipients: ['a@voldi.net', 'A@Voldi.net'] },
      's',
    );
    expect(tx.reportRecipient.create).toHaveBeenCalledTimes(1);
    expect(tx.reportRecipient.create).toHaveBeenCalledWith({
      data: { scheduleId: 'sched1', email: 'a@voldi.net' },
    });
  });

  it('11 ham adres / 9 tekil: tekilleştirme sayım sınırından ÖNCE çalıştığı için geçer', async () => {
    const recipients = [
      ...Array.from({ length: 9 }, (_, i) => `r${i}@voldi.net`),
      'r0@voldi.net',
      'R1@Voldi.net',
    ];
    expect(recipients).toHaveLength(11);
    await admin.createReportSchedule('u1', { ...OK_INPUT, recipients }, 's');
    expect(tx.reportRecipient.create).toHaveBeenCalledTimes(9);
  });

  it('11 ham adres / 11 tekil hâlâ reddedilir (dedupe sınırı gizlice gevşetmiyor)', async () => {
    const recipients = Array.from({ length: 11 }, (_, i) => `r${i}@voldi.net`);
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, recipients }, 's'),
    ).rejects.toThrow('1-10');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it("@ içermeyen alıcı e-postası reddedilir", async () => {
    await expect(
      admin.createReportSchedule('u1', { ...OK_INPUT, recipients: ['gecersiz-eposta'] }, 's'),
    ).rejects.toThrow('geçersiz');
    expect(tx.reportSchedule.create).not.toHaveBeenCalled();
  });

  it('satırlar AYNI transaction içinde: ReportSchedule + ReportRecipient(lar)', async () => {
    await admin.createReportSchedule(
      'u1',
      { ...OK_INPUT, recipients: ['a@voldi.net', 'b@voldi.net'] },
      'ilk zamanlama',
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.reportSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reportId: 'command-center',
          cadence: 'weekly',
          format: 'digest',
          timezone: 'Europe/Istanbul',
          status: 'active',
          nextRunAt: null,
          ownerEmail: 'staff@voldi.net',
          createdByEmail: 'staff@voldi.net',
        }),
      }),
    );
    expect(tx.reportRecipient.create).toHaveBeenCalledTimes(2);
    expect(tx.reportRecipient.create).toHaveBeenCalledWith({
      data: { scheduleId: 'sched1', email: 'a@voldi.net' },
    });
    expect(tx.reportRecipient.create).toHaveBeenCalledWith({
      data: { scheduleId: 'sched1', email: 'b@voldi.net' },
    });
  });

  it('alıcı e-postaları küçük harfe çekilir', async () => {
    await admin.createReportSchedule('u1', OK_INPUT, 's');
    expect(tx.reportRecipient.create).toHaveBeenCalledWith({
      data: { scheduleId: 'sched1', email: 'ops@voldi.net' },
    });
  });

  it('denetim yazılır: report.schedule_created, alıcı SAYISI taşır (e-postaların kendisi değil)', async () => {
    await admin.createReportSchedule(
      'u1',
      { ...OK_INPUT, recipients: ['a@voldi.net', 'b@voldi.net'] },
      'ilk zamanlama',
    );

    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'report.schedule_created',
          after: expect.objectContaining({ recipients: 2 }),
        }),
      }),
    );
    const payload = JSON.stringify(tx.adminAction.create.mock.calls[0]![0]);
    expect(payload).not.toContain('a@voldi.net');
    expect(payload).not.toContain('b@voldi.net');
  });
});

describe('setReportScheduleStatus', () => {
  it('active → paused izinli', async () => {
    tx.reportSchedule.findUnique.mockResolvedValue({ status: 'active' });
    await admin.setReportScheduleStatus('u1', 'sched1', 'paused', 'sessiz saat');

    expect(tx.reportSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'report.schedule_status_set' }) }),
    );
  });

  it('paused → active izinli', async () => {
    tx.reportSchedule.findUnique.mockResolvedValue({ status: 'paused' });
    await admin.setReportScheduleStatus('u1', 'sched1', 'active', 'devam');

    expect(tx.reportSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }),
    );
  });

  it('aynı duruma tekrar yazılamaz: active → active', async () => {
    tx.reportSchedule.findUnique.mockResolvedValue({ status: 'active' });
    await expect(admin.setReportScheduleStatus('u1', 'sched1', 'active', 's')).rejects.toThrow(
      'geçilemez',
    );
    expect(tx.reportSchedule.update).not.toHaveBeenCalled();
  });

  it('aynı duruma tekrar yazılamaz: paused → paused', async () => {
    tx.reportSchedule.findUnique.mockResolvedValue({ status: 'paused' });
    await expect(admin.setReportScheduleStatus('u1', 'sched1', 'paused', 's')).rejects.toThrow(
      'geçilemez',
    );
    expect(tx.reportSchedule.update).not.toHaveBeenCalled();
  });

  it('bilinmeyen zamanlama tx içinde reddedilir', async () => {
    tx.reportSchedule.findUnique.mockResolvedValue(null);
    await expect(admin.setReportScheduleStatus('u1', 'yok', 'paused', 's')).rejects.toThrow(
      'bulunamadı',
    );
    expect(tx.reportSchedule.update).not.toHaveBeenCalled();
  });
});

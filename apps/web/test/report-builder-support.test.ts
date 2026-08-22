import { describe, expect, it } from 'vitest';

import { buildSupportOperations } from '../lib/reports/builders/support-operations';
import { REPORT_BUILDERS, TABLELESS_REPORTS } from '../lib/reports/registry';
import type { ReportsDb } from '../lib/reports/types';
import { buildCommandCenter } from '../lib/reports/builders/command-center';
import { RUNNABLE_REPORTS, TABLELESS_REPORT_IDS } from '../app/(admin)/reporting-model';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15));
const WINDOW = { start: new Date(Date.UTC(2026, 7, 14, 7, 15)), end: END };

function fakeDb(cases: unknown[]) {
  const calls: Record<string, unknown[]> = {};
  const capture = (name: string, value: unknown) => (args: unknown) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(value);
  };
  const db = {
    supportCase: { findMany: capture('supportCase.findMany', cases) },
  };
  return { db: db as unknown as ReportsDb, calls };
}

const CASES = [
  {
    reference: 'DSK-0001',
    orgName: 'Acme',
    category: 'billing',
    priority: 'urgent',
    status: 'open',
    createdAt: new Date(Date.UTC(2026, 7, 15)), // pencerede
    slaDueAt: new Date(END.getTime() - 1), // 1ms ÖNCE bitmiş → AŞILMIŞ
  },
  {
    reference: 'DSK-0002',
    orgName: '',
    category: 'export',
    priority: 'high',
    status: 'waiting_customer',
    createdAt: new Date(Date.UTC(2026, 6, 1)), // pencere DIŞI
    slaDueAt: END, // TAM pencere sonunda → AŞILMAMIŞ (sınır kesin küçüktür)
  },
  {
    reference: 'DSK-0003',
    orgName: 'Beta',
    category: 'access',
    priority: 'normal',
    status: 'escalated',
    createdAt: new Date(Date.UTC(2026, 7, 16)), // pencerede
    slaDueAt: new Date(END.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 gün kaldı
  },
  {
    reference: 'DSK-0004',
    orgName: 'Acme',
    category: 'builder',
    priority: 'low',
    status: 'resolved',
    createdAt: new Date(Date.UTC(2026, 7, 17)), // pencerede ama resolved
    slaDueAt: new Date(END.getTime() - 5 * 24 * 60 * 60 * 1000), // geçmiş olsa da resolved → sayılmaz
  },
];

describe('buildSupportOperations', () => {
  it('reportId/title sabit', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);
    expect(report.reportId).toBe('support-operations');
    expect(report.title).toBe('Support operations');
  });

  it('Open cases: durum kırılımı TÜM vakalar üzerinden (resolved dahil)', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);
    const items = report.sections.find((s) => s.heading === 'Open cases')!.items;
    expect(items).toEqual([
      { label: 'Open', value: '1' },
      { label: 'Waiting on customer', value: '1' },
      { label: 'Escalated', value: '1' },
      { label: 'Resolved', value: '1' },
    ]);
  });

  it('Priority pressure: yalnız resolved OLMAYAN vakalar', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);
    const items = report.sections.find((s) => s.heading === 'Priority pressure')!.items;
    expect(items).toEqual([
      { label: 'Urgent', value: '1' },
      { label: 'High', value: '1' },
      { label: 'Normal', value: '1' },
      { label: 'Low', value: '0' }, // DSK-0004 low ama resolved → sayılmaz
    ]);
  });

  it('Window: pencerede açılan (resolved dahil), escalated, SLA aşımı', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);
    const items = report.sections.find((s) => s.heading === 'Window')!.items;
    expect(items).toContainEqual({ label: 'Opened in window', value: '3' }); // DSK-0001,0003,0004
    expect(items).toContainEqual({ label: 'Escalated', value: '1' });
    expect(items).toContainEqual({ label: 'SLA breaches', value: '1' }); // yalnız DSK-0001
  });

  it('SLA aşımı sınırı: tam pencere sonunda biten AŞILMIŞ SAYILMAZ, 1ms önce biten SAYILIR', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);
    const breaches = report.sections.find((s) => s.heading === 'Window')!.items.find(
      (i) => i.label === 'SLA breaches',
    );
    // DSK-0002 tam END'de biter → sayılmaz; DSK-0001 1ms önce → sayılır. Toplam 1.
    expect(breaches).toEqual({ label: 'SLA breaches', value: '1' });
  });

  it('tablo: resolved HARİÇ, vade en yakın önce, org boşsa —', async () => {
    const { db } = fakeDb(CASES);
    const report = await buildSupportOperations(db, WINDOW);

    expect(report.table?.columns).toEqual(['Reference', 'Customer', 'Category', 'Priority', 'Status', 'Due']);
    expect(report.table?.rows).toEqual([
      ['DSK-0001', 'Acme', 'billing', 'urgent', 'open', '1d overdue'],
      ['DSK-0002', '—', 'export', 'high', 'waiting_customer', '0d left'],
      ['DSK-0003', 'Beta', 'access', 'normal', 'escalated', '2d left'],
    ]);
  });

  it('içerik sınırı: seçim ASLA requesterEmail içermez (tek sorgu, activation-builder disiplini)', async () => {
    const { db, calls } = fakeDb(CASES);
    await buildSupportOperations(db, WINDOW);

    const args = calls['supportCase.findMany']?.[0] as { select: Record<string, unknown> };
    const keys = Object.keys(args!.select).sort();
    expect(keys).toEqual(['category', 'createdAt', 'orgName', 'priority', 'reference', 'slaDueAt', 'status'].sort());
    expect(keys).not.toContain('requesterEmail');
  });

  it('boş vaka listesi çökmez', async () => {
    const { db } = fakeDb([]);
    const report = await buildSupportOperations(db, WINDOW);
    expect(report.table?.rows).toEqual([]);
    expect(report.sections.find((s) => s.heading === 'Open cases')!.items).toEqual([
      { label: 'Open', value: '0' },
      { label: 'Waiting on customer', value: '0' },
      { label: 'Escalated', value: '0' },
      { label: 'Resolved', value: '0' },
    ]);
  });
});

describe('registry ↔ reporting-model tutarlılığı', () => {
  it('support-operations REPORT_BUILDERS içinde koşturulabilir', () => {
    expect(Object.keys(REPORT_BUILDERS)).toContain('support-operations');
    expect(REPORT_BUILDERS['support-operations']).toBe(buildSupportOperations);
  });

  it('REPORT_BUILDERS anahtarları RUNNABLE_REPORTS ile birebir eşleşir', () => {
    expect(Object.keys(REPORT_BUILDERS).sort()).toEqual([...RUNNABLE_REPORTS].sort());
  });

  it('TABLELESS_REPORT_IDS registry’nin TABLELESS_REPORTS’uyla eşleşir', () => {
    expect([...TABLELESS_REPORT_IDS].sort()).toEqual([...TABLELESS_REPORTS].sort());
  });

  it('TABLELESS listesindeki her rapor GERÇEKTEN tablosuz üretir (command-center)', async () => {
    for (const reportId of TABLELESS_REPORTS) {
      const builder = REPORT_BUILDERS[reportId];
      expect(builder, `${reportId} REPORT_BUILDERS'ta yok`).toBeTypeOf('function');
    }
    // command-center somut örnek: gerçekten tablo üretmediğini doğrula.
    const report = await buildCommandCenter(
      {
        organization: { count: async () => 0, aggregate: async () => ({ _sum: { entitledSeats: 0 } }) },
        senderIdentity: { count: async () => 0 },
        invoice: { groupBy: async () => [] },
        jobRun: { count: async () => 0 },
        errorGroup: { count: async () => 0 },
      } as unknown as ReportsDb,
      WINDOW,
    );
    expect(report.table).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import { buildRevenueCollections } from '../lib/reports/builders/revenue-collections';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

const past = new Date(Date.UTC(2026, 7, 1));
const future = new Date(Date.UTC(2026, 8, 30));

function dbWith(invoices: unknown[], captured: { args?: unknown } = {}) {
  return {
    invoice: {
      findMany: (args: unknown) => {
        captured.args = args;
        return Promise.resolve(invoices);
      },
    },
  } as unknown as ReportsDb;
}

const rows = [
  { amountCents: 10000, currency: 'USD', status: 'paid', dueAt: past, org: { name: 'Acme' } },
  { amountCents: 5000, currency: 'USD', status: 'due', dueAt: past, org: { name: 'Acme' } },
  { amountCents: 2000, currency: 'USD', status: 'due', dueAt: future, org: { name: 'Beta' } },
  { amountCents: 999, currency: 'USD', status: 'void', dueAt: null, org: { name: 'Beta' } },
  { amountCents: 70000, currency: 'TRY', status: 'due', dueAt: past, org: { name: 'Acme' } },
];

describe('buildRevenueCollections', () => {
  it('splits totals per currency and never mixes them (KPI guardrail)', async () => {
    const report = await buildRevenueCollections(dbWith(rows), WINDOW);

    const usd = report.sections.find((s) => s.heading === 'Totals (USD)');
    expect(usd?.items).toContainEqual({ label: 'Billed', value: '170.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Collected', value: '100.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Outstanding', value: '70.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Overdue', value: '50.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Collection rate', value: '59%' });

    const tr = report.sections.find((s) => s.heading === 'Totals (TRY)');
    expect(tr?.items).toContainEqual({ label: 'Billed', value: '700.00 TRY' });
  });

  it('void invoices never enter the billed denominator', async () => {
    const report = await buildRevenueCollections(
      dbWith([{ amountCents: 999, currency: 'USD', status: 'void', dueAt: null, org: { name: 'X' } }]),
      WINDOW,
    );
    expect(report.sections[0]!.items).toContainEqual({ label: 'Invoices in window', value: '0' });
  });

  it('builds a per-org table sorted by billed desc', async () => {
    const report = await buildRevenueCollections(dbWith(rows), WINDOW);

    expect(report.table?.columns).toEqual([
      'Organization', 'Currency', 'Billed', 'Collected', 'Outstanding', 'Overdue',
    ]);
    expect(report.table?.rows?.[0]).toEqual(['Acme', 'TRY', '700.00', '0.00', '700.00', '700.00']);
    expect(report.table?.rows?.[1]).toEqual(['Acme', 'USD', '150.00', '100.00', '50.00', '50.00']);
  });

  it('windows on issuedAt and selects only commercial fields', async () => {
    const captured: { args?: unknown } = {};
    await buildRevenueCollections(dbWith([], captured), WINDOW);

    const args = captured.args as {
      where: { issuedAt: { gte: Date; lt: Date } };
      select: Record<string, unknown>;
    };
    expect(args.where.issuedAt).toEqual({ gte: WINDOW.start, lt: WINDOW.end });
    // İÇERİK SINIRI: org'dan yalnız ad; üye/kişi alanı yok.
    expect(args.select.org).toEqual({ select: { name: true } });
    expect(Object.keys(args.select).sort()).toEqual(['amountCents', 'currency', 'dueAt', 'org', 'status']);
  });
});

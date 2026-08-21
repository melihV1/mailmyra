import { describe, expect, it } from 'vitest';

import { buildCommandCenter } from '../lib/reports/builders/command-center';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

/** Sahte db — her sorgu sabit döner, çağrı argümanları yakalanır. */
function fakeDb() {
  const calls: Record<string, unknown[]> = {};
  const capture = (name: string, value: unknown) => (args: unknown) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(value);
  };
  const db = {
    organization: {
      count: capture('organization.count', 10),
      aggregate: capture('organization.aggregate', { _sum: { entitledSeats: 42 } }),
    },
    senderIdentity: { count: capture('senderIdentity.count', 7) },
    invoice: {
      groupBy: capture('invoice.groupBy', [
        { currency: 'USD', _sum: { amountCents: 30000 }, _count: { _all: 3 } },
      ]),
    },
    jobRun: { count: capture('jobRun.count', 1) },
    errorGroup: { count: capture('errorGroup.count', 2) },
  };
  return { db: db as unknown as ReportsDb, calls };
}

describe('buildCommandCenter', () => {
  it('assembles aggregate sections without any table', async () => {
    const { db } = fakeDb();
    const report = await buildCommandCenter(db, WINDOW);

    expect(report.reportId).toBe('command-center');
    expect(report.title).toBe('Executive command center');
    expect(report.table).toBeUndefined();

    const all = report.sections.flatMap((s) => s.items);
    expect(all).toContainEqual({ label: 'Active seats', value: '7' });
    expect(all).toContainEqual({ label: 'Entitled seats', value: '42' });
    expect(all).toContainEqual({ label: 'Outstanding', value: '300.00 USD (3)' });
  });

  it('scopes window queries to the window', async () => {
    const { db, calls } = fakeDb();
    await buildCommandCenter(db, WINDOW);

    const newOrgCall = (calls['organization.count'] ?? []).find(
      (a) => (a as { where?: { createdAt?: unknown } })?.where?.createdAt,
    ) as { where: { createdAt: { gte: Date; lt: Date } } };
    expect(newOrgCall.where.createdAt.gte).toEqual(WINDOW.start);
    expect(newOrgCall.where.createdAt.lt).toEqual(WINDOW.end);
  });

  it('never queries personal-data fields', async () => {
    const { db, calls } = fakeDb();
    await buildCommandCenter(db, WINDOW);
    // Sayım/agrega dışında hiçbir findMany/select yok → kişisel veri yolu yok.
    expect(Object.keys(calls).every((k) => /\.(count|aggregate|groupBy)$/.test(k))).toBe(true);
  });
});

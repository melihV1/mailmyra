import { describe, expect, it } from 'vitest';

import { buildCustomerHealth } from '../lib/reports/builders/customer-health';
import type { ReportsDb } from '../lib/reports/types';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15));
const WINDOW = { start: new Date(Date.UTC(2026, 7, 14, 7, 15)), end: END };
const DAY = 24 * 60 * 60 * 1000;

function fakeDb() {
  const db = {
    organization: {
      findMany: () =>
        Promise.resolve([
          { id: 'o1', name: 'Acme', entitledSeats: 5, entitlementState: 'active' },
          { id: 'o2', name: 'Beta', entitledSeats: 0, entitlementState: 'trial' },
          { id: 'o3', name: 'Cadde', entitledSeats: 10, entitlementState: 'active' },
        ]),
    },
    senderIdentity: {
      groupBy: () => Promise.resolve([{ orgId: 'o1', _count: { _all: 4 } }]),
    },
    activityEvent: {
      groupBy: () =>
        Promise.resolve([
          { orgId: 'o1', _max: { createdAt: new Date(END.getTime() - 2 * DAY) } },
          { orgId: 'o3', _max: { createdAt: new Date(END.getTime() - 30 * DAY) } },
        ]),
    },
    invoice: {
      groupBy: () => Promise.resolve([{ orgId: 'o3', _count: { _all: 2 } }]),
    },
  };
  return db as unknown as ReportsDb;
}

describe('buildCustomerHealth', () => {
  it('renders one row per org with utilization and inactivity', async () => {
    const report = await buildCustomerHealth(fakeDb(), WINDOW);

    expect(report.table?.rows).toEqual([
      ['Acme', 'active', 4, 5, '80%', '2', 0],
      ['Beta', 'trial', 0, 0, '—', '—', 0], // payda 0 → '—' (KPI guardrail)
      ['Cadde', 'active', 0, 10, '0%', '30', 2],
    ]);
  });

  it('summarizes the portfolio honestly', async () => {
    const report = await buildCustomerHealth(fakeDb(), WINDOW);

    const items = report.sections[0]!.items;
    expect(items).toContainEqual({ label: 'Customers', value: '3' });
    expect(items).toContainEqual({ label: 'At ≥80% seat utilization', value: '1' });
    expect(items).toContainEqual({ label: 'With overdue invoices', value: '1' });
    // Beta hiç aktivite görmemiş, Cadde 30 gündür sessiz → 2.
    expect(items).toContainEqual({ label: 'Inactive ≥14 days (or never)', value: '2' });
  });
});

import { describe, expect, it } from 'vitest';

import type { InvoiceWorkbenchRow } from '../app/(admin)/invoice-workbench-model';
import { getAgingBuckets, getCurrencySummary, getCustomerHealth, getRequestFacts, getSeatFacts, OPERATIONS_DAY_MS, type DataRequestRow, type OperationsOrgRow } from '../app/(admin)/operations-model';

const NOW = Date.UTC(2026, 7, 20, 9, 0);
const iso = (days: number) => new Date(NOW + days * OPERATIONS_DAY_MS).toISOString();

function invoice(overrides: Partial<InvoiceWorkbenchRow> = {}): InvoiceWorkbenchRow {
  return { id: 'i1', number: 'MM-1', orgId: 'o1', orgName: 'Northwind', issuedAt: iso(-20), dueAt: iso(5), seats: 10, amountCents: 1000, currency: 'USD', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null, note: null, ...overrides };
}

function org(overrides: Partial<OperationsOrgRow> = {}): OperationsOrgRow {
  return { id: 'o1', name: 'Northwind', entitlementState: 'active', entitledSeats: 10, activeSeats: 8, trialEndsAt: null, memberCount: 3, childCount: 0, lastActivityAt: iso(-2), createdAt: iso(-100), ...overrides };
}

describe('admin operations model', () => {
  it('keeps currencies in separate ledgers', () => {
    const rows = [invoice(), invoice({ id: 'eur', currency: 'EUR', amountCents: 5000 })];
    expect(getCurrencySummary(rows, 'USD', NOW).outstanding).toBe(1000);
    expect(getCurrencySummary(rows, 'EUR', NOW).outstanding).toBe(5000);
  });

  it('groups overdue receivables by aging window', () => {
    const rows = [invoice({ id: 'current' }), invoice({ id: 'week', dueAt: iso(-3), amountCents: 2000 }), invoice({ id: 'month', dueAt: iso(-18), amountCents: 3000 }), invoice({ id: 'old', dueAt: iso(-40), amountCents: 4000 })];
    expect(getAgingBuckets(rows, NOW, 'USD')).toEqual({ current: 1000, '1-7': 2000, '8-30': 3000, '31+': 4000 });
  });

  it('surfaces seat overage and available capacity', () => {
    expect(getSeatFacts(org({ activeSeats: 13 }))).toMatchObject({ over: true, delta: 3, tone: 'danger' });
    expect(getSeatFacts(org())).toMatchObject({ over: false, available: 2, utilization: 80 });
  });

  it('uses explainable customer-health signals', () => {
    expect(getCustomerHealth(org(), NOW)).toMatchObject({ score: 100, band: 'healthy', signals: [] });
    expect(getCustomerHealth(org({ entitlementState: 'past_due', activeSeats: 12, lastActivityAt: iso(-35) }), NOW)).toMatchObject({ band: 'risk' });
  });

  it('flags due and overdue data requests', () => {
    const request: DataRequestRow = { id: 'd1', reference: 'KVKK-1', subjectEmail: 'a@example.com', customer: 'Northwind', type: 'access', status: 'in_progress', receivedAt: iso(-20), dueAt: iso(3), owner: null, evidenceCount: 0, identityVerified: true };
    expect(getRequestFacts(request, NOW)).toMatchObject({ remainingDays: 3, urgent: true, overdue: false });
    expect(getRequestFacts({ ...request, dueAt: iso(-2) }, NOW)).toMatchObject({ remainingDays: -2, overdue: true });
  });
});

import { describe, expect, it } from 'vitest';

import {
  INVOICE_DAY_MS,
  getInvoiceFacts,
  getInvoiceTimeline,
  matchesInvoiceFocus,
  sortInvoiceRows,
  summarizeInvoices,
  type InvoiceWorkbenchRow,
} from '../app/(admin)/invoice-workbench-model';

const NOW = Date.UTC(2026, 7, 20, 9, 0);

function row(overrides: Partial<InvoiceWorkbenchRow> = {}): InvoiceWorkbenchRow {
  return {
    id: 'invoice-1',
    number: 'MM-2026-001',
    orgId: 'org-1',
    orgName: 'Northwind',
    issuedAt: new Date(NOW - 10 * INVOICE_DAY_MS).toISOString(),
    dueAt: new Date(NOW + 10 * INVOICE_DAY_MS).toISOString(),
    seats: 25,
    amountCents: 2500,
    currency: 'USD',
    status: 'due',
    paidAt: null,
    paymentMethod: null,
    paymentReference: null,
    note: null,
    ...overrides,
  };
}

describe('invoice workbench model', () => {
  it('summarizes authoritative amounts without counting void invoices as billed', () => {
    const rows = [
      row({ id: 'due', amountCents: 2500 }),
      row({ id: 'paid', orgId: 'org-2', amountCents: 4000, status: 'paid' }),
      row({ id: 'void', amountCents: 9000, status: 'void' }),
    ];

    expect(summarizeInvoices(rows, NOW)).toEqual({
      invoiceCount: 3,
      customerCount: 2,
      billedCents: 6500,
      collectedCents: 4000,
      outstandingCents: 2500,
      overdueCents: 0,
      overdueCount: 0,
    });
  });

  it('treats a due date as inclusive before marking the invoice overdue', () => {
    const today = new Date(NOW).toISOString();
    expect(getInvoiceFacts(row({ dueAt: today }), NOW).isOverdue).toBe(false);
    expect(
      getInvoiceFacts(row({ dueAt: new Date(NOW - INVOICE_DAY_MS).toISOString() }), NOW),
    ).toMatchObject({ isOverdue: true, daysOverdue: 1 });
  });

  it('filters overdue separately from all due invoices', () => {
    const future = row();
    const overdue = row({ dueAt: new Date(NOW - 3 * INVOICE_DAY_MS).toISOString() });
    expect(matchesInvoiceFocus(future, 'due', NOW)).toBe(true);
    expect(matchesInvoiceFocus(future, 'overdue', NOW)).toBe(false);
    expect(matchesInvoiceFocus(overdue, 'overdue', NOW)).toBe(true);
  });

  it('sorts overdue invoices before routine due and settled records', () => {
    const paid = row({ id: 'paid', status: 'paid' });
    const due = row({ id: 'due' });
    const overdue = row({ id: 'overdue', dueAt: new Date(NOW - INVOICE_DAY_MS).toISOString() });
    expect(sortInvoiceRows([paid, due, overdue], 'attention', NOW).map((item) => item.id)).toEqual([
      'overdue',
      'due',
      'paid',
    ]);
  });

  it('builds a bounded billing timeline and completes it on payment', () => {
    expect(getInvoiceTimeline(row(), NOW)).toMatchObject({
      percent: 50,
      elapsedDays: 10,
      totalDays: 20,
      remainingDays: 10,
      tone: 'primary',
    });
    expect(getInvoiceTimeline(row({ status: 'paid' }), NOW)).toMatchObject({
      percent: 100,
      tone: 'success',
    });
  });
});

export const INVOICE_DAY_MS = 24 * 60 * 60 * 1000;

export type InvoiceFocus = 'all' | 'due' | 'overdue' | 'paid' | 'void';
export type InvoiceSort = 'attention' | 'issued' | 'due' | 'amount';

export interface InvoiceWorkbenchRow {
  id: string;
  number: string;
  orgId: string;
  orgName: string;
  issuedAt: string;
  dueAt: string | null;
  seats: number;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  note: string | null;
}

export interface InvoiceFacts {
  isDue: boolean;
  isPaid: boolean;
  isVoid: boolean;
  isOverdue: boolean;
  dueMs: number | null;
  daysOverdue: number;
  urgency: number;
}

export interface InvoiceSummary {
  invoiceCount: number;
  customerCount: number;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
}

export interface InvoiceTimeline {
  percent: number;
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
  tone: 'primary' | 'warning' | 'danger' | 'success' | 'secondary';
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function endOfUtcDay(time: number): number {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) - 1;
}

export function getInvoiceFacts(row: InvoiceWorkbenchRow, now: number): InvoiceFacts {
  const dueMs = parseDate(row.dueAt);
  const isDue = row.status === 'due';
  const isPaid = row.status === 'paid';
  const isVoid = row.status === 'void';
  const isOverdue = isDue && dueMs !== null && now > endOfUtcDay(dueMs);
  const daysOverdue = isOverdue
    ? Math.max(1, Math.ceil((now - endOfUtcDay(dueMs ?? now)) / INVOICE_DAY_MS))
    : 0;

  return {
    isDue,
    isPaid,
    isVoid,
    isOverdue,
    dueMs,
    daysOverdue,
    urgency: isOverdue ? 4 : isDue ? 3 : isPaid ? 1 : 0,
  };
}

export function summarizeInvoices(
  rows: readonly InvoiceWorkbenchRow[],
  now: number,
): InvoiceSummary {
  const customers = new Set<string>();

  return rows.reduce<InvoiceSummary>(
    (summary, row) => {
      const facts = getInvoiceFacts(row, now);
      customers.add(row.orgId);
      summary.invoiceCount += 1;
      summary.customerCount = customers.size;

      if (!facts.isVoid) summary.billedCents += row.amountCents;
      if (facts.isPaid) summary.collectedCents += row.amountCents;
      if (facts.isDue) summary.outstandingCents += row.amountCents;
      if (facts.isOverdue) {
        summary.overdueCents += row.amountCents;
        summary.overdueCount += 1;
      }
      return summary;
    },
    {
      invoiceCount: 0,
      customerCount: 0,
      billedCents: 0,
      collectedCents: 0,
      outstandingCents: 0,
      overdueCents: 0,
      overdueCount: 0,
    },
  );
}

export function matchesInvoiceFocus(
  row: InvoiceWorkbenchRow,
  focus: InvoiceFocus,
  now: number,
): boolean {
  const facts = getInvoiceFacts(row, now);
  if (focus === 'overdue') return facts.isOverdue;
  if (focus === 'due') return facts.isDue;
  if (focus === 'paid') return facts.isPaid;
  if (focus === 'void') return facts.isVoid;
  return true;
}

export function sortInvoiceRows(
  rows: readonly InvoiceWorkbenchRow[],
  sort: InvoiceSort,
  now: number,
): InvoiceWorkbenchRow[] {
  return [...rows].sort((a, b) => {
    const af = getInvoiceFacts(a, now);
    const bf = getInvoiceFacts(b, now);

    if (sort === 'amount') return b.amountCents - a.amountCents;
    if (sort === 'issued') return (parseDate(b.issuedAt) ?? 0) - (parseDate(a.issuedAt) ?? 0);
    if (sort === 'due') {
      return (af.dueMs ?? Number.MAX_SAFE_INTEGER) - (bf.dueMs ?? Number.MAX_SAFE_INTEGER);
    }
    return bf.urgency - af.urgency ||
      (af.dueMs ?? Number.MAX_SAFE_INTEGER) - (bf.dueMs ?? Number.MAX_SAFE_INTEGER) ||
      (parseDate(b.issuedAt) ?? 0) - (parseDate(a.issuedAt) ?? 0);
  });
}

export function getInvoiceTimeline(
  row: InvoiceWorkbenchRow,
  now: number,
): InvoiceTimeline | null {
  const issuedMs = parseDate(row.issuedAt);
  const dueMs = parseDate(row.dueAt);
  const facts = getInvoiceFacts(row, now);

  if (issuedMs === null || dueMs === null || dueMs <= issuedMs || facts.isVoid) return null;

  const durationMs = dueMs - issuedMs;
  const elapsedMs = Math.min(durationMs, Math.max(0, now - issuedMs));
  const totalDays = Math.max(1, Math.ceil(durationMs / INVOICE_DAY_MS));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.floor(elapsedMs / INVOICE_DAY_MS)));
  const remainingDays = facts.isOverdue ? 0 : Math.max(0, Math.ceil((dueMs - now) / INVOICE_DAY_MS));
  const percent = facts.isPaid || facts.isOverdue
    ? 100
    : Math.min(100, Math.max(0, Math.round((elapsedMs / durationMs) * 100)));

  return {
    percent,
    elapsedDays,
    totalDays,
    remainingDays,
    tone: facts.isPaid ? 'success' : facts.isOverdue ? 'danger' : remainingDays <= 7 ? 'warning' : 'primary',
  };
}

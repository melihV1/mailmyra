import type { InvoiceWorkbenchRow } from './invoice-workbench-model';

export const OPERATIONS_DAY_MS = 24 * 60 * 60 * 1000;

export interface OperationsOrgRow {
  id: string;
  name: string;
  entitlementState: string;
  entitledSeats: number;
  activeSeats: number;
  trialEndsAt: string | null;
  memberCount: number;
  childCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface CustomerUserRow {
  id: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  memberships: Array<{ orgId: string; orgName: string; role: string; joinedAt: string }>;
}

export interface StaffAccountRow {
  id: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ApprovalQueueRow {
  id: string;
  title: string;
  domain: string;
  requester: string;
  customer: string | null;
  risk: 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requiredApprovals: number;
  approvals: number;
}

export interface DataRequestRow {
  id: string;
  reference: string;
  subjectEmail: string;
  customer: string;
  type: 'access' | 'erasure' | 'correction' | 'portability';
  status: 'intake' | 'identity_check' | 'in_progress' | 'legal_review' | 'completed';
  receivedAt: string;
  dueAt: string;
  owner: string | null;
  evidenceCount: number;
}

export interface ReceivableFacts {
  dueAt: number | null;
  daysUntilDue: number | null;
  daysOverdue: number;
  bucket: 'current' | '1-7' | '8-30' | '31+';
}

export function getReceivableFacts(row: InvoiceWorkbenchRow, now: number): ReceivableFacts {
  const dueAt = row.dueAt ? Date.parse(row.dueAt) : null;
  if (row.status !== 'due' || dueAt === null || !Number.isFinite(dueAt)) {
    return { dueAt: null, daysUntilDue: null, daysOverdue: 0, bucket: 'current' };
  }

  const delta = dueAt - now;
  const daysUntilDue = Math.ceil(delta / OPERATIONS_DAY_MS);
  const daysOverdue = delta < 0 ? Math.max(1, Math.ceil(-delta / OPERATIONS_DAY_MS)) : 0;
  const bucket = daysOverdue === 0 ? 'current' : daysOverdue <= 7 ? '1-7' : daysOverdue <= 30 ? '8-30' : '31+';
  return { dueAt, daysUntilDue, daysOverdue, bucket };
}

export function getAgingBuckets(rows: readonly InvoiceWorkbenchRow[], now: number, currency: string) {
  const buckets = { current: 0, '1-7': 0, '8-30': 0, '31+': 0 };
  rows.filter((row) => row.currency === currency && row.status === 'due').forEach((row) => {
    buckets[getReceivableFacts(row, now).bucket] += row.amountCents;
  });
  return buckets;
}

export function getCurrencySummary(rows: readonly InvoiceWorkbenchRow[], currency: string, now: number) {
  return rows.filter((row) => row.currency === currency).reduce(
    (summary, row) => {
      if (row.status !== 'void') summary.billed += row.amountCents;
      if (row.status === 'paid') summary.collected += row.amountCents;
      if (row.status === 'due') {
        summary.outstanding += row.amountCents;
        summary.dueCount += 1;
        const facts = getReceivableFacts(row, now);
        if (facts.daysOverdue > 0) {
          summary.overdue += row.amountCents;
          summary.overdueCount += 1;
        }
        if (facts.daysUntilDue !== null && facts.daysUntilDue >= 0 && facts.daysUntilDue <= 7) {
          summary.dueSoon += row.amountCents;
        }
      }
      return summary;
    },
    { billed: 0, collected: 0, outstanding: 0, overdue: 0, dueSoon: 0, dueCount: 0, overdueCount: 0 },
  );
}

export function getMonthlyRevenue(rows: readonly InvoiceWorkbenchRow[], currency: string, now: number) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      label: date.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }),
      billed: 0,
      collected: 0,
    };
  });
  const byKey = new Map(points.map((point) => [point.key, point]));
  rows.filter((row) => row.currency === currency && row.status !== 'void').forEach((row) => {
    const issued = new Date(row.issuedAt);
    const key = `${issued.getUTCFullYear()}-${issued.getUTCMonth()}`;
    const point = byKey.get(key);
    if (!point) return;
    point.billed += row.amountCents;
    if (row.status === 'paid') point.collected += row.amountCents;
  });
  return points;
}

export function getSeatFacts(row: OperationsOrgRow) {
  const utilization = row.entitledSeats > 0 ? Math.round((row.activeSeats / row.entitledSeats) * 100) : 0;
  const delta = row.activeSeats - row.entitledSeats;
  return {
    utilization,
    delta,
    over: delta > 0,
    available: Math.max(0, -delta),
    tone: delta > 0 ? 'danger' : utilization >= 90 ? 'warning' : 'success',
  } as const;
}

export function getCustomerHealth(row: OperationsOrgRow, now: number) {
  let score = 100;
  const signals: string[] = [];
  const lastActivity = row.lastActivityAt ? Date.parse(row.lastActivityAt) : null;
  const inactiveDays = lastActivity && Number.isFinite(lastActivity)
    ? Math.max(0, Math.floor((now - lastActivity) / OPERATIONS_DAY_MS))
    : null;
  const seats = getSeatFacts(row);

  if (row.entitlementState === 'past_due') { score -= 35; signals.push('Past due'); }
  if (row.entitlementState === 'cancelled') { score -= 55; signals.push('Cancelled'); }
  if (row.entitlementState === 'trial' && row.trialEndsAt && Date.parse(row.trialEndsAt) < now) {
    score -= 30; signals.push('Trial expired');
  }
  if (seats.over) { score -= 20; signals.push(`${seats.delta} seats over`); }
  if (row.memberCount === 0) { score -= 20; signals.push('No members'); }
  if (inactiveDays === null) { score -= 20; signals.push('No activity'); }
  else if (inactiveDays >= 30) { score -= 25; signals.push(`${inactiveDays}d inactive`); }
  else if (inactiveDays >= 14) { score -= 12; signals.push(`${inactiveDays}d inactive`); }
  if (row.activeSeats === 0) { score -= 15; signals.push('No active seats'); }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    signals,
    inactiveDays,
    band: score >= 80 ? 'healthy' : score >= 55 ? 'watch' : 'risk',
    tone: score >= 80 ? 'success' : score >= 55 ? 'warning' : 'danger',
  } as const;
}

export function getRequestFacts(row: DataRequestRow, now: number) {
  const dueAt = Date.parse(row.dueAt);
  const remainingDays = Math.ceil((dueAt - now) / OPERATIONS_DAY_MS);
  const completed = row.status === 'completed';
  return {
    remainingDays,
    completed,
    overdue: !completed && remainingDays < 0,
    urgent: !completed && remainingDays >= 0 && remainingDays <= 5,
  };
}


export const ACCESS_REVIEW_WINDOW_MS = 15 * 60 * 1000;
export const ACCESS_DAY_MS = 24 * 60 * 60 * 1000;

export type AccessPeriod = 'today' | '7' | '30' | 'all';
export type AccessSignal = 'all' | 'review' | 'routine';
export type AccessSort = 'newest' | 'oldest' | 'customer' | 'staff';

export interface StaffAccessLogRow {
  id: string;
  staffEmail: string;
  orgId: string;
  orgName: string;
  scope: string;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AccessLogSummary {
  reads: number;
  readsToday: number;
  activeStaff: number;
  customersAccessed: number;
  reviewSignals: number;
}

export interface AccessReviewFacts {
  signal: 'review' | 'routine';
  label: string;
  detail: string;
  nearbyReads: number;
}

function parsedTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getAccessReviewFacts(
  row: StaffAccessLogRow,
  rows: readonly StaffAccessLogRow[],
): AccessReviewFacts {
  const time = parsedTime(row.createdAt);
  const nearby = rows.filter((candidate) => {
    if (candidate.staffEmail !== row.staffEmail || candidate.orgId !== row.orgId) return false;
    return Math.abs(parsedTime(candidate.createdAt) - time) <= ACCESS_REVIEW_WINDOW_MS;
  }).length;

  if (nearby >= 5) {
    return {
      signal: 'review',
      label: 'Review burst',
      detail: `${nearby} reads by this staff member for the same customer within 15 minutes.`,
      nearbyReads: nearby,
    };
  }

  return {
    signal: 'routine',
    label: 'Routine read',
    detail: nearby > 1
      ? `${nearby} related reads within the same 15-minute work window.`
      : 'No concentrated read pattern in the loaded audit window.',
    nearbyReads: nearby,
  };
}

export function summarizeAccessLog(
  rows: readonly StaffAccessLogRow[],
  now: number,
): AccessLogSummary {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const reviewSignals = new Set(
    rows
      .filter((row) => getAccessReviewFacts(row, rows).signal === 'review')
      .map((row) => `${row.staffEmail}:${row.orgId}:${Math.floor(parsedTime(row.createdAt) / ACCESS_REVIEW_WINDOW_MS)}`),
  ).size;

  return {
    reads: rows.length,
    readsToday: rows.filter((row) => parsedTime(row.createdAt) >= todayStart.getTime()).length,
    activeStaff: new Set(rows.map((row) => row.staffEmail)).size,
    customersAccessed: new Set(rows.map((row) => row.orgId)).size,
    reviewSignals,
  };
}

export function matchesAccessPeriod(
  row: StaffAccessLogRow,
  period: AccessPeriod,
  now: number,
): boolean {
  if (period === 'all') return true;
  const time = parsedTime(row.createdAt);
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return time >= start.getTime();
  }
  return time >= now - Number(period) * ACCESS_DAY_MS;
}

export function sortAccessRows(
  rows: readonly StaffAccessLogRow[],
  sort: AccessSort,
): StaffAccessLogRow[] {
  return [...rows].sort((a, b) => {
    if (sort === 'oldest') return parsedTime(a.createdAt) - parsedTime(b.createdAt);
    if (sort === 'customer') {
      return a.orgName.localeCompare(b.orgName) || parsedTime(b.createdAt) - parsedTime(a.createdAt);
    }
    if (sort === 'staff') {
      return a.staffEmail.localeCompare(b.staffEmail) || parsedTime(b.createdAt) - parsedTime(a.createdAt);
    }
    return parsedTime(b.createdAt) - parsedTime(a.createdAt);
  });
}

export function getAccessScopeLabel(scope: string): string {
  return ({
    org: 'Customer profile',
    members: 'Customer members',
    senders: 'Senders',
    signatures: 'Signatures',
    signature: 'Signature preview',
  } as Record<string, string>)[scope] ?? scope.replaceAll('_', ' ');
}

export function getAccessScopeIcon(scope: string): string {
  return ({
    org: 'tabler-building',
    members: 'tabler-users-group',
    senders: 'tabler-users',
    signatures: 'tabler-signature',
    signature: 'tabler-eye',
  } as Record<string, string>)[scope] ?? 'tabler-shield-search';
}

export function getClientLabel(userAgent: string | null): string {
  if (!userAgent) return 'Client not recorded';
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/Chrome\//i.test(userAgent)) return 'Google Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  return 'Other client';
}

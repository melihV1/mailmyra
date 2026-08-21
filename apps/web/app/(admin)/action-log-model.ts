export const ACTION_DAY_MS = 24 * 60 * 60 * 1000;

export type ActionPeriod = 'today' | '7' | '30' | 'all';
export type ActionFocus = 'all' | 'entitlement' | 'billing';
export type ActionSort = 'newest' | 'oldest' | 'customer' | 'staff';

export interface AdminActionLogRow {
  id: string;
  staffEmail: string;
  orgId: string;
  orgName: string;
  action: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ActionDescriptor {
  label: string;
  category: Exclude<ActionFocus, 'all'>;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'info';
}

export interface ActionChange {
  field: string;
  before: unknown;
  after: unknown;
}

export function getActionDescriptor(action: string): ActionDescriptor {
  if (action === 'entitlement.set') {
    return {
      label: 'Entitlement updated',
      category: 'entitlement',
      icon: 'tabler-adjustments',
      tone: 'warning',
    };
  }
  if (action === 'invoice.created') {
    return {
      label: 'Invoice issued',
      category: 'billing',
      icon: 'tabler-file-plus',
      tone: 'success',
    };
  }
  if (action === 'invoice.status_set') {
    return {
      label: 'Invoice status changed',
      category: 'billing',
      icon: 'tabler-refresh',
      tone: 'info',
    };
  }
  return {
    label: humanize(action),
    category: 'entitlement',
    icon: 'tabler-pencil-check',
    tone: 'primary',
  };
}

export function getActionChanges(row: Pick<AdminActionLogRow, 'before' | 'after'>): ActionChange[] {
  const before = asRecord(row.before);
  const after = asRecord(row.after);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter((field) => stableValue(before[field]) !== stableValue(after[field]))
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

export function summarizeAdminActions(rows: readonly AdminActionLogRow[], now: number) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return {
    total: rows.length,
    today: rows.filter((row) => parsedTime(row.createdAt) >= todayStart.getTime()).length,
    activeStaff: new Set(rows.map((row) => row.staffEmail)).size,
    customersChanged: new Set(rows.map((row) => row.orgId)).size,
  };
}

export function matchesActionPeriod(row: AdminActionLogRow, period: ActionPeriod, now: number) {
  if (period === 'all') return true;
  const time = parsedTime(row.createdAt);
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return time >= start.getTime();
  }
  return time >= now - Number(period) * ACTION_DAY_MS;
}

export function matchesActionFocus(row: AdminActionLogRow, focus: ActionFocus) {
  return focus === 'all' || getActionDescriptor(row.action).category === focus;
}

export function sortAdminActions(rows: readonly AdminActionLogRow[], sort: ActionSort) {
  return [...rows].sort((a, b) => {
    if (sort === 'oldest') return parsedTime(a.createdAt) - parsedTime(b.createdAt);
    if (sort === 'customer') return a.orgName.localeCompare(b.orgName) || parsedTime(b.createdAt) - parsedTime(a.createdAt);
    if (sort === 'staff') return a.staffEmail.localeCompare(b.staffEmail) || parsedTime(b.createdAt) - parsedTime(a.createdAt);
    return parsedTime(b.createdAt) - parsedTime(a.createdAt);
  });
}

export function formatActionValue(value: unknown): string {
  if (value === undefined) return 'Not recorded';
  if (value === null || value === '') return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export function humanize(value: string): string {
  return value
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stableValue(value: unknown): string {
  if (value === undefined) return '__undefined__';
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return JSON.stringify(value.map(stableObject));
  return JSON.stringify(stableObject(value));
}

function stableObject(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableObject);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableObject(item)]),
  );
}

function parsedTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

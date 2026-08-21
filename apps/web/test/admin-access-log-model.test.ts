import { describe, expect, it } from 'vitest';

import {
  ACCESS_DAY_MS,
  getAccessReviewFacts,
  getAccessScopeLabel,
  getClientLabel,
  matchesAccessPeriod,
  sortAccessRows,
  summarizeAccessLog,
  type StaffAccessLogRow,
} from '../app/(admin)/access-log-model';

const NOW = new Date(2026, 7, 20, 12, 0, 0).getTime();
const MINUTE = 60 * 1000;

function row(overrides: Partial<StaffAccessLogRow> = {}): StaffAccessLogRow {
  return {
    id: 'event-1',
    staffEmail: 'support@voldi.net',
    orgId: 'org-1',
    orgName: 'Northwind',
    scope: 'org',
    targetId: 'org-1',
    ip: '192.0.2.1',
    userAgent: 'Mozilla/5.0 Chrome/139.0.0.0 Safari/537.36',
    createdAt: new Date(NOW - MINUTE).toISOString(),
    ...overrides,
  };
}

describe('staff access log model', () => {
  it('summarizes the loaded immutable audit window', () => {
    const rows = [
      row(),
      row({ id: 'event-2', staffEmail: 'billing@voldi.net', orgId: 'org-2', orgName: 'Atlas' }),
      row({ id: 'event-3', createdAt: new Date(NOW - 2 * ACCESS_DAY_MS).toISOString() }),
    ];

    expect(summarizeAccessLog(rows, NOW)).toMatchObject({
      reads: 3,
      readsToday: 2,
      activeStaff: 2,
      customersAccessed: 2,
    });
  });

  it('marks concentrated reads only when five related events share a 15-minute window', () => {
    const rows = Array.from({ length: 5 }, (_, index) => row({
      id: `event-${index}`,
      createdAt: new Date(NOW - index * 2 * MINUTE).toISOString(),
    }));

    expect(getAccessReviewFacts(rows[0]!, rows)).toMatchObject({
      signal: 'review',
      label: 'Review burst',
      nearbyReads: 5,
    });
    expect(getAccessReviewFacts(row({ orgId: 'org-other' }), rows)).toMatchObject({
      signal: 'routine',
      nearbyReads: 0,
    });
  });

  it('filters periods and sorts without mutating the input', () => {
    const newest = row({ id: 'newest', orgName: 'Zulu' });
    const oldest = row({ id: 'oldest', orgName: 'Alpha', createdAt: new Date(NOW - 12 * ACCESS_DAY_MS).toISOString() });
    const rows = [newest, oldest];

    expect(matchesAccessPeriod(newest, '7', NOW)).toBe(true);
    expect(matchesAccessPeriod(oldest, '7', NOW)).toBe(false);
    expect(sortAccessRows(rows, 'customer').map((item) => item.id)).toEqual(['oldest', 'newest']);
    expect(rows.map((item) => item.id)).toEqual(['newest', 'oldest']);
  });

  it('normalizes scope and client labels', () => {
    expect(getAccessScopeLabel('signature')).toBe('Signature preview');
    expect(getAccessScopeLabel('custom_scope')).toBe('custom scope');
    expect(getClientLabel('Mozilla/5.0 Edg/139.0')).toBe('Microsoft Edge');
    expect(getClientLabel(null)).toBe('Client not recorded');
  });
});

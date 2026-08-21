import { describe, expect, it } from 'vitest';

import {
  getActionChanges,
  getActionDescriptor,
  matchesActionPeriod,
  sortAdminActions,
  summarizeAdminActions,
  type AdminActionLogRow,
} from '../app/(admin)/action-log-model';

const now = Date.UTC(2026, 7, 20, 12);
const row = (patch: Partial<AdminActionLogRow> = {}): AdminActionLogRow => ({
  id: 'a1', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks',
  action: 'entitlement.set', targetId: null, before: { entitledSeats: 5, state: 'trial' },
  after: { entitledSeats: 8, state: 'trial' }, reason: 'Approved seat adjustment', ip: null,
  userAgent: null, createdAt: new Date(now - 60_000).toISOString(), ...patch,
});

describe('admin action log model', () => {
  it('maps authoritative action keys to product labels', () => {
    expect(getActionDescriptor('invoice.created')).toMatchObject({ label: 'Invoice issued', category: 'billing' });
    expect(getActionDescriptor('entitlement.set')).toMatchObject({ label: 'Entitlement updated', category: 'entitlement' });
  });

  it('returns only changed top-level fields', () => {
    expect(getActionChanges(row())).toEqual([{ field: 'entitledSeats', before: 5, after: 8 }]);
  });

  it('summarizes distinct staff and customers', () => {
    const rows = [row(), row({ id: 'a2', orgId: 'o2', staffEmail: 'billing@mailmyra.com' })];
    expect(summarizeAdminActions(rows, now)).toEqual({ total: 2, today: 2, activeStaff: 2, customersChanged: 2 });
  });

  it('filters periods and sorts customer names', () => {
    const old = row({ id: 'old', orgName: 'Atlas', createdAt: new Date(now - 40 * 86_400_000).toISOString() });
    const recent = row({ id: 'new', orgName: 'Zenith' });
    expect(matchesActionPeriod(old, '30', now)).toBe(false);
    expect(sortAdminActions([recent, old], 'customer').map((item) => item.id)).toEqual(['old', 'new']);
  });
});

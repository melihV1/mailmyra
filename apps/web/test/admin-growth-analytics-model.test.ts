import { describe, expect, it } from 'vitest';

import {
  groupLeads,
  growthFacts,
  growthLifecycle,
  momentumRows,
  registrationSeries,
  type GrowthLeadRow,
} from '../app/(admin)/growth-analytics-model';
import type { ProductAnalyticsSnapshot } from '../app/(admin)/product-analytics-model';

const now = Date.UTC(2026, 7, 20);
const iso = (days: number) => new Date(now + days * 86_400_000).toISOString();
const source: ProductAnalyticsSnapshot = {
  organizations: [
    { id: 'o1', name: 'One', entitlementState: 'active', createdAt: iso(-10), memberCount: 2, signatureCount: 2, senderCount: 2, activeSenderCount: 2, exportedSenderCount: 1, lastActivityAt: iso(-2) },
    { id: 'o2', name: 'Two', entitlementState: 'trial', createdAt: iso(-40), memberCount: 1, signatureCount: 1, senderCount: 1, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: null },
    { id: 'o3', name: 'Three', entitlementState: 'trial', createdAt: iso(-5), memberCount: 0, signatureCount: 0, senderCount: 0, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: iso(-1) },
  ],
  signatures: [],
  senders: [],
  events: [
    { id: 'e1', orgId: 'o1', orgName: 'One', type: 'export.zip', createdAt: iso(-1), fileCount: 2, senderCount: 1 },
  ],
};

describe('growth analytics model', () => {
  it('builds the durable lifecycle without session attribution', () => {
    expect(growthLifecycle(source).map((row) => row.value)).toEqual([3, 2, 2, 1, 1]);
    expect(growthLifecycle(source)[3]).toMatchObject({ rate: 33, stepRate: 50 });
  });

  it('summarizes recent registration and product evidence', () => {
    expect(growthFacts(source, now)).toMatchObject({ organizations: 3, recentOrganizations: 2, recentSignals: 1, activationRate: 33, exportRate: 33 });
  });

  it('keeps registration buckets chronological and bounded', () => {
    const rows = registrationSeries(source, now, 3);
    expect(rows).toHaveLength(3);
    expect(rows.reduce((sum, row) => sum + row.value, 0)).toBe(3);
  });

  it('ranks momentum and groups preview leads by explicit stage', () => {
    expect(momentumRows(source, now)[0]?.name).toBe('One');
    const leads: GrowthLeadRow[] = [
      { id: 'l1', company: 'A', contact: 'a', source: 'Demo', seats: 2, stage: 'new', createdAt: iso(-1), nextStep: 'Call' },
      { id: 'l2', company: 'B', contact: 'b', source: 'Referral', seats: 4, stage: 'won', createdAt: iso(-2), nextStep: 'Onboard' },
    ];
    expect(groupLeads(leads).map((row) => row.rows.length)).toEqual([1, 0, 0, 1, 0]);
  });
});

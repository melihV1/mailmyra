import { describe, expect, it } from 'vitest';

import { onboardingFacts, onboardingRows, slaState, sortSupportQueue, supportCaseFacts, type SupportCaseRow } from '../app/(admin)/support-operations-model';
import type { ProductAnalyticsSnapshot } from '../app/(admin)/product-analytics-model';

const now = Date.UTC(2026, 7, 20, 12);
const cases: SupportCaseRow[] = [
  { id: '1', reference: 'MM-1', subject: 'Overdue', customer: 'One', requester: 'a@x.test', channel: 'email', category: 'export', priority: 'high', status: 'open', owner: null, createdAt: new Date(now - 8 * 3_600_000).toISOString(), updatedAt: new Date(now).toISOString(), slaDueAt: new Date(now - 2 * 3_600_000).toISOString(), summary: 'x' },
  { id: '2', reference: 'MM-2', subject: 'Soon', customer: 'Two', requester: 'b@x.test', channel: 'form', category: 'billing', priority: 'urgent', status: 'waiting_customer', owner: 'support@mailmyra.com', createdAt: new Date(now - 2 * 3_600_000).toISOString(), updatedAt: new Date(now).toISOString(), slaDueAt: new Date(now + 2 * 3_600_000).toISOString(), summary: 'x' },
  { id: '3', reference: 'MM-3', subject: 'Done', customer: 'Three', requester: 'c@x.test', channel: 'staff', category: 'account', priority: 'low', status: 'resolved', owner: 'support@mailmyra.com', createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), slaDueAt: new Date(now + 8 * 3_600_000).toISOString(), summary: 'x' },
];

describe('support operations model', () => {
  it('summarizes only active cases for queue attention', () => {
    expect(supportCaseFacts(cases, now)).toEqual({ active: 2, breached: 1, dueSoon: 1, unassigned: 1, waiting: 1 });
  });

  it('orders the queue by SLA and reports breach state', () => {
    expect(sortSupportQueue(cases).map((row) => row.id)).toEqual(['1', '2']);
    expect(slaState(cases[0]!, now)).toMatchObject({ tone: 'danger', label: '2h overdue' });
  });

  it('derives onboarding from durable product milestones', () => {
    const source: ProductAnalyticsSnapshot = {
      organizations: [
        { id: 'o1', name: 'Complete', entitlementState: 'active', createdAt: new Date(now - 10 * 86_400_000).toISOString(), memberCount: 1, signatureCount: 1, senderCount: 1, activeSenderCount: 1, exportedSenderCount: 1, lastActivityAt: null },
        { id: 'o2', name: 'Stalled', entitlementState: 'trial', createdAt: new Date(now - 20 * 86_400_000).toISOString(), memberCount: 1, signatureCount: 0, senderCount: 0, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: null },
      ], signatures: [], senders: [], events: [],
    };
    const rows = onboardingRows(source, now);
    expect(rows[0]).toMatchObject({ name: 'Stalled', progress: 40, tone: 'warning', nextStep: 'Create the first signature' });
    expect(onboardingFacts(rows)).toMatchObject({ total: 2, complete: 1, atRisk: 1, average: 70 });
  });
});

import { describe, expect, it } from 'vitest';

import {
  activationStages,
  cohortRows,
  productFacts,
  templateFacts,
  type ProductAnalyticsSnapshot,
} from '../app/(admin)/product-analytics-model';

const now = Date.UTC(2026, 7, 20);
const iso = (days: number) => new Date(now + days * 86_400_000).toISOString();
const source: ProductAnalyticsSnapshot = {
  organizations: [
    { id: 'o1', name: 'One', entitlementState: 'active', createdAt: iso(-10), memberCount: 2, signatureCount: 2, senderCount: 1, activeSenderCount: 1, exportedSenderCount: 1, lastActivityAt: iso(-2) },
    { id: 'o2', name: 'Two', entitlementState: 'trial', createdAt: iso(-5), memberCount: 1, signatureCount: 1, senderCount: 1, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: null },
  ],
  signatures: [
    { id: 's1', orgId: 'o1', orgName: 'One', templateId: 'classic-horizontal', createdAt: iso(-9), updatedAt: iso(-1), assigned: true, size: 'medium', iconStyle: 'mono', hasCta: true, hasLogo: true, hasAvatar: false },
    { id: 's2', orgId: 'o1', orgName: 'One', templateId: 'classic-horizontal', createdAt: iso(-8), updatedAt: iso(-40), assigned: false, size: 'small', iconStyle: 'outline', hasCta: false, hasLogo: false, hasAvatar: true },
    { id: 's3', orgId: 'o2', orgName: 'Two', templateId: 'stacked-minimal', createdAt: iso(-4), updatedAt: iso(-2), assigned: false, size: 'medium', iconStyle: 'mono', hasCta: false, hasLogo: true, hasAvatar: false },
  ],
  senders: [
    { id: 'p1', orgId: 'o1', createdAt: iso(-9), publishedAt: iso(-8), deactivatedAt: null, lastExportedAt: iso(-1) },
    { id: 'p2', orgId: 'o2', createdAt: iso(-4), publishedAt: null, deactivatedAt: null, lastExportedAt: null },
  ],
  events: [
    { id: 'e1', orgId: 'o1', orgName: 'One', type: 'export.zip', createdAt: iso(-1), fileCount: 2, senderCount: 1 },
  ],
};

describe('product analytics model', () => {
  it('builds an honest activation funnel from workspace state', () => {
    expect(activationStages(source).map((row) => row.value)).toEqual([2, 2, 2, 1, 1]);
    expect(activationStages(source)[3]).toMatchObject({ loss: 1, stepRate: 50 });
  });

  it('summarizes export evidence and recent builder state', () => {
    expect(productFacts(source, now)).toMatchObject({ activeSenders: 1, exportCoverage: 100, recentSignatures: 2, exportedFiles: 2 });
  });

  it('ranks current template adoption without inventing conversion', () => {
    expect(templateFacts(source, now)[0]).toMatchObject({ label: 'classic-horizontal', value: 2, assigned: 1, recent: 1 });
  });

  it('labels operational return from recent activity', () => {
    const rows = cohortRows(source, now, 1);
    expect(rows[0]).toMatchObject({ workspaces: 2, activated: 1, returned: 1, activationRate: 50, returnRate: 100 });
  });
});

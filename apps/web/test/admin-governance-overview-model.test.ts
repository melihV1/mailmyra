import { describe, expect, it } from 'vitest';

import { buildGovernanceOverview } from '../app/(admin)/governance-overview-model';

const NOW = Date.UTC(2026, 7, 20, 9, 0);
const iso = (minutes: number) => new Date(NOW + minutes * 60 * 1000).toISOString();

describe('admin governance overview model', () => {
  it('keeps source readiness separate from record volume', () => {
    const snapshot = buildGovernanceOverview({ staff: [], access: [], actions: [], approvals: [], requests: [], now: NOW, sources: { staff: true, access: true, actions: true, approvals: false, requests: false } });
    expect(snapshot.readiness).toBe(60);
    expect(snapshot.controls.find((row) => row.id === 'access')).toMatchObject({ connected: true, value: '0 reads' });
    expect(snapshot.controls.find((row) => row.id === 'approvals')).toMatchObject({ connected: false, value: 'Schema required' });
  });

  it('combines review bursts, critical approvals and overdue requests in the risk queue', () => {
    const access = Array.from({ length: 5 }, (_, index) => ({ id: `r${index}`, staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Northwind', scope: 'org', targetId: null, ip: null, userAgent: null, createdAt: iso(-index - 1) }));
    const snapshot = buildGovernanceOverview({
      staff: [], access, actions: [], now: NOW,
      approvals: [{ id: 'a1', title: 'Void invoice', domain: 'Billing', requester: 'billing@mailmyra.com', customer: 'Northwind', risk: 'critical', status: 'pending', requestedAt: iso(-30), requiredApprovals: 2, approvals: 0 }],
      requests: [{ id: 'd1', reference: 'KVKK-1', subjectEmail: 'a@example.com', customer: 'Northwind', type: 'access', status: 'in_progress', receivedAt: iso(-2000), dueAt: iso(-1500), owner: null, evidenceCount: 0, identityVerified: true }],
      sources: { staff: true, access: true, actions: true, approvals: true, requests: true },
    });
    expect(snapshot.reviewSignals).toBe(1);
    expect(snapshot.riskQueue).toBe(3);
    expect(snapshot.activity[0]?.type).toBe('read');
  });
});

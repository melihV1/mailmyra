import { describe, expect, it } from 'vitest';

import {
  errorFacts,
  exportFacts,
  flagFacts,
  jobFacts,
  mailFacts,
  platformFacts,
  releaseFacts,
  type PlatformOperationsSnapshot,
} from '../app/(admin)/platform-operations-model';

const source: PlatformOperationsSnapshot = {
  product: {
    organizations: [],
    signatures: [],
    senders: [{ id: 's1', orgId: 'o1', createdAt: '2026-08-01', publishedAt: '2026-08-02', deactivatedAt: null, lastExportedAt: '2026-08-03' }],
    events: [{ id: 'e1', orgId: 'o1', orgName: 'A', type: 'export.zip', createdAt: '2026-08-03', fileCount: 4, senderCount: 4 }],
  },
  telemetry: {
    services: [{ id: 'api', name: 'API', group: 'Core', state: 'operational', latencyMs: 120, uptime: 99.9, checkedAt: '2026-08-20' }],
    mail: [
      { id: 'm1', kind: 'verification', provider: 'SMTP', recipientDomain: 'example.com', state: 'delivered', attempts: 1, createdAt: '2026-08-20' },
      { id: 'm2', kind: 'invitation', provider: 'SMTP', recipientDomain: 'example.com', state: 'failed', attempts: 2, createdAt: '2026-08-20' },
    ],
    exports: [{ id: 'x1', orgName: 'A', format: 'zip', state: 'complete', files: 4, durationMs: 800, createdAt: '2026-08-20' }],
    jobs: [{ id: 'j1', name: 'Cleanup', queue: 'maintenance', state: 'retrying', attempts: 2, durationMs: null, scheduledAt: '2026-08-20', startedAt: '2026-08-20' }],
    errors: [{ id: 'r1', fingerprint: 'abc', title: 'Failure', surface: 'export', severity: 'critical', events: 3, affectedOrgs: 2, firstSeenAt: '2026-08-19', lastSeenAt: '2026-08-20', state: 'open' }],
    releases: [{ id: 'v1', version: '1.0.0', environment: 'production', state: 'deployed', commit: 'abc1234', owner: 'ops', createdAt: '2026-08-20', checks: [{ label: 'Tests', passed: true }] }],
    flags: [{ id: 'f1', key: 'new_flow', label: 'New flow', description: 'Test', owner: 'product', state: 'testing', rollout: 25, environments: ['staging'], updatedAt: '2026-08-20' }],
  },
};

describe('admin platform operations model', () => {
  it('summarizes platform and delivery facts', () => {
    expect(platformFacts(source)).toMatchObject({ services: 1, operational: 1, averageLatency: 120, activeSenders: 1 });
    expect(mailFacts(source.telemetry.mail)).toEqual({ total: 2, delivered: 1, deferred: 0, failed: 1, deliveryRate: 50 });
  });

  it('keeps telemetry and durable export evidence separate', () => {
    expect(exportFacts(source)).toMatchObject({ completed: 1, files: 4, averageDuration: 800, evidenceEvents: 1, evidenceFiles: 4 });
    expect(jobFacts(source.telemetry.jobs)).toMatchObject({ active: 1, retries: 1 });
  });

  it('summarizes errors, releases and flags', () => {
    expect(errorFacts(source.telemetry.errors)).toMatchObject({ groups: 1, open: 1, critical: 1, events: 3 });
    expect(releaseFacts(source.telemetry.releases).latest?.version).toBe('1.0.0');
    expect(flagFacts(source.telemetry.flags)).toMatchObject({ total: 1, testing: 1, production: 0 });
  });
});

import type { PlatformOperationsSnapshot } from '../../(admin)/platform-operations-model';
import { productPreviewNow, productPreviewSource } from './product-fixtures';

export const platformPreviewNow = productPreviewNow;
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const iso = (offset: number) => new Date(platformPreviewNow + offset).toISOString();

export const platformPreviewSource: PlatformOperationsSnapshot = {
  product: productPreviewSource,
  telemetry: {
    services: [
      { id: 'web', name: 'Web application', group: 'Runtime', state: 'operational', latencyMs: 142, uptime: 99.98, checkedAt: iso(-2 * minute) },
      { id: 'api', name: 'Application API', group: 'Runtime', state: 'operational', latencyMs: 118, uptime: 99.99, checkedAt: iso(-2 * minute) },
      { id: 'db', name: 'Primary database', group: 'Data', state: 'operational', latencyMs: 34, uptime: 99.99, checkedAt: iso(-1 * minute) },
      { id: 'cdn', name: 'Asset delivery', group: 'Delivery', state: 'operational', latencyMs: 86, uptime: 99.97, checkedAt: iso(-3 * minute) },
      { id: 'smtp', name: 'Transactional mail', group: 'Delivery', state: 'degraded', latencyMs: 640, uptime: 99.72, checkedAt: iso(-2 * minute) },
      { id: 'exports', name: 'Export workers', group: 'Workers', state: 'operational', latencyMs: 210, uptime: 99.93, checkedAt: iso(-1 * minute) },
    ],
    mail: [
      { id: 'm1', kind: 'verification', provider: 'Mailmyra SMTP', recipientDomain: 'outlook.com', state: 'delivered', attempts: 1, createdAt: iso(-8 * minute) },
      { id: 'm2', kind: 'invitation', provider: 'Mailmyra SMTP', recipientDomain: 'gmail.com', state: 'delivered', attempts: 1, createdAt: iso(-18 * minute) },
      { id: 'm3', kind: 'notification', provider: 'Mailmyra SMTP', recipientDomain: 'northwind.example', state: 'deferred', attempts: 2, createdAt: iso(-31 * minute) },
      { id: 'm4', kind: 'verification', provider: 'Mailmyra SMTP', recipientDomain: 'icloud.com', state: 'delivered', attempts: 1, createdAt: iso(-52 * minute) },
      { id: 'm5', kind: 'support', provider: 'Mailmyra SMTP', recipientDomain: 'harborlane.example', state: 'delivered', attempts: 1, createdAt: iso(-73 * minute) },
      { id: 'm6', kind: 'invitation', provider: 'Mailmyra SMTP', recipientDomain: 'legacy-mail.example', state: 'bounced', attempts: 3, createdAt: iso(-2 * hour) },
      { id: 'm7', kind: 'notification', provider: 'Mailmyra SMTP', recipientDomain: 'gmail.com', state: 'delivered', attempts: 1, createdAt: iso(-3 * hour) },
      { id: 'm8', kind: 'verification', provider: 'Mailmyra SMTP', recipientDomain: 'outlook.com', state: 'failed', attempts: 3, createdAt: iso(-4 * hour) },
    ],
    exports: [
      { id: 'x1', orgName: 'Harbor & Lane Agency', format: 'zip', state: 'complete', files: 24, durationMs: 1840, createdAt: iso(-12 * minute) },
      { id: 'x2', orgName: 'Bristol Metalworks', format: 'htm', state: 'complete', files: 1, durationMs: 320, createdAt: iso(-26 * minute) },
      { id: 'x3', orgName: 'Atlas Field Services', format: 'zip', state: 'running', files: 60, durationMs: null, createdAt: iso(-4 * minute) },
      { id: 'x4', orgName: 'Northwind Studio', format: 'clipboard', state: 'complete', files: 1, durationMs: 90, createdAt: iso(-68 * minute) },
      { id: 'x5', orgName: 'Fieldnote Publishing', format: 'zip', state: 'failed', files: 40, durationMs: 960, createdAt: iso(-2 * hour) },
      { id: 'x6', orgName: 'Copperline Systems', format: 'zip', state: 'complete', files: 18, durationMs: 1310, createdAt: iso(-5 * hour) },
    ],
    jobs: [
      { id: 'j1', name: 'Expire auth tokens', queue: 'maintenance', state: 'complete', attempts: 1, durationMs: 920, scheduledAt: iso(-2 * hour), startedAt: iso(-2 * hour + minute) },
      { id: 'j2', name: 'Remove stale sessions', queue: 'maintenance', state: 'running', attempts: 1, durationMs: null, scheduledAt: iso(-5 * minute), startedAt: iso(-4 * minute) },
      { id: 'j3', name: 'Dispatch invitation mail', queue: 'mail', state: 'retrying', attempts: 2, durationMs: null, scheduledAt: iso(-18 * minute), startedAt: iso(-17 * minute) },
      { id: 'j4', name: 'Build team export', queue: 'exports', state: 'running', attempts: 1, durationMs: null, scheduledAt: iso(-4 * minute), startedAt: iso(-3 * minute) },
      { id: 'j5', name: 'Delete revoked asset', queue: 'privacy', state: 'queued', attempts: 0, durationMs: null, scheduledAt: iso(6 * minute), startedAt: null },
      { id: 'j6', name: 'Send seat warning', queue: 'mail', state: 'failed', attempts: 3, durationMs: 430, scheduledAt: iso(-3 * hour), startedAt: iso(-3 * hour) },
      { id: 'j7', name: 'Invoice due reminder', queue: 'billing', state: 'queued', attempts: 0, durationMs: null, scheduledAt: iso(22 * minute), startedAt: null },
    ],
    errors: [
      { id: 'er1', fingerprint: 'export.asset.fetch', title: 'Remote asset could not be embedded', surface: 'Export pipeline', severity: 'critical', events: 18, affectedOrgs: 3, firstSeenAt: iso(-2 * day), lastSeenAt: iso(-11 * minute), state: 'investigating' },
      { id: 'er2', fingerprint: 'smtp.timeout', title: 'SMTP provider response exceeded timeout', surface: 'Mail delivery', severity: 'error', events: 9, affectedOrgs: 5, firstSeenAt: iso(-8 * hour), lastSeenAt: iso(-26 * minute), state: 'open' },
      { id: 'er3', fingerprint: 'auth.token.expired', title: 'Expired verification token submitted', surface: 'Authentication', severity: 'warning', events: 42, affectedOrgs: 12, firstSeenAt: iso(-4 * day), lastSeenAt: iso(-44 * minute), state: 'open' },
      { id: 'er4', fingerprint: 'renderer.invalid.color', title: 'Unsupported colour normalized during render', surface: 'Renderer', severity: 'warning', events: 7, affectedOrgs: 2, firstSeenAt: iso(-3 * day), lastSeenAt: iso(-7 * hour), state: 'resolved' },
    ],
    releases: [
      { id: 'r1', version: '2026.08.20.2', environment: 'production', state: 'deployed', commit: 'a72d91f', owner: 'platform@voldi.net', createdAt: iso(-3 * hour), checks: [{ label: 'Web tests', passed: true }, { label: 'Renderer tests', passed: true }, { label: 'Database migration', passed: true }, { label: 'Smoke checks', passed: true }] },
      { id: 'r2', version: '2026.08.20.3-rc', environment: 'staging', state: 'rolling_out', commit: 'cd42e80', owner: 'platform@voldi.net', createdAt: iso(-35 * minute), checks: [{ label: 'Web tests', passed: true }, { label: 'Renderer tests', passed: true }, { label: 'Database migration', passed: true }, { label: 'Smoke checks', passed: false }] },
      { id: 'r3', version: '2026.08.18.1', environment: 'production', state: 'deployed', commit: '8f32b1a', owner: 'release@voldi.net', createdAt: iso(-2 * day), checks: [{ label: 'Web tests', passed: true }, { label: 'Renderer tests', passed: true }, { label: 'Database migration', passed: true }, { label: 'Smoke checks', passed: true }] },
      { id: 'r4', version: '2026.08.16.2', environment: 'production', state: 'rolled_back', commit: '3ac028e', owner: 'release@voldi.net', createdAt: iso(-4 * day), checks: [{ label: 'Web tests', passed: true }, { label: 'Renderer tests', passed: true }, { label: 'Database migration', passed: true }, { label: 'Smoke checks', passed: false }] },
      { id: 'r5', version: '2026.08.22.1', environment: 'production', state: 'planned', commit: 'f91d6bc', owner: 'platform@voldi.net', createdAt: iso(2 * day), checks: [{ label: 'Web tests', passed: true }, { label: 'Renderer tests', passed: false }, { label: 'Database migration', passed: false }, { label: 'Smoke checks', passed: false }] },
    ],
    flags: [
      { id: 'f1', key: 'builder.export_v2', label: 'Export pipeline v2', description: 'Routes team exports through the new resumable worker.', owner: 'Platform', state: 'testing', rollout: 25, environments: ['staging', 'production'], updatedAt: iso(-2 * hour) },
      { id: 'f2', key: 'builder.smart_defaults', label: 'Smart builder defaults', description: 'Applies brand-aware defaults when a signature is first created.', owner: 'Product', state: 'on', rollout: 100, environments: ['production', 'staging'], updatedAt: iso(-2 * day) },
      { id: 'f3', key: 'admin.case_inbox', label: 'Support case inbox', description: 'Enables the durable support-case workbench after its source is connected.', owner: 'Support', state: 'off', rollout: 0, environments: ['development'], updatedAt: iso(-5 * day) },
      { id: 'f4', key: 'mail.provider_failover', label: 'Mail provider failover', description: 'Retries transactional mail with a secondary delivery provider.', owner: 'Platform', state: 'testing', rollout: 10, environments: ['staging'], updatedAt: iso(-6 * hour) },
      { id: 'f5', key: 'pricing.annual_2027', label: '2027 annual pricing', description: 'Prepares the next grandfathered annual pricing version.', owner: 'Revenue', state: 'off', rollout: 0, environments: ['development', 'staging'], updatedAt: iso(-7 * day) },
      { id: 'f6', key: 'security.four_eyes', label: 'Four-eyes approvals', description: 'Requires a second staff reviewer for sensitive platform controls.', owner: 'Security', state: 'on', rollout: 100, environments: ['production', 'staging'], updatedAt: iso(-1 * day) },
    ],
  },
};

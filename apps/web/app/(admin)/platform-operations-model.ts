import type { ProductAnalyticsSnapshot } from './product-analytics-model';

export type PlatformTone = 'success' | 'primary' | 'info' | 'warning' | 'danger' | 'secondary';
export type ServiceState = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface PlatformServiceRow {
  id: string;
  name: string;
  group: string;
  state: ServiceState;
  latencyMs: number | null;
  uptime: number | null;
  checkedAt: string | null;
}

export interface MailDeliveryRow {
  id: string;
  kind: 'verification' | 'invitation' | 'notification' | 'support';
  provider: string;
  recipientDomain: string;
  state: 'delivered' | 'deferred' | 'bounced' | 'failed';
  attempts: number;
  createdAt: string;
}

export interface ExportRunRow {
  id: string;
  orgName: string;
  format: 'zip' | 'htm' | 'clipboard';
  state: 'complete' | 'running' | 'failed';
  files: number;
  durationMs: number | null;
  createdAt: string;
}

export interface JobRow {
  id: string;
  name: string;
  queue: string;
  state: 'queued' | 'running' | 'complete' | 'failed' | 'retrying';
  attempts: number;
  durationMs: number | null;
  scheduledAt: string;
  startedAt: string | null;
}

export interface ErrorGroupRow {
  id: string;
  fingerprint: string;
  title: string;
  surface: string;
  severity: 'critical' | 'error' | 'warning';
  events: number;
  affectedOrgs: number;
  firstSeenAt: string;
  lastSeenAt: string;
  state: 'open' | 'investigating' | 'resolved';
}

export interface ReleaseRow {
  id: string;
  version: string;
  environment: 'production' | 'staging';
  state: 'deployed' | 'rolling_out' | 'rolled_back' | 'planned';
  commit: string;
  owner: string;
  createdAt: string;
  checks: Array<{ label: string; passed: boolean }>;
}

export interface FeatureFlagRow {
  id: string;
  key: string;
  label: string;
  description: string;
  owner: string;
  state: 'on' | 'off' | 'testing';
  rollout: number;
  environments: Array<'production' | 'staging' | 'development'>;
  updatedAt: string;
}

export interface PlatformTelemetrySnapshot {
  services: PlatformServiceRow[];
  mail: MailDeliveryRow[];
  exports: ExportRunRow[];
  jobs: JobRow[];
  errors: ErrorGroupRow[];
  releases: ReleaseRow[];
  flags: FeatureFlagRow[];
}

export interface PlatformOperationsSnapshot {
  product: ProductAnalyticsSnapshot;
  telemetry: PlatformTelemetrySnapshot;
}

export const EMPTY_PLATFORM_TELEMETRY: PlatformTelemetrySnapshot = {
  services: [],
  mail: [],
  exports: [],
  jobs: [],
  errors: [],
  releases: [],
  flags: [],
};

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export function platformFacts(source: PlatformOperationsSnapshot) {
  const known = source.telemetry.services.filter((row) => row.state !== 'unknown');
  const latencies = known.flatMap((row) => row.latencyMs === null ? [] : [row.latencyMs]);
  const latestRelease = [...source.telemetry.releases]
    .filter((row) => row.environment === 'production' && row.state === 'deployed')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  return {
    services: source.telemetry.services.length,
    operational: known.filter((row) => row.state === 'operational').length,
    degraded: known.filter((row) => row.state === 'degraded').length,
    outage: known.filter((row) => row.state === 'outage').length,
    averageLatency: average(latencies),
    latestRelease,
    activeSenders: source.product.senders.filter((row) => row.publishedAt && !row.deactivatedAt).length,
    recordedEvents: source.product.events.length,
  };
}

export function mailFacts(rows: MailDeliveryRow[]) {
  const delivered = rows.filter((row) => row.state === 'delivered').length;
  const failed = rows.filter((row) => row.state === 'failed' || row.state === 'bounced').length;
  return {
    total: rows.length,
    delivered,
    deferred: rows.filter((row) => row.state === 'deferred').length,
    failed,
    deliveryRate: rows.length ? Math.round((delivered / rows.length) * 100) : 0,
  };
}

export function exportFacts(source: PlatformOperationsSnapshot) {
  const rows = source.telemetry.exports;
  const completed = rows.filter((row) => row.state === 'complete');
  const evidence = source.product.events.filter((row) => row.type === 'export.zip');
  return {
    total: rows.length,
    completed: completed.length,
    running: rows.filter((row) => row.state === 'running').length,
    failed: rows.filter((row) => row.state === 'failed').length,
    files: completed.reduce((sum, row) => sum + row.files, 0),
    averageDuration: average(completed.flatMap((row) => row.durationMs === null ? [] : [row.durationMs])),
    evidenceEvents: evidence.length,
    evidenceFiles: evidence.reduce((sum, row) => sum + row.fileCount, 0),
  };
}

export function jobFacts(rows: JobRow[]) {
  return {
    total: rows.length,
    active: rows.filter((row) => row.state === 'running' || row.state === 'queued' || row.state === 'retrying').length,
    failed: rows.filter((row) => row.state === 'failed').length,
    completed: rows.filter((row) => row.state === 'complete').length,
    retries: rows.filter((row) => row.attempts > 1).length,
  };
}

export function errorFacts(rows: ErrorGroupRow[]) {
  return {
    groups: rows.length,
    open: rows.filter((row) => row.state !== 'resolved').length,
    critical: rows.filter((row) => row.severity === 'critical' && row.state !== 'resolved').length,
    events: rows.reduce((sum, row) => sum + row.events, 0),
    affectedOrgs: new Set(rows.filter((row) => row.state !== 'resolved').map((row) => row.affectedOrgs)).size
      ? rows.filter((row) => row.state !== 'resolved').reduce((sum, row) => sum + row.affectedOrgs, 0)
      : 0,
  };
}

export function releaseFacts(rows: ReleaseRow[]) {
  const sorted = [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    total: rows.length,
    production: rows.filter((row) => row.environment === 'production' && row.state === 'deployed').length,
    planned: rows.filter((row) => row.state === 'planned' || row.state === 'rolling_out').length,
    rolledBack: rows.filter((row) => row.state === 'rolled_back').length,
    latest: sorted[0] ?? null,
  };
}

export function flagFacts(rows: FeatureFlagRow[]) {
  return {
    total: rows.length,
    on: rows.filter((row) => row.state === 'on').length,
    testing: rows.filter((row) => row.state === 'testing').length,
    off: rows.filter((row) => row.state === 'off').length,
    production: rows.filter((row) => row.environments.includes('production')).length,
  };
}

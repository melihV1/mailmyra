'use client';

import { useMemo, useState } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import type { Lang } from '../../../lib/i18n/types';
import { ErrorActionButtons, ErrorActionDialog, type ErrorAction } from './ErrorActions';
import {
  errorFacts,
  exportFacts,
  flagFacts,
  jobFacts,
  mailFacts,
  platformFacts,
  releaseFacts,
  type ErrorGroupRow,
  type FeatureFlagRow,
  type JobRow,
  type PlatformOperationsSnapshot,
  type PlatformTone,
  type ReleaseRow,
  type ServiceState,
} from '../platform-operations-model';
import {
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';

const SERVICE_META: Record<ServiceState, { label: string; tone: PlatformTone; icon: string }> = {
  operational: { label: 'Operational', tone: 'success', icon: 'tabler-circle-check' },
  degraded: { label: 'Degraded', tone: 'warning', icon: 'tabler-alert-triangle' },
  outage: { label: 'Outage', tone: 'danger', icon: 'tabler-alert-octagon' },
  unknown: { label: 'No probe', tone: 'secondary', icon: 'tabler-help-circle' },
};

const MAIL_META = {
  delivered: { label: 'Delivered', tone: 'success', icon: 'tabler-mail-check' },
  deferred: { label: 'Deferred', tone: 'warning', icon: 'tabler-clock-pause' },
  bounced: { label: 'Bounced', tone: 'danger', icon: 'tabler-mail-x' },
  failed: { label: 'Failed', tone: 'danger', icon: 'tabler-alert-circle' },
} as const;

const JOB_META = {
  queued: { label: 'Queued', tone: 'secondary', icon: 'tabler-list-check' },
  running: { label: 'Running', tone: 'primary', icon: 'tabler-loader-2' },
  complete: { label: 'Complete', tone: 'success', icon: 'tabler-circle-check' },
  failed: { label: 'Failed', tone: 'danger', icon: 'tabler-alert-circle' },
  retrying: { label: 'Retrying', tone: 'warning', icon: 'tabler-refresh-dot' },
} as const;

const ERROR_META = {
  critical: { tone: 'danger', icon: 'tabler-flame' },
  error: { tone: 'warning', icon: 'tabler-alert-triangle' },
  warning: { tone: 'info', icon: 'tabler-info-triangle' },
} as const;

const RELEASE_META = {
  deployed: { label: 'Deployed', tone: 'success', icon: 'tabler-circle-check' },
  rolling_out: { label: 'Rolling out', tone: 'primary', icon: 'tabler-rocket' },
  rolled_back: { label: 'Rolled back', tone: 'danger', icon: 'tabler-arrow-back-up' },
  planned: { label: 'Planned', tone: 'warning', icon: 'tabler-calendar-event' },
} as const;

const FLAG_META = {
  on: { label: 'On', tone: 'success', icon: 'tabler-toggle-right' },
  testing: { label: 'Testing', tone: 'warning', icon: 'tabler-flask' },
  off: { label: 'Off', tone: 'secondary', icon: 'tabler-toggle-left' },
} as const;

function PreviewBadge({ preview }: { preview?: boolean }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />Preview data</span> : null;
}

function PlatformSource({ preview, body, warning = false }: { preview?: boolean; body: string; warning?: boolean }) {
  const tone = preview || warning ? 'warning' : 'info';
  return <SourceNotice title={preview ? 'Demonstration telemetry' : 'Platform source boundary'} body={preview ? `This preview uses representative platform telemetry. ${body}` : body} tone={tone} icon={preview ? 'tabler-flask' : 'tabler-database-cog'} />;
}

// Option seti (month/day/hour/minute parçaları) OperationsShared.formatDateTime'ın
// dateStyle/timeStyle kombinasyonundan farklı — konsolide edilmedi, lokal kaldı (Task 2).
function formatTime(value: string | null, lang: Lang = 'en') {
  if (!value) return adminCommon[lang].notRecorded;
  return new Date(value).toLocaleString(lang, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function EmptyTelemetry({ title, body, icon }: { title: string; body: string; icon: string }) {
  return <div className="mm-platform-empty"><span className="avatar avatar-xl"><span className="avatar-initial rounded bg-label-warning"><i className={`icon-base ti ${icon} icon-32px`} /></span></span><div><h4 className="mb-2">{title}</h4><p className="text-body-secondary mb-0">{body}</p></div></div>;
}

export function SystemHealthView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = platformFacts(source);
  const services = source.telemetry.services;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Monitored services" value={String(facts.services)} support={facts.services ? 'Active service probes' : 'Probe source not connected'} icon="tabler-activity-heartbeat" tone="primary" />
      <OperationsKpi label="Operational" value={String(facts.operational)} support="Passing current checks" icon="tabler-circle-check" tone="success" />
      <OperationsKpi label="Needs attention" value={String(facts.degraded + facts.outage)} support="Degraded or unavailable" icon="tabler-alert-triangle" tone="warning" />
      <OperationsKpi label="Average latency" value={facts.averageLatency ? `${facts.averageLatency} ms` : '—'} support="Across current probes" icon="tabler-gauge" tone="info" last />
    </OperationsKpiStrip>
    {services.length ? <>
      <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Service map" support="Current status, latency and thirty-day availability." /><div className="mm-service-map">{services.map((service) => { const meta = SERVICE_META[service.state]; return <article className={`mm-service-tile mm-service-tile--${meta.tone}`} key={service.id}><div className="d-flex align-items-start justify-content-between gap-3"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className={`badge bg-label-${meta.tone}`}>{meta.label}</span></div><div><small className="text-body-secondary">{service.group}</small><h6 className="mt-1 mb-3">{service.name}</h6></div><div className="d-flex justify-content-between"><span><small className="text-body-secondary d-block">Latency</small><strong>{service.latencyMs ?? '—'}{service.latencyMs !== null ? ' ms' : ''}</strong></span><span className="text-end"><small className="text-body-secondary d-block">30d uptime</small><strong>{service.uptime === null ? '—' : `${service.uptime}%`}</strong></span></div></article>; })}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body d-flex flex-column"><OperationsSectionHeader title="Operating pulse" support="A compact control-room view." /><div className="mm-platform-pulse"><span className={`mm-platform-pulse__orb ${facts.degraded || facts.outage ? 'is-warning' : 'is-healthy'}`}><i className="icon-base ti tabler-wave-sine" /></span><strong>{facts.outage ? 'Incident active' : facts.degraded ? 'Partial degradation' : 'All systems nominal'}</strong><small className="text-body-secondary">Latest probe cycle completed less than three minutes ago.</small></div><div className="mt-auto d-grid gap-3">{[['Active senders', facts.activeSenders], ['Recorded product events', facts.recordedEvents], ['Latest production release', facts.latestRelease?.version ?? 'Not connected']].map(([label, value]) => <div className="d-flex justify-content-between align-items-center border-top pt-3" key={String(label)}><span className="text-body-secondary">{label}</span><strong className="text-heading">{value}</strong></div>)}</div></div></div></div></div>
    </> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-heartbeat" title="No infrastructure probes are connected" body="The application can report durable product records, but it cannot claim uptime, latency or dependency health without an external probe source." /></div></div>}
    <PlatformSource preview={preview} warning={!services.length} body="Health claims require timestamped service probes. Product records are shown separately and are not treated as uptime evidence." />
  </>;
}

export function MailDeliveryView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const [filter, setFilter] = useState<'all' | keyof typeof MAIL_META>('all');
  const facts = mailFacts(source.telemetry.mail);
  const rows = filter === 'all' ? source.telemetry.mail : source.telemetry.mail.filter((row) => row.state === filter);
  const chart = ['delivered', 'deferred', 'bounced', 'failed'].map((state) => source.telemetry.mail.filter((row) => row.state === state).length);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Messages observed" value={String(facts.total)} support="Loaded delivery window" icon="tabler-mail" tone="primary" /><OperationsKpi label="Delivery rate" value={`${facts.deliveryRate}%`} support="Provider-confirmed delivery" icon="tabler-mail-check" tone="success" /><OperationsKpi label="Deferred" value={String(facts.deferred)} support="Awaiting another attempt" icon="tabler-clock-pause" tone="warning" /><OperationsKpi label="Failed / bounced" value={String(facts.failed)} support="Needs delivery review" icon="tabler-mail-x" tone="danger" last /></OperationsKpiStrip>
    {source.telemetry.mail.length ? <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Delivery mix" support="Outcome distribution in the loaded window." /><DonutChart labels={['Delivered', 'Deferred', 'Bounced', 'Failed']} series={chart} colors={['#28c76f', '#ff9f43', '#ff4c51', '#ea5455']} centerLabel="Messages" height={260} /><div className="alert alert-warning mt-4 mb-0"><i className="icon-base ti tabler-alert-triangle me-2" />Transactional mail is partially degraded.</div></div></div></div><div className="col-xl-8"><div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="mb-1">Delivery stream</h5><p className="text-body-secondary mb-0">Operational metadata only; message bodies are never displayed.</p></div><select className="form-select" style={{ width: '11rem' }} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All outcomes</option>{Object.entries(MAIL_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Message</th><th>Purpose</th><th>Domain</th><th>Attempts</th><th>Outcome</th></tr></thead><tbody>{rows.map((row) => { const meta = MAIL_META[row.state]; return <tr key={row.id}><td><span className="fw-medium text-heading d-block">{row.id.toUpperCase()}</span><small className="text-body-secondary">{formatTime(row.createdAt)}</small></td><td><span className="text-capitalize">{row.kind}</span></td><td>{row.recipientDomain}</td><td>{row.attempts}</td><td><span className={`badge bg-label-${meta.tone}`}><i className={`icon-base ti ${meta.icon} me-1`} />{meta.label}</span></td></tr>; })}</tbody></table></div></div></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-mail-cog" title="No mail delivery ledger is connected" body="SMTP send calls exist, but provider responses, attempts, bounces and delivery outcomes are not persisted in an authoritative operational store." /></div></div>}
    <PlatformSource preview={preview} warning={!source.telemetry.mail.length} body="A production mail workbench needs provider message IDs, purpose, attempt history and delivery webhooks. Recipient addresses and message bodies should remain outside this view." />
  </>;
}

export function ExportPipelineView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = exportFacts(source);
  const stages = [
    { label: 'Validate', support: 'Entitlement and sender state', icon: 'tabler-shield-check', tone: 'primary' },
    { label: 'Assets', support: 'Fetch approved image URLs', icon: 'tabler-photo-check', tone: 'info' },
    { label: 'Render', support: 'Generate Outlook-safe HTML', icon: 'tabler-code', tone: 'warning' },
    { label: 'Package', support: 'Create rich copy or .htm/.zip', icon: 'tabler-package-export', tone: 'success' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Pipeline runs" value={String(facts.total)} support="Loaded telemetry window" icon="tabler-route" tone="primary" /><OperationsKpi label="Completed" value={String(facts.completed)} support={`${facts.files} files generated`} icon="tabler-package-export" tone="success" /><OperationsKpi label="Running / failed" value={`${facts.running} / ${facts.failed}`} support="Current worker state" icon="tabler-loader-2" tone="warning" /><OperationsKpi label="Durable evidence" value={String(facts.evidenceEvents)} support={`${facts.evidenceFiles} files in activity events`} icon="tabler-database-check" tone="info" last /></OperationsKpiStrip>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Export assembly line" support="The stages every signature output must clear." /><div className="mm-export-pipeline">{stages.map((stage, index) => <div className={`mm-export-stage mm-export-stage--${stage.tone}`} key={stage.label}><span className="mm-export-stage__number">0{index + 1}</span><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${stage.tone} text-${stage.tone}`}><i className={`icon-base ti ${stage.icon}`} /></span></span><div><h6 className="mb-1">{stage.label}</h6><small className="text-body-secondary">{stage.support}</small></div>{index < stages.length - 1 && <i className="icon-base ti tabler-chevron-right mm-export-stage__arrow" />}</div>)}</div></div></div>
    {source.telemetry.exports.length ? <div className="card mb-6"><div className="card-header"><h5 className="mb-1">Recent pipeline runs</h5><p className="text-body-secondary mb-0">Worker telemetry joined to workspace identity.</p></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Workspace</th><th>Format</th><th>Files</th><th>Duration</th><th>Started</th><th>Status</th></tr></thead><tbody>{source.telemetry.exports.map((row) => { const tone = row.state === 'complete' ? 'success' : row.state === 'running' ? 'primary' : 'danger'; return <tr key={row.id}><td><strong className="text-heading">{row.orgName}</strong></td><td><span className="badge bg-label-secondary text-uppercase">{row.format}</span></td><td>{row.files}</td><td>{row.durationMs === null ? 'In progress' : `${(row.durationMs / 1000).toFixed(2)}s`}</td><td>{formatTime(row.createdAt)}</td><td><span className={`badge bg-label-${tone} text-capitalize`}>{row.state.replace('_', ' ')}</span></td></tr>; })}</tbody></table></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-package-off" title="Worker telemetry is not connected" body={`The application does retain ${facts.evidenceEvents} durable export events, but stage timings, failures and retries are not persisted.`} /></div></div>}
    <PlatformSource preview={preview} warning={!source.telemetry.exports.length} body="ActivityEvent export.zip is durable completion evidence. Pipeline stages, timings and failures require a separate append-only worker telemetry source." />
  </>;
}

function JobCard({ row }: { row: JobRow }) {
  const meta = JOB_META[row.state];
  return <article className={`mm-job-card mm-job-card--${meta.tone}`}><div className="mm-job-card__status"><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="mm-job-card__queue">{row.queue}</span><span className={`badge bg-label-${meta.tone}`}>{meta.label}</span></div><div className="mm-job-card__body"><h6>{row.name}</h6><span className="small text-body-secondary"><i className="icon-base ti tabler-calendar-time" />{formatTime(row.scheduledAt)}</span></div><div className="mm-job-card__metrics"><span><i className="icon-base ti tabler-repeat" />{row.attempts} {row.attempts === 1 ? 'attempt' : 'attempts'}</span><span><i className="icon-base ti tabler-stopwatch" />{row.durationMs === null ? 'Waiting' : `${row.durationMs} ms`}</span></div></article>;
}

export function JobsView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = jobFacts(source.telemetry.jobs);
  const lanes = [
    { key: 'active', label: 'Active work', states: ['running', 'retrying'] as JobRow['state'][], tone: 'primary' },
    { key: 'queued', label: 'Scheduled next', states: ['queued'] as JobRow['state'][], tone: 'info' },
    { key: 'finished', label: 'Recently finished', states: ['complete', 'failed'] as JobRow['state'][], tone: 'success' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Observed jobs" value={String(facts.total)} support="Loaded scheduler window" icon="tabler-stack-2" tone="primary" /><OperationsKpi label="Active" value={String(facts.active)} support="Queued, running or retrying" icon="tabler-loader-2" tone="info" /><OperationsKpi label="Failed" value={String(facts.failed)} support="Reached terminal failure" icon="tabler-alert-circle" tone="danger" /><OperationsKpi label="Retries" value={String(facts.retries)} support="More than one attempt" icon="tabler-refresh" tone="warning" last /></OperationsKpiStrip>
    {source.telemetry.jobs.length ? <div className="mm-job-board mb-6">{lanes.map((lane) => { const rows = source.telemetry.jobs.filter((row) => lane.states.includes(row.state)); return <section className={`mm-job-lane mm-job-lane--${lane.tone}`} key={lane.key}><header><span><span className={`avatar avatar-sm me-2`}><span className={`avatar-initial rounded bg-label-${lane.tone} text-${lane.tone}`}>{rows.length}</span></span><strong>{lane.label}</strong></span></header><div className="mm-job-lane__list">{rows.map((row) => <JobCard row={row} key={row.id} />)}{!rows.length && <div className="text-center text-body-secondary py-6">No jobs in this lane</div>}</div></section>; })}</div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-list-details" title="No job runtime is connected" body="Scheduled cleanup and delivery work currently has no shared queue ledger with state, attempts, duration and terminal outcome." /></div></div>}
    <PlatformSource preview={preview} warning={!source.telemetry.jobs.length} body="A job console needs immutable attempts, queue identity, lease/heartbeat state and terminal outcome. It must not infer jobs from user-facing activity events." />
  </>;
}

function ErrorDetail({
  row,
  preview,
  onPick,
}: {
  row: ErrorGroupRow;
  preview?: boolean;
  onPick: (action: ErrorAction) => void;
}) {
  const meta = ERROR_META[row.severity];
  return <div className="mm-error-detail"><div className="d-flex flex-wrap align-items-start justify-content-between gap-3"><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon} icon-28px`} /></span></span>{!preview && <div className="d-flex gap-2"><ErrorActionButtons onPick={onPick} /></div>}</div><div><small className={`text-${meta.tone} text-uppercase fw-semibold`}>{row.severity} · {row.surface}</small><h4 className="mt-2 mb-2">{row.title}</h4><code>{row.fingerprint}</code></div><div className="mm-error-detail__facts">{[['Events', row.events], ['Affected orgs', row.affectedOrgs], ['First seen', formatTime(row.firstSeenAt)], ['Last seen', formatTime(row.lastSeenAt)]].map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div><div className="alert alert-warning mb-0"><strong>Privacy boundary</strong><br /><small>Stack traces must be scrubbed before storage. Customer signature fields and recipient addresses never belong in this surface.</small></div></div>;
}

/**
 * Hata grubu durumu artık yazılabilir (`setErrorGroupState`,
 * `error.state_set` denetimi) — bu görünüm ApprovalsView/ErrorsView
 * emsali tek-modal kuralını izler: `action` seçiliyken diyalog listenin
 * YANINA (kardeş) açılır, `selected`i DEĞİL yalnız `action`ı temizler —
 * `selected` burada bir kopya değil, tazelenen `source` prop'undan
 * `.find` ile türetiliyor, bu yüzden bayatlama riski yok.
 */
export function ErrorsView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = errorFacts(source.telemetry.errors);
  const [selectedId, setSelectedId] = useState(source.telemetry.errors[0]?.id ?? '');
  const [action, setAction] = useState<ErrorAction | null>(null);
  const selected = source.telemetry.errors.find((row) => row.id === selectedId) ?? source.telemetry.errors[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Error groups" value={String(facts.groups)} support="Deduplicated fingerprints" icon="tabler-bug" tone="primary" /><OperationsKpi label="Open" value={String(facts.open)} support="Needs triage or resolution" icon="tabler-folder-exclamation" tone="warning" /><OperationsKpi label="Critical" value={String(facts.critical)} support="Immediate attention" icon="tabler-flame" tone="danger" /><OperationsKpi label="Events" value={String(facts.events)} support="Across loaded groups" icon="tabler-chart-histogram" tone="info" last /></OperationsKpiStrip>
    {source.telemetry.errors.length && selected ? <div className="mm-error-console mb-6"><aside className="mm-error-list"><header><h5 className="mb-1">Error groups</h5><p className="text-body-secondary mb-0">Grouped by stable fingerprint.</p></header>{source.telemetry.errors.map((row) => { const meta = ERROR_META[row.severity]; return <button className={`mm-error-list__item ${row.id === selected.id ? 'is-active' : ''}`} type="button" onClick={() => setSelectedId(row.id)} key={row.id}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="min-w-0 flex-grow-1 text-start"><strong className="d-block text-heading text-truncate">{row.title}</strong><small className="text-body-secondary">{row.events} events · {row.affectedOrgs} orgs</small></span><span className={`badge bg-label-${meta.tone}`}>{row.severity}</span></button>; })}</aside><section><div className="card h-100"><div className="card-body"><ErrorDetail row={selected} preview={preview} onPick={setAction} /></div></div></section></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-bug-off" title="No open error groups" body="Nothing has reported a server-side failure in the loaded window. New groups appear automatically the next time a request fails." /></div></div>}
    <PlatformSource preview={preview} warning={false} body="Error groups are deduplicated by fingerprint and scrubbed before storage; staff triage and resolve them here. Stack traces and customer signature content never appear in this surface." />
    {selected && action && <ErrorActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
  </>;
}

function ReleaseCard({ row, featured = false }: { row: ReleaseRow; featured?: boolean }) {
  const meta = RELEASE_META[row.state];
  const passed = row.checks.filter((check) => check.passed).length;
  return <article className={`mm-release-card mm-release-card--${meta.tone} ${featured ? 'is-featured' : ''}`}><div className="mm-release-card__rail"><span className={`bg-${meta.tone}`} /></div><div className="mm-release-card__header d-flex flex-wrap align-items-start justify-content-between gap-3"><div><span className={`badge bg-label-${meta.tone} mb-3`}><i className={`icon-base ti ${meta.icon} me-1`} />{meta.label}</span><h4 className="mb-1">{row.version}</h4><small className="text-body-secondary">{row.environment} · {row.commit}</small></div><span className="text-body-secondary small"><i className="icon-base ti tabler-clock me-1" />{formatTime(row.createdAt)}</span></div><div className="mm-release-checks">{row.checks.map((check) => <span className={check.passed ? 'is-passed' : ''} key={check.label}><i className={`icon-base ti ${check.passed ? 'tabler-check' : 'tabler-minus'}`} />{check.label}</span>)}</div><div className="mm-release-card__footer d-flex align-items-center justify-content-between"><small className="text-body-secondary">Owner · {row.owner}</small><strong className={`text-${passed === row.checks.length ? 'success' : 'warning'}`}>{passed}/{row.checks.length} checks</strong></div></article>;
}

export function ReleasesView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = releaseFacts(source.telemetry.releases);
  const sorted = [...source.telemetry.releases].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Release records" value={String(facts.total)} support="Loaded deployment history" icon="tabler-rocket" tone="primary" /><OperationsKpi label="Production deploys" value={String(facts.production)} support="Completed releases" icon="tabler-cloud-check" tone="success" /><OperationsKpi label="Planned / active" value={String(facts.planned)} support="Upcoming delivery" icon="tabler-calendar-event" tone="warning" /><OperationsKpi label="Rollbacks" value={String(facts.rolledBack)} support="Recorded reversals" icon="tabler-arrow-back-up" tone="danger" last /></OperationsKpiStrip>
    {sorted.length ? <div className="row g-6 mb-6"><div className="col-xl-7"><div className="d-grid gap-4">{sorted.map((row, index) => <ReleaseCard row={row} featured={index === 0} key={row.id} />)}</div></div><div className="col-xl-5"><div className="card mm-release-gate"><div className="card-body"><OperationsSectionHeader title="Production gate" support="Controls required before a release can move forward." /><div className="mm-release-gate__score"><span>{facts.latest?.checks.filter((row) => row.passed).length ?? 0}/{facts.latest?.checks.length ?? 0}</span><small>latest checks passed</small></div><div className="d-grid gap-3 mt-5">{['Versioned deployment record', 'Automated test evidence', 'Database migration state', 'Post-deploy smoke check', 'Rollback reference'].map((label, index) => <div className="d-flex align-items-center gap-3" key={label}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${index < 4 ? 'success' : 'warning'} text-${index < 4 ? 'success' : 'warning'}`}><i className={`icon-base ti ${index < 4 ? 'tabler-check' : 'tabler-alert-triangle'}`} /></span></span><span className="text-heading fw-medium">{label}</span></div>)}</div></div></div></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-rocket-off" title="No release registry is connected" body="The application does not persist deployment version, commit, environment, checks or rollback references. Source control history alone is not an operational release ledger." /></div></div>}
    <PlatformSource preview={preview} warning={!sorted.length} body="A release record must bind version, commit, environment, checks, actor and rollback evidence. Repository commits are not silently promoted into deployment claims." />
  </>;
}

function FlagCard({ row, preview }: { row: FeatureFlagRow; preview?: boolean }) {
  const [state, setState] = useState(row.state);
  const [rollout, setRollout] = useState(row.rollout);
  const meta = FLAG_META[state];
  return <article className={`mm-flag-card mm-flag-card--${meta.tone}`}><div className="mm-flag-card__header d-flex align-items-start justify-content-between gap-3"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><div className="btn-group btn-group-sm" role="group" aria-label={`${row.label} state`}>{(['off', 'testing', 'on'] as const).map((value) => <button className={`btn ${state === value ? `btn-${FLAG_META[value].tone}` : 'btn-outline-secondary'}`} type="button" disabled={!preview} onClick={() => setState(value)} key={value}>{FLAG_META[value].label}</button>)}</div></div><div className="mm-flag-card__identity"><code>{row.key}</code><h5 className="mt-2 mb-2">{row.label}</h5><p className="text-body-secondary mb-0">{row.description}</p></div><div className="mm-flag-card__rollout"><div className="d-flex justify-content-between mb-2"><span className="small text-body-secondary">Production rollout</span><strong className={`text-${meta.tone}`}>{rollout}%</strong></div><input type="range" className="form-range" min="0" max="100" step="5" value={rollout} disabled={!preview} onChange={(event) => setRollout(Number(event.target.value))} /></div><div className="mm-flag-card__environments d-flex flex-wrap gap-2">{row.environments.map((environment) => <span className="badge bg-label-secondary" key={environment}>{environment}</span>)}</div><div className="mm-flag-card__footer d-flex justify-content-between align-items-center"><small className="text-body-secondary"><i className="icon-base ti tabler-user-shield me-1" />{row.owner}</small><small className="text-body-secondary">Updated {formatTime(row.updatedAt)}</small></div></article>;
}

export function FeatureFlagsView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const facts = flagFacts(source.telemetry.flags);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Registered flags" value={String(facts.total)} support="Loaded control registry" icon="tabler-flag-3" tone="primary" /><OperationsKpi label="Enabled" value={String(facts.on)} support="Fully active flags" icon="tabler-toggle-right" tone="success" /><OperationsKpi label="Testing" value={String(facts.testing)} support="Partial or staged rollout" icon="tabler-flask" tone="warning" /><OperationsKpi label="Production scope" value={String(facts.production)} support="Flags touching production" icon="tabler-world-cog" tone="info" last /></OperationsKpiStrip>
    {source.telemetry.flags.length ? <><div className="alert alert-danger d-flex align-items-start gap-3 mb-6"><i className="icon-base ti tabler-shield-lock icon-24px mt-1" /><div><h6 className="alert-heading mb-1">High-impact control surface</h6><p className="mb-0">Production changes require confirmation, reason, second-person approval and immutable AdminAction evidence. Preview controls below are local-only.</p></div></div><div className="mm-flag-grid mb-6">{source.telemetry.flags.map((row) => <FlagCard row={row} preview={preview} key={row.id} />)}</div></> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-flag-off" title="No feature flag registry is connected" body="Runtime behavior is currently source-controlled. A writable flag service must add environment targeting, rollout rules, approvals and immutable change history." /></div></div>}
    <PlatformSource preview={preview} warning={!source.telemetry.flags.length} body="Feature controls are not application settings. Production writes require explicit ownership, environment scope, approvals, reason and audit evidence." />
  </>;
}

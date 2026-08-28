'use client';

import { useMemo, useState } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminPlatform, type AdminPlatformDict } from '../../../lib/i18n/dict/admin-platform';
import { useLang } from '../../../lib/i18n/LangProvider';
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

/**
 * İkon/ton dil-bağımsız veri (admin-product `TEMPLATE_LOOKS` emsali) —
 * insan-okur etiket `adminPlatform`'un `serviceMeta`/`mailMeta`/`jobMeta`/
 * `releaseMeta`/`flagMeta`'sından gelir, ayrı `*Display()` yardımcılarıyla
 * birleştirilir. Beş durum tipi de KAPALI union olduğu için `Record<string,
 * …>` cast'i hiçbirinde GEREKMEDİ. `ERROR_META` (yalnız ton/ikon, hiç
 * etiket TAŞIMIYOR) bölünmedi — bkz. admin-platform.ts dosya başı notu.
 */
const SERVICE_LOOKS: Record<ServiceState, { tone: PlatformTone; icon: string }> = {
  operational: { tone: 'success', icon: 'tabler-circle-check' },
  degraded: { tone: 'warning', icon: 'tabler-alert-triangle' },
  outage: { tone: 'danger', icon: 'tabler-alert-octagon' },
  unknown: { tone: 'secondary', icon: 'tabler-help-circle' },
};

function serviceDisplay(t: AdminPlatformDict, state: ServiceState) {
  return { label: t.serviceMeta[state], ...SERVICE_LOOKS[state] };
}

type MailState = 'delivered' | 'deferred' | 'bounced' | 'failed';
const MAIL_LOOKS: Record<MailState, { tone: PlatformTone; icon: string }> = {
  delivered: { tone: 'success', icon: 'tabler-mail-check' },
  deferred: { tone: 'warning', icon: 'tabler-clock-pause' },
  bounced: { tone: 'danger', icon: 'tabler-mail-x' },
  failed: { tone: 'danger', icon: 'tabler-alert-circle' },
};

function mailDisplay(t: AdminPlatformDict, state: MailState) {
  return { label: t.mailMeta[state], ...MAIL_LOOKS[state] };
}

type JobState = 'queued' | 'running' | 'complete' | 'failed' | 'retrying';
const JOB_LOOKS: Record<JobState, { tone: PlatformTone; icon: string }> = {
  queued: { tone: 'secondary', icon: 'tabler-list-check' },
  running: { tone: 'primary', icon: 'tabler-loader-2' },
  complete: { tone: 'success', icon: 'tabler-circle-check' },
  failed: { tone: 'danger', icon: 'tabler-alert-circle' },
  retrying: { tone: 'warning', icon: 'tabler-refresh-dot' },
};

function jobDisplay(t: AdminPlatformDict, state: JobState) {
  return { label: t.jobMeta[state], ...JOB_LOOKS[state] };
}

/** Hiç etiket taşımıyor (yalnız ton/ikon) — bölünmedi, dil-bağımsız kaldı. */
const ERROR_META = {
  critical: { tone: 'danger', icon: 'tabler-flame' },
  error: { tone: 'warning', icon: 'tabler-alert-triangle' },
  warning: { tone: 'info', icon: 'tabler-info-triangle' },
} as const;

type ReleaseState = 'deployed' | 'rolling_out' | 'rolled_back' | 'planned';
const RELEASE_LOOKS: Record<ReleaseState, { tone: PlatformTone; icon: string }> = {
  deployed: { tone: 'success', icon: 'tabler-circle-check' },
  rolling_out: { tone: 'primary', icon: 'tabler-rocket' },
  rolled_back: { tone: 'danger', icon: 'tabler-arrow-back-up' },
  planned: { tone: 'warning', icon: 'tabler-calendar-event' },
};

function releaseDisplay(t: AdminPlatformDict, state: ReleaseState) {
  return { label: t.releaseMeta[state], ...RELEASE_LOOKS[state] };
}

type FlagState = 'on' | 'testing' | 'off';
const FLAG_LOOKS: Record<FlagState, { tone: PlatformTone; icon: string }> = {
  on: { tone: 'success', icon: 'tabler-toggle-right' },
  testing: { tone: 'warning', icon: 'tabler-flask' },
  off: { tone: 'secondary', icon: 'tabler-toggle-left' },
};

function flagDisplay(t: AdminPlatformDict, state: FlagState) {
  return { label: t.flagMeta[state], ...FLAG_LOOKS[state] };
}

function PreviewBadge({ preview, t }: { preview?: boolean; t: AdminPlatformDict }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />{t.shared.previewBadge}</span> : null;
}

function PlatformSource({ preview, body, warning = false, t }: { preview?: boolean; body: string; warning?: boolean; t: AdminPlatformDict }) {
  const tone = preview || warning ? 'warning' : 'info';
  return <SourceNotice title={preview ? t.shared.source.demonstrationTitle : t.shared.source.boundaryTitle} body={preview ? `${t.shared.source.previewPrefix}${body}` : body} tone={tone} icon={preview ? 'tabler-flask' : 'tabler-database-cog'} />;
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
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = platformFacts(source);
  const services = source.telemetry.services;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.systemHealth.kpis.monitoredServices.label} value={String(facts.services)} support={facts.services ? t.systemHealth.kpis.monitoredServices.supportActive : t.systemHealth.kpis.monitoredServices.supportDisconnected} icon="tabler-activity-heartbeat" tone="primary" />
      <OperationsKpi label={t.systemHealth.kpis.operational.label} value={String(facts.operational)} support={t.systemHealth.kpis.operational.support} icon="tabler-circle-check" tone="success" />
      <OperationsKpi label={t.systemHealth.kpis.needsAttention.label} value={String(facts.degraded + facts.outage)} support={t.systemHealth.kpis.needsAttention.support} icon="tabler-alert-triangle" tone="warning" />
      <OperationsKpi label={t.systemHealth.kpis.averageLatency.label} value={facts.averageLatency ? t.systemHealth.serviceMap.msValue(facts.averageLatency) : '—'} support={t.systemHealth.kpis.averageLatency.support} icon="tabler-gauge" tone="info" last />
    </OperationsKpiStrip>
    {services.length ? <>
      <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.systemHealth.serviceMap.title} support={t.systemHealth.serviceMap.support} /><div className="mm-service-map">{services.map((service) => { const meta = serviceDisplay(t, service.state); return <article className={`mm-service-tile mm-service-tile--${meta.tone}`} key={service.id}><div className="d-flex align-items-start justify-content-between gap-3"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className={`badge bg-label-${meta.tone}`}>{meta.label}</span></div><div><small className="text-body-secondary">{service.group}</small><h6 className="mt-1 mb-3">{service.name}</h6></div><div className="d-flex justify-content-between"><span><small className="text-body-secondary d-block">{t.systemHealth.serviceMap.latency}</small><strong>{service.latencyMs === null ? '—' : t.systemHealth.serviceMap.msValue(service.latencyMs)}</strong></span><span className="text-end"><small className="text-body-secondary d-block">{t.systemHealth.serviceMap.uptime30d}</small><strong>{service.uptime === null ? '—' : t.systemHealth.serviceMap.pctValue(service.uptime)}</strong></span></div></article>; })}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body d-flex flex-column"><OperationsSectionHeader title={t.systemHealth.pulse.title} support={t.systemHealth.pulse.support} /><div className="mm-platform-pulse"><span className={`mm-platform-pulse__orb ${facts.degraded || facts.outage ? 'is-warning' : 'is-healthy'}`}><i className="icon-base ti tabler-wave-sine" /></span><strong>{facts.outage ? t.systemHealth.pulse.incidentActive : facts.degraded ? t.systemHealth.pulse.partialDegradation : t.systemHealth.pulse.allNominal}</strong><small className="text-body-secondary">{t.systemHealth.pulse.caption}</small></div><div className="mt-auto d-grid gap-3">{[[t.systemHealth.pulse.activeSenders, facts.activeSenders], [t.systemHealth.pulse.recordedEvents, facts.recordedEvents], [t.systemHealth.pulse.latestRelease, facts.latestRelease?.version ?? t.shared.notConnected]].map(([label, value]) => <div className="d-flex justify-content-between align-items-center border-top pt-3" key={String(label)}><span className="text-body-secondary">{label}</span><strong className="text-heading">{value}</strong></div>)}</div></div></div></div></div>
    </> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-heartbeat" title={t.systemHealth.empty.title} body={t.systemHealth.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!services.length} body={t.systemHealth.source} />
  </>;
}

export function MailDeliveryView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminPlatform[lang];
  const [filter, setFilter] = useState<'all' | MailState>('all');
  const facts = mailFacts(source.telemetry.mail);
  const rows = filter === 'all' ? source.telemetry.mail : source.telemetry.mail.filter((row) => row.state === filter);
  const states: MailState[] = ['delivered', 'deferred', 'bounced', 'failed'];
  const chart = states.map((state) => source.telemetry.mail.filter((row) => row.state === state).length);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.mail.kpis.observed.label} value={String(facts.total)} support={t.mail.kpis.observed.support} icon="tabler-mail" tone="primary" /><OperationsKpi label={t.mail.kpis.deliveryRate.label} value={`${facts.deliveryRate}%`} support={t.mail.kpis.deliveryRate.support} icon="tabler-mail-check" tone="success" /><OperationsKpi label={t.mail.kpis.deferred.label} value={String(facts.deferred)} support={t.mail.kpis.deferred.support} icon="tabler-clock-pause" tone="warning" /><OperationsKpi label={t.mail.kpis.failedBounced.label} value={String(facts.failed)} support={t.mail.kpis.failedBounced.support} icon="tabler-mail-x" tone="danger" last /></OperationsKpiStrip>
    {source.telemetry.mail.length ? <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.mail.mix.title} support={t.mail.mix.support} /><DonutChart labels={states.map((state) => t.mailMeta[state])} series={chart} colors={['#28c76f', '#ff9f43', '#ff4c51', '#ea5455']} centerLabel={t.mail.mix.centerLabel} height={260} /><div className="alert alert-warning mt-4 mb-0"><i className="icon-base ti tabler-alert-triangle me-2" />{t.mail.degradedAlert}</div></div></div></div><div className="col-xl-8"><div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="mb-1">{t.mail.stream.title}</h5><p className="text-body-secondary mb-0">{t.mail.stream.support}</p></div><select className="form-select" style={{ width: '11rem' }} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">{t.mail.stream.allOutcomes}</option>{Object.entries(t.mailMeta).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{t.mail.table.headers.message}</th><th>{t.mail.table.headers.purpose}</th><th>{t.mail.table.headers.domain}</th><th>{t.mail.table.headers.attempts}</th><th>{t.mail.table.headers.outcome}</th></tr></thead><tbody>{rows.map((row) => { const meta = mailDisplay(t, row.state); return <tr key={row.id}><td><span className="fw-medium text-heading d-block">{row.id.toUpperCase()}</span><small className="text-body-secondary">{formatTime(row.createdAt, lang)}</small></td><td><span className="text-capitalize">{row.kind}</span></td><td>{row.recipientDomain}</td><td>{row.attempts}</td><td><span className={`badge bg-label-${meta.tone}`}><i className={`icon-base ti ${meta.icon} me-1`} />{meta.label}</span></td></tr>; })}</tbody></table></div></div></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-mail-cog" title={t.mail.empty.title} body={t.mail.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!source.telemetry.mail.length} body={t.mail.source} />
  </>;
}

export function ExportPipelineView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = exportFacts(source);
  const stages = [
    { ...t.exportPipeline.stages.validate, icon: 'tabler-shield-check', tone: 'primary' },
    { ...t.exportPipeline.stages.assets, icon: 'tabler-photo-check', tone: 'info' },
    { ...t.exportPipeline.stages.render, icon: 'tabler-code', tone: 'warning' },
    { ...t.exportPipeline.stages.pkg, icon: 'tabler-package-export', tone: 'success' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.exportPipeline.kpis.runs.label} value={String(facts.total)} support={t.exportPipeline.kpis.runs.support} icon="tabler-route" tone="primary" /><OperationsKpi label={t.exportPipeline.kpis.completed.label} value={String(facts.completed)} support={t.exportPipeline.kpis.completed.support(facts.files)} icon="tabler-package-export" tone="success" /><OperationsKpi label={t.exportPipeline.kpis.runningFailed.label} value={`${facts.running} / ${facts.failed}`} support={t.exportPipeline.kpis.runningFailed.support} icon="tabler-loader-2" tone="warning" /><OperationsKpi label={t.exportPipeline.kpis.durableEvidence.label} value={String(facts.evidenceEvents)} support={t.exportPipeline.kpis.durableEvidence.support(facts.evidenceFiles)} icon="tabler-database-check" tone="info" last /></OperationsKpiStrip>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.exportPipeline.stages.title} support={t.exportPipeline.stages.support} /><div className="mm-export-pipeline">{stages.map((stage, index) => <div className={`mm-export-stage mm-export-stage--${stage.tone}`} key={stage.label}><span className="mm-export-stage__number">0{index + 1}</span><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${stage.tone} text-${stage.tone}`}><i className={`icon-base ti ${stage.icon}`} /></span></span><div><h6 className="mb-1">{stage.label}</h6><small className="text-body-secondary">{stage.support}</small></div>{index < stages.length - 1 && <i className="icon-base ti tabler-chevron-right mm-export-stage__arrow" />}</div>)}</div></div></div>
    {source.telemetry.exports.length ? <div className="card mb-6"><div className="card-header"><h5 className="mb-1">{t.exportPipeline.recent.title}</h5><p className="text-body-secondary mb-0">{t.exportPipeline.recent.support}</p></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{t.exportPipeline.table.headers.workspace}</th><th>{t.exportPipeline.table.headers.format}</th><th>{t.exportPipeline.table.headers.files}</th><th>{t.exportPipeline.table.headers.duration}</th><th>{t.exportPipeline.table.headers.started}</th><th>{t.exportPipeline.table.headers.status}</th></tr></thead><tbody>{source.telemetry.exports.map((row) => { const tone = row.state === 'complete' ? 'success' : row.state === 'running' ? 'primary' : 'danger'; return <tr key={row.id}><td><strong className="text-heading">{row.orgName}</strong></td><td><span className="badge bg-label-secondary text-uppercase">{row.format}</span></td><td>{row.files}</td><td>{row.durationMs === null ? t.exportPipeline.table.inProgress : t.exportPipeline.table.durationSeconds((row.durationMs / 1000).toFixed(2))}</td><td>{formatTime(row.createdAt, lang)}</td><td><span className={`badge bg-label-${tone} text-capitalize`}>{row.state.replace('_', ' ')}</span></td></tr>; })}</tbody></table></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-package-off" title={t.exportPipeline.empty.title} body={t.exportPipeline.empty.body(facts.evidenceEvents)} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!source.telemetry.exports.length} body={t.exportPipeline.source} />
  </>;
}

function JobCard({ row, t, lang }: { row: JobRow; t: AdminPlatformDict; lang: Lang }) {
  const meta = jobDisplay(t, row.state);
  return <article className={`mm-job-card mm-job-card--${meta.tone}`}><div className="mm-job-card__status"><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="mm-job-card__queue">{row.queue}</span><span className={`badge bg-label-${meta.tone}`}>{meta.label}</span></div><div className="mm-job-card__body"><h6>{row.name}</h6><span className="small text-body-secondary"><i className="icon-base ti tabler-calendar-time" />{formatTime(row.scheduledAt, lang)}</span></div><div className="mm-job-card__metrics"><span><i className="icon-base ti tabler-repeat" />{t.jobs.card.attempts(row.attempts)}</span><span><i className="icon-base ti tabler-stopwatch" />{row.durationMs === null ? t.jobs.card.waiting : t.jobs.card.durationMs(row.durationMs)}</span></div></article>;
}

export function JobsView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = jobFacts(source.telemetry.jobs);
  const lanes = [
    { key: 'active', label: t.jobs.lanes.active, states: ['running', 'retrying'] as JobRow['state'][], tone: 'primary' },
    { key: 'queued', label: t.jobs.lanes.queued, states: ['queued'] as JobRow['state'][], tone: 'info' },
    { key: 'finished', label: t.jobs.lanes.finished, states: ['complete', 'failed'] as JobRow['state'][], tone: 'success' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.jobs.kpis.observed.label} value={String(facts.total)} support={t.jobs.kpis.observed.support} icon="tabler-stack-2" tone="primary" /><OperationsKpi label={t.jobs.kpis.active.label} value={String(facts.active)} support={t.jobs.kpis.active.support} icon="tabler-loader-2" tone="info" /><OperationsKpi label={t.jobs.kpis.failed.label} value={String(facts.failed)} support={t.jobs.kpis.failed.support} icon="tabler-alert-circle" tone="danger" /><OperationsKpi label={t.jobs.kpis.retries.label} value={String(facts.retries)} support={t.jobs.kpis.retries.support} icon="tabler-refresh" tone="warning" last /></OperationsKpiStrip>
    {source.telemetry.jobs.length ? <div className="mm-job-board mb-6">{lanes.map((lane) => { const rows = source.telemetry.jobs.filter((row) => lane.states.includes(row.state)); return <section className={`mm-job-lane mm-job-lane--${lane.tone}`} key={lane.key}><header><span><span className={`avatar avatar-sm me-2`}><span className={`avatar-initial rounded bg-label-${lane.tone} text-${lane.tone}`}>{rows.length}</span></span><strong>{lane.label}</strong></span></header><div className="mm-job-lane__list">{rows.map((row) => <JobCard row={row} t={t} lang={lang} key={row.id} />)}{!rows.length && <div className="text-center text-body-secondary py-6">{t.jobs.emptyLane}</div>}</div></section>; })}</div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-list-details" title={t.jobs.empty.title} body={t.jobs.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!source.telemetry.jobs.length} body={t.jobs.source} />
  </>;
}

function ErrorDetail({
  row,
  preview,
  onPick,
  t,
  lang,
}: {
  row: ErrorGroupRow;
  preview?: boolean;
  onPick: (action: ErrorAction) => void;
  t: AdminPlatformDict;
  lang: Lang;
}) {
  const meta = ERROR_META[row.severity];
  return <div className="mm-error-detail"><div className="d-flex flex-wrap align-items-start justify-content-between gap-3"><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon} icon-28px`} /></span></span>{!preview && <div className="d-flex gap-2"><ErrorActionButtons onPick={onPick} /></div>}</div><div><small className={`text-${meta.tone} text-uppercase fw-semibold`}>{row.severity} · {row.surface}</small><h4 className="mt-2 mb-2">{row.title}</h4><code>{row.fingerprint}</code></div><div className="mm-error-detail__facts">{[[t.errors.detailFacts.events, row.events], [t.errors.detailFacts.affectedOrgs, row.affectedOrgs], [t.errors.detailFacts.firstSeen, formatTime(row.firstSeenAt, lang)], [t.errors.detailFacts.lastSeen, formatTime(row.lastSeenAt, lang)]].map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div><div className="alert alert-warning mb-0"><strong>{t.errors.privacyBoundary.title}</strong><br /><small>{t.errors.privacyBoundary.body}</small></div></div>;
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
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = errorFacts(source.telemetry.errors);
  const [selectedId, setSelectedId] = useState(source.telemetry.errors[0]?.id ?? '');
  const [action, setAction] = useState<ErrorAction | null>(null);
  const selected = source.telemetry.errors.find((row) => row.id === selectedId) ?? source.telemetry.errors[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.errors.kpis.groups.label} value={String(facts.groups)} support={t.errors.kpis.groups.support} icon="tabler-bug" tone="primary" /><OperationsKpi label={t.errors.kpis.open.label} value={String(facts.open)} support={t.errors.kpis.open.support} icon="tabler-folder-exclamation" tone="warning" /><OperationsKpi label={t.errors.kpis.critical.label} value={String(facts.critical)} support={t.errors.kpis.critical.support} icon="tabler-flame" tone="danger" /><OperationsKpi label={t.errors.kpis.events.label} value={String(facts.events)} support={t.errors.kpis.events.support} icon="tabler-chart-histogram" tone="info" last /></OperationsKpiStrip>
    {source.telemetry.errors.length && selected ? <div className="mm-error-console mb-6"><aside className="mm-error-list"><header><h5 className="mb-1">{t.errors.list.title}</h5><p className="text-body-secondary mb-0">{t.errors.list.support}</p></header>{source.telemetry.errors.map((row) => { const meta = ERROR_META[row.severity]; return <button className={`mm-error-list__item ${row.id === selected.id ? 'is-active' : ''}`} type="button" onClick={() => setSelectedId(row.id)} key={row.id}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="min-w-0 flex-grow-1 text-start"><strong className="d-block text-heading text-truncate">{row.title}</strong><small className="text-body-secondary">{t.errors.list.itemSupport(row.events, row.affectedOrgs)}</small></span><span className={`badge bg-label-${meta.tone}`}>{row.severity}</span></button>; })}</aside><section><div className="card h-100"><div className="card-body"><ErrorDetail row={selected} preview={preview} onPick={setAction} t={t} lang={lang} /></div></div></section></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-bug-off" title={t.errors.empty.title} body={t.errors.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={false} body={t.errors.source} />
    {selected && action && <ErrorActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
  </>;
}

function ReleaseCard({ row, t, lang, featured = false }: { row: ReleaseRow; t: AdminPlatformDict; lang: Lang; featured?: boolean }) {
  const meta = releaseDisplay(t, row.state);
  const passed = row.checks.filter((check) => check.passed).length;
  return <article className={`mm-release-card mm-release-card--${meta.tone} ${featured ? 'is-featured' : ''}`}><div className="mm-release-card__rail"><span className={`bg-${meta.tone}`} /></div><div className="mm-release-card__header d-flex flex-wrap align-items-start justify-content-between gap-3"><div><span className={`badge bg-label-${meta.tone} mb-3`}><i className={`icon-base ti ${meta.icon} me-1`} />{meta.label}</span><h4 className="mb-1">{row.version}</h4><small className="text-body-secondary">{row.environment} · {row.commit}</small></div><span className="text-body-secondary small"><i className="icon-base ti tabler-clock me-1" />{formatTime(row.createdAt, lang)}</span></div><div className="mm-release-checks">{row.checks.map((check) => <span className={check.passed ? 'is-passed' : ''} key={check.label}><i className={`icon-base ti ${check.passed ? 'tabler-check' : 'tabler-minus'}`} />{check.label}</span>)}</div><div className="mm-release-card__footer d-flex align-items-center justify-content-between"><small className="text-body-secondary">{t.releases.card.ownerLabel} · {row.owner}</small><strong className={`text-${passed === row.checks.length ? 'success' : 'warning'}`}>{t.releases.card.checksOf(passed, row.checks.length)}</strong></div></article>;
}

export function ReleasesView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = releaseFacts(source.telemetry.releases);
  const sorted = [...source.telemetry.releases].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.releases.kpis.records.label} value={String(facts.total)} support={t.releases.kpis.records.support} icon="tabler-rocket" tone="primary" /><OperationsKpi label={t.releases.kpis.production.label} value={String(facts.production)} support={t.releases.kpis.production.support} icon="tabler-cloud-check" tone="success" /><OperationsKpi label={t.releases.kpis.planned.label} value={String(facts.planned)} support={t.releases.kpis.planned.support} icon="tabler-calendar-event" tone="warning" /><OperationsKpi label={t.releases.kpis.rollbacks.label} value={String(facts.rolledBack)} support={t.releases.kpis.rollbacks.support} icon="tabler-arrow-back-up" tone="danger" last /></OperationsKpiStrip>
    {sorted.length ? <div className="row g-6 mb-6"><div className="col-xl-7"><div className="d-grid gap-4">{sorted.map((row, index) => <ReleaseCard row={row} t={t} lang={lang} featured={index === 0} key={row.id} />)}</div></div><div className="col-xl-5"><div className="card mm-release-gate"><div className="card-body"><OperationsSectionHeader title={t.releases.gate.title} support={t.releases.gate.support} /><div className="mm-release-gate__score"><span>{t.releases.gate.score(facts.latest?.checks.filter((row) => row.passed).length ?? 0, facts.latest?.checks.length ?? 0)}</span><small>{t.releases.gate.latestChecksPassed}</small></div><div className="d-grid gap-3 mt-5">{t.releases.gate.controls.map((label, index) => <div className="d-flex align-items-center gap-3" key={label}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${index < 4 ? 'success' : 'warning'} text-${index < 4 ? 'success' : 'warning'}`}><i className={`icon-base ti ${index < 4 ? 'tabler-check' : 'tabler-alert-triangle'}`} /></span></span><span className="text-heading fw-medium">{label}</span></div>)}</div></div></div></div></div> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-rocket-off" title={t.releases.empty.title} body={t.releases.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!sorted.length} body={t.releases.source} />
  </>;
}

function FlagCard({ row, preview, t, lang }: { row: FeatureFlagRow; preview?: boolean; t: AdminPlatformDict; lang: Lang }) {
  const [state, setState] = useState(row.state);
  const [rollout, setRollout] = useState(row.rollout);
  const meta = flagDisplay(t, state);
  return <article className={`mm-flag-card mm-flag-card--${meta.tone}`}><div className="mm-flag-card__header d-flex align-items-start justify-content-between gap-3"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><div className="btn-group btn-group-sm" role="group" aria-label={t.flags.stateAria(row.label)}>{(['off', 'testing', 'on'] as const).map((value) => <button className={`btn ${state === value ? `btn-${flagDisplay(t, value).tone}` : 'btn-outline-secondary'}`} type="button" disabled={!preview} onClick={() => setState(value)} key={value}>{t.flagMeta[value]}</button>)}</div></div><div className="mm-flag-card__identity"><code>{row.key}</code><h5 className="mt-2 mb-2">{row.label}</h5><p className="text-body-secondary mb-0">{row.description}</p></div><div className="mm-flag-card__rollout"><div className="d-flex justify-content-between mb-2"><span className="small text-body-secondary">{t.flags.rolloutLabel}</span><strong className={`text-${meta.tone}`}>{rollout}%</strong></div><input type="range" className="form-range" min="0" max="100" step="5" value={rollout} disabled={!preview} onChange={(event) => setRollout(Number(event.target.value))} /></div><div className="mm-flag-card__environments d-flex flex-wrap gap-2">{row.environments.map((environment) => <span className="badge bg-label-secondary" key={environment}>{environment}</span>)}</div><div className="mm-flag-card__footer d-flex justify-content-between align-items-center"><small className="text-body-secondary"><i className="icon-base ti tabler-user-shield me-1" />{row.owner}</small><small className="text-body-secondary">{t.flags.updatedPrefix} {formatTime(row.updatedAt, lang)}</small></div></article>;
}

export function FeatureFlagsView({ source, preview }: { source: PlatformOperationsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminPlatform[lang];
  const facts = flagFacts(source.telemetry.flags);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.flags.kpis.registered.label} value={String(facts.total)} support={t.flags.kpis.registered.support} icon="tabler-flag-3" tone="primary" /><OperationsKpi label={t.flags.kpis.enabled.label} value={String(facts.on)} support={t.flags.kpis.enabled.support} icon="tabler-toggle-right" tone="success" /><OperationsKpi label={t.flags.kpis.testing.label} value={String(facts.testing)} support={t.flags.kpis.testing.support} icon="tabler-flask" tone="warning" /><OperationsKpi label={t.flags.kpis.productionScope.label} value={String(facts.production)} support={t.flags.kpis.productionScope.support} icon="tabler-world-cog" tone="info" last /></OperationsKpiStrip>
    {source.telemetry.flags.length ? <><div className="alert alert-danger d-flex align-items-start gap-3 mb-6"><i className="icon-base ti tabler-shield-lock icon-24px mt-1" /><div><h6 className="alert-heading mb-1">{t.flags.highImpact.title}</h6><p className="mb-0">{t.flags.highImpact.body}</p></div></div><div className="mm-flag-grid mb-6">{source.telemetry.flags.map((row) => <FlagCard row={row} preview={preview} t={t} lang={lang} key={row.id} />)}</div></> : <div className="card mb-6"><div className="card-body"><EmptyTelemetry icon="tabler-flag-off" title={t.flags.empty.title} body={t.flags.empty.body} /></div></div>}
    <PlatformSource preview={preview} t={t} warning={!source.telemetry.flags.length} body={t.flags.source} />
  </>;
}

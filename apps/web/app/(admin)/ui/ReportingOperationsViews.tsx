'use client';

import { useMemo, useState } from 'react';

import type { Lang } from '../../../lib/i18n/types';
import { getReportCoverage, summarizeSchedules, type KpiDefinition, type ReportCategory, type ReportDefinition, type ReportSchedule } from '../reporting-model';
import { formatCompactDate, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { NewScheduleButton, ScheduleActionButtons, ScheduleActionDialog, type ScheduleAction } from './ScheduleActions';
import { StaffDialog } from './StaffDialog';

const categories: Array<{ value: 'all' | ReportCategory; label: string }> = [
  { value: 'all', label: 'All reports' }, { value: 'executive', label: 'Executive' }, { value: 'revenue', label: 'Revenue' }, { value: 'product', label: 'Product' }, { value: 'customer', label: 'Customer' }, { value: 'security', label: 'Security' }, { value: 'support', label: 'Support' },
];

// Next-run tarih/saat parçaları OperationsShared.formatDateTime'ın dateStyle/timeStyle
// kombinasyonuna uymuyor (ayrı gün+ay / saat+dakika biçimleri) — lokal yardımcı kaldı (Task 2).
function formatScheduleDate(value: string, lang: Lang = 'en'): string {
  return new Date(value).toLocaleDateString(lang, { day: '2-digit', month: 'short' });
}

function formatScheduleTime(value: string, lang: Lang = 'en'): string {
  return new Date(value).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

export function ReportLibraryView({ rows }: { rows: ReportDefinition[] }) {
  const [category, setCategory] = useState<'all' | ReportCategory>('all');
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const coverage = getReportCoverage(rows);
  const visible = category === 'all' ? rows : rows.filter((row) => row.category === category);
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Report definitions" value={String(rows.length)} support="Reusable operating views" icon="tabler-report-analytics" tone="primary" />
      <OperationsKpi label="Source ready" value={String(coverage.ready)} support={`${coverage.percent}% catalog coverage`} icon="tabler-database-check" tone="success" />
      <OperationsKpi label="Partial source" value={String(coverage.partial)} support="Definition exists; feed pending" icon="tabler-database-exclamation" tone="warning" />
      <OperationsKpi label="Domains" value={String(new Set(rows.map((row) => row.category)).size)} support="Cross-functional catalog" icon="tabler-folders" tone="info" last />
    </OperationsKpiStrip>
    <div className="card mb-6 mm-report-library">
      <div className="card-body">
        <OperationsSectionHeader title="Operating report catalog" support="Open a definition to inspect its purpose, source contract, metric set and owner." action={<span className="badge bg-label-primary">Definition layer</span>} />
        <div className="nav nav-pills mm-report-filters mb-5" role="tablist" aria-label="Report categories">{categories.map((item) => <button type="button" key={item.value} className={`nav-link${category === item.value ? ' active' : ''}`} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
        <div className="mm-report-library-grid">{visible.map((row, index) => <button type="button" key={row.id} className={`mm-report-definition mm-report-definition--${row.tone}`} onClick={() => setSelected(row)}>
          <span className="mm-report-definition__top"><span className="avatar avatar-md"><span className={`avatar-initial rounded bg-label-${row.tone}`}><i className={`icon-base ti ${row.icon} icon-24px`} /></span></span><span className={`badge bg-label-${row.status === 'ready' ? 'success' : 'warning'}`}>{row.status === 'ready' ? 'Source ready' : 'Partial'}</span></span>
          <small className="text-body-secondary d-block mb-2">0{index + 1} / {row.category}</small><h5>{row.name}</h5><p>{row.description}</p>
          <span className="mm-report-definition__meta"><span><small>Owner</small><strong>{row.owner}</strong></span><span><small>Freshness</small><strong>{row.freshness}</strong></span><i className="icon-base ti tabler-arrow-up-right" /></span>
        </button>)}</div>
      </div>
    </div>
    <SourceNotice title="Catalog versus generated output" body="This page defines authoritative report contracts. A definition can be ready even when no persisted export file or delivery schedule exists." tone="info" icon="tabler-info-circle" />
    {selected && <StaffDialog title={selected.name} subtitle="Report definition" labelledBy={selected.name} busy={false} onClose={() => setSelected(null)} wide><div className="row g-6"><div className="col-md-6"><h6>Source contract</h6><div className="list-group">{selected.sources.map((source) => <div className="list-group-item d-flex align-items-center gap-2" key={source}><i className="icon-base ti tabler-database text-primary" />{source}</div>)}</div></div><div className="col-md-6"><h6>Metric set</h6><div className="list-group">{selected.metrics.map((metric) => <div className="list-group-item d-flex align-items-center gap-2" key={metric}><i className="icon-base ti tabler-chart-bar text-success" />{metric}</div>)}</div></div></div><div className="alert alert-primary mt-6 mb-0"><strong>{selected.owner}</strong> owns this definition · {selected.freshness}</div></StaffDialog>}
  </>;
}

export function ScheduledReportsView({ rows, now, preview = false }: { rows: ReportSchedule[]; now: number; preview?: boolean }) {
  const [focus, setFocus] = useState<'all' | ReportSchedule['status']>('all');
  const [selected, setSelected] = useState<ReportSchedule | null>(null);
  // ErrorsView/ApprovalsView emsali: eylem diyaloğu detay panelinin YERİNE
  // (kardeş) açılır, İÇİNE değil.
  const [action, setAction] = useState<ScheduleAction | null>(null);
  const facts = summarizeSchedules(rows, now);
  const visible = focus === 'all' ? rows : rows.filter((row) => row.status === focus);
  if (!rows.length) return <>
    <OperationsKpiStrip><OperationsKpi label="Schedules" value="0" support="No schedule opened yet" icon="tabler-calendar-off" tone="secondary" /><OperationsKpi label="Delivery channel" value="Connected" support="Daily runner delivers digest and CSV" icon="tabler-send" tone="success" /><OperationsKpi label="Run history" value="Pending" support="Populates after the first run" icon="tabler-history" tone="info" /><OperationsKpi label="Definitions" value="Ready" support="Use the report library" icon="tabler-report-analytics" tone="primary" last /></OperationsKpiStrip>
    <div className="card"><div className="card-body py-10"><div className="mm-report-empty"><span className="avatar avatar-xl"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-calendar-cog icon-32px" /></span></span><div><h4>No delivery schedule yet</h4><p className="text-body-secondary mb-0">Open the first schedule from this page — the daily runner picks it up on its next planned run.</p>{!preview && <div className="mt-4"><NewScheduleButton /></div>}</div></div></div></div>
    {preview && <div className="mt-6"><SourceNotice title="Preview schedules" body="This preview demonstrates the intended scheduler UI and is not connected to production delivery." tone="info" icon="tabler-flask" /></div>}
  </>;
  return <>
    {preview && <div className="mb-4"><SourceNotice title="Preview schedules" body="Delivery rows are representative fixtures used to validate the future scheduler workbench." tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label="Schedules" value={String(facts.total)} support="Configured deliveries" icon="tabler-calendar-stats" tone="primary" /><OperationsKpi label="Active" value={String(facts.active)} support="Eligible for next run" icon="tabler-player-play" tone="success" /><OperationsKpi label="Next 24 hours" value={String(facts.next24h)} support="Upcoming executions" icon="tabler-clock" tone="info" /><OperationsKpi label="Needs attention" value={String(facts.attention)} support="Failure or manual review" icon="tabler-alert-triangle" tone="danger" last /></OperationsKpiStrip>
    <div className="card mm-report-scheduler">
      <div className="card-body"><OperationsSectionHeader title="Delivery calendar" support="Cadence, owner, recipients and execution state without hiding failed runs." action={!preview ? <NewScheduleButton /> : undefined} />
        <div className="btn-group mb-5" role="group" aria-label="Schedule status">{(['all', 'active', 'paused', 'attention'] as const).map((value) => <button type="button" className={`btn btn-sm ${focus === value ? 'btn-primary' : 'btn-outline-secondary'}`} key={value} onClick={() => setFocus(value)}>{value}</button>)}</div>
        <div className="mm-report-schedule-list">{visible.map((row) => <button type="button" className={`mm-report-schedule mm-report-schedule--${row.status}`} key={row.id} onClick={() => setSelected(row)}><span className="mm-report-schedule__date"><small>Next run</small><strong>{formatScheduleDate(row.nextRunAt)}</strong><span>{formatScheduleTime(row.nextRunAt)}</span></span><span className="min-w-0 flex-grow-1"><span className="d-flex flex-wrap align-items-center gap-2 mb-2"><span className={`badge bg-label-${row.status === 'active' ? 'success' : row.status === 'attention' ? 'danger' : 'secondary'}`}>{row.status}</span><span className="badge bg-label-primary">{row.cadence}</span><span className="badge bg-label-info">{row.format}</span></span><strong className="text-heading d-block mb-1">{row.reportName}</strong><small className="text-body-secondary d-block text-truncate">{row.recipients.join(', ')}</small></span><span className="mm-report-schedule__run"><small>Last run</small><strong className={`text-${row.lastRunStatus === 'failed' ? 'danger' : row.lastRunStatus === 'success' ? 'success' : 'secondary'}`}>{row.lastRunStatus ?? 'Never'}</strong><span>{formatCompactDate(row.lastRunAt)}</span></span><i className="icon-base ti tabler-chevron-right" /></button>)}</div>
      </div>
    </div>
    {/* onDone İKİSİNİ de temizler: yalnız `action`ı sıfırlamak `selected`i
        BAYAT haliyle bırakır (ör. hâlâ "paused") — detay diyaloğu o bayat
        satırla yeniden açılır ve ikinci tıklama ham bekçi hatası üretir. */}
    {selected && action && <ScheduleActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); setSelected(null); }} />}
    {selected && !action && <StaffDialog title={selected.reportName} subtitle="Schedule definition" labelledBy={selected.reportName} busy={false} onClose={() => setSelected(null)}><div className="list-group mb-6"><Detail label="Cadence" value={selected.cadence} /><Detail label="Format" value={selected.format} /><Detail label="Owner" value={selected.owner} /><Detail label="Recipients" value={selected.recipients.join(', ')} /><Detail label="Next run" value={formatCompactDate(selected.nextRunAt)} /><Detail label="Last status" value={selected.lastRunStatus ?? 'Never run'} /></div>{!preview && <div className="d-flex gap-2 mb-6"><ScheduleActionButtons row={selected} onPick={setAction} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? 'Close preview' : 'Close'}</button></StaffDialog>}
  </>;
}

export function KpiDefinitionsView({ rows }: { rows: KpiDefinition[] }) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<'all' | ReportCategory>('all');
  const [selected, setSelected] = useState<KpiDefinition | null>(null);
  const visible = useMemo(() => rows.filter((row) => (domain === 'all' || row.domain === domain) && `${row.name} ${row.description} ${row.source}`.toLowerCase().includes(query.toLowerCase())), [domain, query, rows]);
  const defined = rows.filter((row) => row.status === 'defined').length;
  return <>
    <OperationsKpiStrip><OperationsKpi label="KPI definitions" value={String(rows.length)} support="Shared metric vocabulary" icon="tabler-book-2" tone="primary" /><OperationsKpi label="Source backed" value={String(defined)} support="Definition and feed available" icon="tabler-database-check" tone="success" /><OperationsKpi label="Source gaps" value={String(rows.length - defined)} support="Definition retained, feed pending" icon="tabler-plug-off" tone="warning" /><OperationsKpi label="Owners" value={String(new Set(rows.map((row) => row.owner)).size)} support="Named accountability" icon="tabler-users" tone="info" last /></OperationsKpiStrip>
    <div className="card mm-kpi-dictionary"><div className="card-body"><OperationsSectionHeader title="Metric dictionary" support="Every number keeps its formula, denominator, source, grain, freshness and interpretation guardrail." action={<span className="badge bg-label-success">Versioned contract</span>} />
      <div className="row g-3 mb-5"><div className="col-lg-5"><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search metric or source" /></div></div><div className="col-lg-7"><div className="nav nav-pills mm-report-filters justify-content-lg-end">{categories.filter((item) => item.value !== 'executive').map((item) => <button type="button" className={`nav-link${domain === item.value ? ' active' : ''}`} key={item.value} onClick={() => setDomain(item.value)}>{item.value === 'all' ? 'All domains' : item.label}</button>)}</div></div></div>
      <div className="mm-kpi-list">{visible.map((row) => <button type="button" className="mm-kpi-row" key={row.id} onClick={() => setSelected(row)}><span className={`mm-kpi-row__marker bg-${row.status === 'defined' ? 'success' : 'warning'}`} /><span className="min-w-0"><small className="text-body-secondary text-uppercase">{row.domain}</small><strong className="text-heading d-block">{row.name}</strong><span className="text-body-secondary d-block">{row.description}</span></span><span className="mm-kpi-row__formula"><small>Formula</small><strong>{row.formula}</strong></span><span className="mm-kpi-row__source"><small>Source · grain</small><strong>{row.source}</strong><span>{row.grain}</span></span><span className={`badge bg-label-${row.status === 'defined' ? 'success' : 'warning'}`}>{row.status === 'defined' ? 'Defined' : 'Source gap'}</span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></button>)}</div>
      {!visible.length && <SourceNotice title="No KPI matches this view" body="Clear the search or choose another metric domain." tone="info" icon="tabler-search-off" />}
    </div></div>
    {selected && <StaffDialog title={selected.name} subtitle={`${selected.domain} KPI definition`} labelledBy={selected.name} busy={false} onClose={() => setSelected(null)} wide><div className="row g-5"><div className="col-md-7"><h6>Business definition</h6><p className="text-body-secondary">{selected.description}</p><div className="alert alert-primary"><small className="d-block mb-1">Formula</small><strong>{selected.formula}</strong></div><div className="alert alert-warning mb-0"><small className="d-block mb-1">Interpretation guardrail</small><strong>{selected.guardrail}</strong></div></div><div className="col-md-5"><div className="list-group"><Detail label="Source" value={selected.source} /><Detail label="Grain" value={selected.grain} /><Detail label="Owner" value={selected.owner} /><Detail label="Freshness" value={selected.freshness} /></div></div></div></StaffDialog>}
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item"><small className="text-body-secondary d-block mb-1">{label}</small><strong className="text-heading">{value}</strong></div>;
}

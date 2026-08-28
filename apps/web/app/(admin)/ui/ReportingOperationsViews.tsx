'use client';

import { useMemo, useState } from 'react';

import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminReports } from '../../../lib/i18n/dict/admin-reports';
import { common } from '../../../lib/i18n/dict/common';
import { useLang } from '../../../lib/i18n/LangProvider';
import type { Lang } from '../../../lib/i18n/types';
import { getReportCoverage, summarizeSchedules, type KpiDefinition, type ReportCategory, type ReportDefinition, type ReportSchedule } from '../reporting-model';
import { formatCompactDate, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { NewScheduleButton, ScheduleActionButtons, ScheduleActionDialog, type ScheduleAction } from './ScheduleActions';
import { StaffDialog } from './StaffDialog';

// Kategori DEĞERLERİ burada, etiketler admin-reports sözlüğünde (`t.categories`) —
// modül düzeyinde `useLang()` çağrılamaz, etiketli liste her görünümün İÇİNDE kurulur.
const CATEGORY_VALUES: Array<'all' | ReportCategory> = ['all', 'executive', 'revenue', 'product', 'customer', 'security', 'support'];

// Next-run tarih/saat parçaları OperationsShared.formatDateTime'ın dateStyle/timeStyle
// kombinasyonuna uymuyor (ayrı gün+ay / saat+dakika biçimleri) — lokal yardımcı kaldı (Task 2).
function formatScheduleDate(value: string, lang: Lang = 'en'): string {
  return new Date(value).toLocaleDateString(lang, { day: '2-digit', month: 'short' });
}

function formatScheduleTime(value: string, lang: Lang = 'en'): string {
  return new Date(value).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

export function ReportLibraryView({ rows }: { rows: ReportDefinition[] }) {
  const lang = useLang();
  const t = adminReports[lang];
  const [category, setCategory] = useState<'all' | ReportCategory>('all');
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const coverage = getReportCoverage(rows);
  const visible = category === 'all' ? rows : rows.filter((row) => row.category === category);
  const categories = CATEGORY_VALUES.map((value) => ({ value, label: t.categories[value] }));
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label={t.library.kpis.definitions.label} value={String(rows.length)} support={t.library.kpis.definitions.support} icon="tabler-report-analytics" tone="primary" />
      <OperationsKpi label={t.library.statusBadge.ready} value={String(coverage.ready)} support={t.library.kpis.sourceReady.support(coverage.percent)} icon="tabler-database-check" tone="success" />
      <OperationsKpi label={t.library.statusBadge.partial} value={String(coverage.partial)} support={t.library.kpis.partialSource.support} icon="tabler-database-exclamation" tone="warning" />
      <OperationsKpi label={t.library.kpis.domains.label} value={String(new Set(rows.map((row) => row.category)).size)} support={t.library.kpis.domains.support} icon="tabler-folders" tone="info" last />
    </OperationsKpiStrip>
    <div className="card mb-6 mm-report-library">
      <div className="card-body">
        <OperationsSectionHeader title={t.library.header.title} support={t.library.header.support} action={<span className="badge bg-label-primary">{t.library.header.badge}</span>} />
        <div className="nav nav-pills mm-report-filters mb-5" role="tablist" aria-label={t.library.filtersAria}>{categories.map((item) => <button type="button" key={item.value} className={`nav-link${category === item.value ? ' active' : ''}`} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
        <div className="mm-report-library-grid">{visible.map((row, index) => <button type="button" key={row.id} className={`mm-report-definition mm-report-definition--${row.tone}`} onClick={() => setSelected(row)}>
          <span className="mm-report-definition__top"><span className="avatar avatar-md"><span className={`avatar-initial rounded bg-label-${row.tone}`}><i className={`icon-base ti ${row.icon} icon-24px`} /></span></span><span className={`badge bg-label-${row.status === 'ready' ? 'success' : 'warning'}`}>{row.status === 'ready' ? t.library.statusBadge.ready : t.library.statusBadge.partial}</span></span>
          <small className="text-body-secondary d-block mb-2">0{index + 1} / {row.category}</small><h5>{row.name}</h5><p>{row.description}</p>
          <span className="mm-report-definition__meta"><span><small>{t.shared.fields.owner}</small><strong>{row.owner}</strong></span><span><small>{t.shared.fields.freshness}</small><strong>{row.freshness}</strong></span><i className="icon-base ti tabler-arrow-up-right" /></span>
        </button>)}</div>
      </div>
    </div>
    <SourceNotice title={t.library.notice.title} body={t.library.notice.body} tone="info" icon="tabler-info-circle" />
    {selected && <StaffDialog title={selected.name} subtitle={t.library.detail.subtitle} labelledBy={selected.name} busy={false} onClose={() => setSelected(null)} wide><div className="row g-6"><div className="col-md-6"><h6>{t.library.detail.sourceContract}</h6><div className="list-group">{selected.sources.map((source) => <div className="list-group-item d-flex align-items-center gap-2" key={source}><i className="icon-base ti tabler-database text-primary" />{source}</div>)}</div></div><div className="col-md-6"><h6>{t.library.detail.metricSet}</h6><div className="list-group">{selected.metrics.map((metric) => <div className="list-group-item d-flex align-items-center gap-2" key={metric}><i className="icon-base ti tabler-chart-bar text-success" />{metric}</div>)}</div></div></div><div className="alert alert-primary mt-6 mb-0"><strong>{selected.owner}</strong> {t.library.detail.ownsSuffix} · {selected.freshness}</div></StaffDialog>}
  </>;
}

export function ScheduledReportsView({ rows, now, preview = false }: { rows: ReportSchedule[]; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminReports[lang];
  const [focus, setFocus] = useState<'all' | ReportSchedule['status']>('all');
  const [selected, setSelected] = useState<ReportSchedule | null>(null);
  // ErrorsView/ApprovalsView emsali: eylem diyaloğu detay panelinin YERİNE
  // (kardeş) açılır, İÇİNE değil.
  const [action, setAction] = useState<ScheduleAction | null>(null);
  const facts = summarizeSchedules(rows, now);
  const visible = focus === 'all' ? rows : rows.filter((row) => row.status === focus);
  if (!rows.length) return <>
    <OperationsKpiStrip><OperationsKpi label={t.scheduled.emptyKpis.schedules.label} value="0" support={t.scheduled.emptyKpis.schedules.support} icon="tabler-calendar-off" tone="secondary" /><OperationsKpi label={t.scheduled.emptyKpis.deliveryChannel.label} value={t.scheduled.emptyKpis.deliveryChannel.value} support={t.scheduled.emptyKpis.deliveryChannel.support} icon="tabler-send" tone="success" /><OperationsKpi label={t.scheduled.emptyKpis.runHistory.label} value={t.scheduled.emptyKpis.runHistory.value} support={t.scheduled.emptyKpis.runHistory.support} icon="tabler-history" tone="info" /><OperationsKpi label={t.scheduled.emptyKpis.definitions.label} value={t.scheduled.emptyKpis.definitions.value} support={t.scheduled.emptyKpis.definitions.support} icon="tabler-report-analytics" tone="primary" last /></OperationsKpiStrip>
    <div className="card"><div className="card-body py-10"><div className="mm-report-empty"><span className="avatar avatar-xl"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-calendar-cog icon-32px" /></span></span><div><h4>{t.scheduled.empty.title}</h4><p className="text-body-secondary mb-0">{t.scheduled.empty.body}</p>{!preview && <div className="mt-4"><NewScheduleButton /></div>}</div></div></div></div>
    {preview && <div className="mt-6"><SourceNotice title={t.scheduled.previewNotice.title} body={t.scheduled.previewNotice.emptyBody} tone="info" icon="tabler-flask" /></div>}
  </>;
  return <>
    {preview && <div className="mb-4"><SourceNotice title={t.scheduled.previewNotice.title} body={t.scheduled.previewNotice.listBody} tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label={t.scheduled.kpis.schedules.label} value={String(facts.total)} support={t.scheduled.kpis.schedules.support} icon="tabler-calendar-stats" tone="primary" /><OperationsKpi label={t.scheduled.kpis.active.label} value={String(facts.active)} support={t.scheduled.kpis.active.support} icon="tabler-player-play" tone="success" /><OperationsKpi label={t.scheduled.kpis.next24h.label} value={String(facts.next24h)} support={t.scheduled.kpis.next24h.support} icon="tabler-clock" tone="info" /><OperationsKpi label={t.scheduled.kpis.needsAttention.label} value={String(facts.attention)} support={t.scheduled.kpis.needsAttention.support} icon="tabler-alert-triangle" tone="danger" last /></OperationsKpiStrip>
    <div className="card mm-report-scheduler">
      <div className="card-body"><OperationsSectionHeader title={t.scheduled.header.title} support={t.scheduled.header.support} action={!preview ? <NewScheduleButton /> : undefined} />
        <div className="btn-group mb-5" role="group" aria-label={t.scheduled.statusFilterAria}>{(['all', 'active', 'paused', 'attention'] as const).map((value) => <button type="button" className={`btn btn-sm ${focus === value ? 'btn-primary' : 'btn-outline-secondary'}`} key={value} onClick={() => setFocus(value)}>{value}</button>)}</div>
        <div className="mm-report-schedule-list">{visible.map((row) => <button type="button" className={`mm-report-schedule mm-report-schedule--${row.status}`} key={row.id} onClick={() => setSelected(row)}><span className="mm-report-schedule__date"><small>{t.scheduled.nextRun}</small><strong>{formatScheduleDate(row.nextRunAt, lang)}</strong><span>{formatScheduleTime(row.nextRunAt, lang)}</span></span><span className="min-w-0 flex-grow-1"><span className="d-flex flex-wrap align-items-center gap-2 mb-2"><span className={`badge bg-label-${row.status === 'active' ? 'success' : row.status === 'attention' ? 'danger' : 'secondary'}`}>{row.status}</span><span className="badge bg-label-primary">{row.cadence}</span><span className="badge bg-label-info">{row.format}</span></span><strong className="text-heading d-block mb-1">{row.reportName}</strong><small className="text-body-secondary d-block text-truncate">{row.recipients.join(', ')}</small></span><span className="mm-report-schedule__run"><small>{t.scheduled.lastRun}</small><strong className={`text-${row.lastRunStatus === 'failed' ? 'danger' : row.lastRunStatus === 'success' ? 'success' : 'secondary'}`}>{row.lastRunStatus ?? adminCommon[lang].never}</strong><span>{formatCompactDate(row.lastRunAt, lang)}</span></span><i className="icon-base ti tabler-chevron-right" /></button>)}</div>
      </div>
    </div>
    {/* onDone İKİSİNİ de temizler: yalnız `action`ı sıfırlamak `selected`i
        BAYAT haliyle bırakır (ör. hâlâ "paused") — detay diyaloğu o bayat
        satırla yeniden açılır ve ikinci tıklama ham bekçi hatası üretir. */}
    {selected && action && <ScheduleActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); setSelected(null); }} />}
    {selected && !action && <StaffDialog title={selected.reportName} subtitle={t.scheduled.detail.subtitle} labelledBy={selected.reportName} busy={false} onClose={() => setSelected(null)}><div className="list-group mb-6"><Detail label={t.scheduled.detail.cadence} value={selected.cadence} /><Detail label={t.scheduled.detail.format} value={selected.format} /><Detail label={t.shared.fields.owner} value={selected.owner} /><Detail label={t.scheduled.detail.recipients} value={selected.recipients.join(', ')} /><Detail label={t.scheduled.nextRun} value={formatCompactDate(selected.nextRunAt, lang)} /><Detail label={t.scheduled.detail.lastStatus} value={selected.lastRunStatus ?? t.scheduled.detail.neverRun} /></div>{!preview && <div className="d-flex gap-2 mb-6"><ScheduleActionButtons row={selected} onPick={setAction} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? t.scheduled.detail.closePreview : common[lang].close}</button></StaffDialog>}
  </>;
}

export function KpiDefinitionsView({ rows }: { rows: KpiDefinition[] }) {
  const lang = useLang();
  const t = adminReports[lang];
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<'all' | ReportCategory>('all');
  const [selected, setSelected] = useState<KpiDefinition | null>(null);
  const visible = useMemo(() => rows.filter((row) => (domain === 'all' || row.domain === domain) && `${row.name} ${row.description} ${row.source}`.toLowerCase().includes(query.toLowerCase())), [domain, query, rows]);
  const defined = rows.filter((row) => row.status === 'defined').length;
  const domains = CATEGORY_VALUES.filter((value) => value !== 'executive').map((value) => ({ value, label: value === 'all' ? t.kpiDefinitions.allDomains : t.categories[value] }));
  return <>
    <OperationsKpiStrip><OperationsKpi label={t.kpiDefinitions.kpis.definitions.label} value={String(rows.length)} support={t.kpiDefinitions.kpis.definitions.support} icon="tabler-book-2" tone="primary" /><OperationsKpi label={t.kpiDefinitions.kpis.sourceBacked.label} value={String(defined)} support={t.kpiDefinitions.kpis.sourceBacked.support} icon="tabler-database-check" tone="success" /><OperationsKpi label={t.kpiDefinitions.kpis.sourceGaps.label} value={String(rows.length - defined)} support={t.kpiDefinitions.kpis.sourceGaps.support} icon="tabler-plug-off" tone="warning" /><OperationsKpi label={t.kpiDefinitions.kpis.owners.label} value={String(new Set(rows.map((row) => row.owner)).size)} support={t.kpiDefinitions.kpis.owners.support} icon="tabler-users" tone="info" last /></OperationsKpiStrip>
    <div className="card mm-kpi-dictionary"><div className="card-body"><OperationsSectionHeader title={t.kpiDefinitions.header.title} support={t.kpiDefinitions.header.support} action={<span className="badge bg-label-success">{t.kpiDefinitions.header.badge}</span>} />
      <div className="row g-3 mb-5"><div className="col-lg-5"><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.kpiDefinitions.searchPlaceholder} /></div></div><div className="col-lg-7"><div className="nav nav-pills mm-report-filters justify-content-lg-end">{domains.map((item) => <button type="button" className={`nav-link${domain === item.value ? ' active' : ''}`} key={item.value} onClick={() => setDomain(item.value)}>{item.label}</button>)}</div></div></div>
      <div className="mm-kpi-list">{visible.map((row) => <button type="button" className="mm-kpi-row" key={row.id} onClick={() => setSelected(row)}><span className={`mm-kpi-row__marker bg-${row.status === 'defined' ? 'success' : 'warning'}`} /><span className="min-w-0"><small className="text-body-secondary text-uppercase">{row.domain}</small><strong className="text-heading d-block">{row.name}</strong><span className="text-body-secondary d-block">{row.description}</span></span><span className="mm-kpi-row__formula"><small>{t.kpiDefinitions.formula}</small><strong>{row.formula}</strong></span><span className="mm-kpi-row__source"><small>{t.kpiDefinitions.sourceGrain}</small><strong>{row.source}</strong><span>{row.grain}</span></span><span className={`badge bg-label-${row.status === 'defined' ? 'success' : 'warning'}`}>{row.status === 'defined' ? t.kpiDefinitions.statusBadge.defined : t.kpiDefinitions.statusBadge.sourceGap}</span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></button>)}</div>
      {!visible.length && <SourceNotice title={t.kpiDefinitions.emptyMatches.title} body={t.kpiDefinitions.emptyMatches.body} tone="info" icon="tabler-search-off" />}
    </div></div>
    {selected && <StaffDialog title={selected.name} subtitle={t.kpiDefinitions.detail.subtitleSuffix(selected.domain)} labelledBy={selected.name} busy={false} onClose={() => setSelected(null)} wide><div className="row g-5"><div className="col-md-7"><h6>{t.kpiDefinitions.detail.businessDefinition}</h6><p className="text-body-secondary">{selected.description}</p><div className="alert alert-primary"><small className="d-block mb-1">{t.kpiDefinitions.formula}</small><strong>{selected.formula}</strong></div><div className="alert alert-warning mb-0"><small className="d-block mb-1">{t.kpiDefinitions.detail.interpretationGuardrail}</small><strong>{selected.guardrail}</strong></div></div><div className="col-md-5"><div className="list-group"><Detail label={t.kpiDefinitions.detail.source} value={selected.source} /><Detail label={t.kpiDefinitions.detail.grain} value={selected.grain} /><Detail label={t.shared.fields.owner} value={selected.owner} /><Detail label={t.shared.fields.freshness} value={selected.freshness} /></div></div></div></StaffDialog>}
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item"><small className="text-body-secondary d-block mb-1">{label}</small><strong className="text-heading">{value}</strong></div>;
}

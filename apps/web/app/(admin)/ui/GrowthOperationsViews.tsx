'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminGrowth, type AdminGrowthDict } from '../../../lib/i18n/dict/admin-growth';
import type { Lang } from '../../../lib/i18n/types';
import {
  CONTENT_PAGE_REGISTRY,
  groupLeads,
  growthFacts,
  growthLifecycle,
  LEGAL_CONTENT_REGISTRY,
  MEDIA_ASSET_REGISTRY,
  momentumRows,
  registrationSeries,
  type GrowthLeadRow,
  type GrowthLeadStage,
} from '../growth-analytics-model';
import type { ProductAnalyticsSnapshot } from '../product-analytics-model';
import { LeadUpdateButton } from './LeadActions';
import {
  formatCompactDate,
  InitialAvatar,
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';

/** İkon/ton dil-bağımsız veri (admin-product `TEMPLATE_LOOKS` emsali) — görünen ad/açıklama `shortcuts.items`'tan gelir. */
const WORKBENCH_LOOKS = [
  { route: 'acquisition', key: 'acquisition', icon: 'tabler-route', tone: 'primary' },
  { route: 'leads', key: 'leads', icon: 'tabler-user-search', tone: 'success' },
  { route: 'content/pages', key: 'pages', icon: 'tabler-browser-check', tone: 'info' },
  { route: 'content/media', key: 'media', icon: 'tabler-photo-scan', tone: 'warning' },
  { route: 'content/legal', key: 'legal', icon: 'tabler-scale', tone: 'danger' },
] as const;

function PreviewBadge({ preview, t }: { preview?: boolean; t: AdminGrowthDict }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />{t.shared.previewBadge}</span> : null;
}

function GrowthSource({ preview, body, warning, t }: { preview?: boolean; body: string; warning?: boolean; t: AdminGrowthDict }) {
  return <SourceNotice title={preview ? t.shared.source.demonstrationTitle : warning ? t.shared.source.boundaryTitle : t.shared.source.title} body={preview ? `${t.shared.source.previewPrefix}${body}` : body} tone={preview ? 'warning' : warning ? 'warning' : 'info'} icon={preview ? 'tabler-flask' : warning ? 'tabler-plug-off' : 'tabler-database'} />;
}

function GrowthShortcuts({ preview, t }: { preview?: boolean; t: AdminGrowthDict }) {
  const base = preview ? '/dev/admin-preview/growth' : '/admin/growth';
  return <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.shortcuts.card.title} support={t.shortcuts.card.support} /><div className="mm-growth-shortcuts">{WORKBENCH_LOOKS.map((item) => { const meta = t.shortcuts.items[item.key]; return <Link href={`${base}/${item.route}`} className={`mm-growth-shortcut mm-growth-shortcut--${item.tone}`} key={item.route}><span className={`avatar avatar-md`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon} icon-22px`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading">{meta.label}</strong><small className="d-block text-body-secondary text-truncate">{meta.support}</small></span><i className="icon-base ti tabler-arrow-up-right" /></Link>; })}</div></div></div>;
}

export function GrowthOverviewView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const facts = growthFacts(source, now);
  const registrations = registrationSeries(source, now, 8, lang);
  const lifecycle = growthLifecycle(source);
  const momentum = momentumRows(source, now).slice(0, 6);
  const recentEvents = source.events.filter((row) => now - new Date(row.createdAt).getTime() <= 30 * 86_400_000);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.shared.workspacesLabel} value={String(facts.organizations)} support={t.overview.kpis.workspaces.support(facts.recentOrganizations)} icon="tabler-building-community" tone="primary" />
      <OperationsKpi label={t.overview.kpis.activated.label} value={t.shared.pctValue(facts.activationRate)} support={t.overview.kpis.activated.support(facts.activeOrganizations)} icon="tabler-broadcast" tone="success" />
      <OperationsKpi label={t.overview.kpis.exportEvidenced.label} value={t.shared.pctValue(facts.exportRate)} support={t.overview.kpis.exportEvidenced.support(facts.exportOrganizations)} icon="tabler-file-export" tone="info" />
      <OperationsKpi label={t.overview.kpis.signals30d.label} value={String(facts.recentSignals)} support={t.overview.kpis.signals30d.support} icon="tabler-pulse" tone="warning" last />
    </OperationsKpiStrip>
    <GrowthShortcuts preview={preview} t={t} />
    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.overview.creationCard.title} support={t.overview.creationCard.support} /><BarsChart categories={registrations.map((row) => row.label)} seriesName={t.shared.workspacesLabel} data={registrations.map((row) => row.value)} color="#7367f0" height={286} /></div></div></div>
      <div className="col-xl-4"><div className="card h-100 mm-growth-signal-card"><div className="card-body"><OperationsSectionHeader title={t.overview.signalCard.title} support={t.overview.signalCard.support} /><div className="d-grid gap-4">{[
        { label: t.overview.signalCard.registrationState, value: facts.organizations, icon: 'tabler-building-plus', tone: 'primary' },
        { label: t.overview.signalCard.productMilestones, value: lifecycle.filter((row) => row.value > 0).length, icon: 'tabler-route', tone: 'success' },
        { label: t.overview.signalCard.durableEvents, value: recentEvents.length, icon: 'tabler-activity', tone: 'info' },
      ].map((item) => <div className="d-flex align-items-center gap-3" key={item.label}><span className="avatar"><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">{t.overview.signalCard.loadedSource}</small></span><strong className={`fs-4 text-${item.tone}`}>{item.value}</strong></div>)}</div><div className="alert alert-warning mt-5 mb-0"><small>{t.overview.signalCard.alert}</small></div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.overview.lifecycleCard.title} support={t.overview.lifecycleCard.support} /><div className="mm-growth-lifecycle">{lifecycle.map((stage, index) => <div className="mm-growth-lifecycle__stage" key={stage.key}><div className="d-flex justify-content-between align-items-start"><span className="badge bg-label-primary">0{index + 1}</span><strong className="fs-4 text-heading">{stage.value}</strong></div><h6 className="mt-4 mb-1">{stage.label}</h6><small className="text-body-secondary">{t.overview.lifecycleCard.ofRegisteredPct(stage.rate)}</small><div className="progress mt-3"><div className={`progress-bar bg-${index === lifecycle.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div>)}</div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.overview.momentumCard.title} support={t.overview.momentumCard.support} /><div className="row g-4">{momentum.map((org) => <div className="col-md-6 col-xl-4" key={org.id}><div className="mm-growth-momentum"><div className="d-flex align-items-center gap-3"><InitialAvatar label={org.name} tone={org.score >= 80 ? 'success' : 'primary'} /><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading text-truncate">{org.name}</strong><small className="text-body-secondary">{t.overview.momentumCard.milestonesOf4(org.milestones)} · {org.recent === null ? t.overview.momentumCard.noEvent : t.overview.momentumCard.sinceActivity(org.recent)}</small></span><span className={`badge bg-label-${org.score >= 80 ? 'success' : org.score >= 40 ? 'primary' : 'warning'}`}>{org.score}</span></div><div className="progress mt-4"><div className={`progress-bar bg-${org.score >= 80 ? 'success' : 'primary'}`} style={{ width: `${org.score}%` }} /></div></div></div>)}</div></div></div>
    <GrowthSource preview={preview} t={t} body={t.overview.source} />
  </>;
}

export function AcquisitionView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const lifecycle = growthLifecycle(source);
  const registrations = registrationSeries(source, now, 10, lang);
  const entitlement = ['trial', 'active', 'past_due', 'cancelled'].map((state) => source.organizations.filter((org) => org.entitlementState === state).length);
  const biggestDrop = lifecycle.slice(1).map((stage, index) => ({ ...stage, loss: (lifecycle[index]?.value ?? 0) - stage.value })).sort((a, b) => b.loss - a.loss)[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <div className="card mb-6 overflow-hidden"><div className="card-body p-0"><div className="mm-acquisition-path">{lifecycle.map((stage, index) => <div className="mm-acquisition-path__step" key={stage.key}><div className="d-flex justify-content-between align-items-center mb-5"><span className="text-primary fw-semibold">0{index + 1}</span><i className={`icon-base ti ${['tabler-building', 'tabler-user-check', 'tabler-signature', 'tabler-broadcast', 'tabler-file-export'][index]} icon-24px text-body-secondary`} /></div><h3 className="mb-1">{stage.value}</h3><h6 className="mb-2">{stage.label}</h6><p className="small text-body-secondary mb-4">{index === 0 ? t.acquisition.pathCard.baseline : t.acquisition.pathCard.stepRatePct(stage.stepRate)}</p><div className="progress"><div className={`progress-bar bg-${index === lifecycle.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div>)}</div></div></div>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.acquisition.registrationCard.title} support={t.acquisition.registrationCard.support} /><BarsChart categories={registrations.map((row) => row.label)} seriesName={t.acquisition.registrationCard.seriesName} data={registrations.map((row) => row.value)} color="#00bad1" height={295} /></div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.acquisition.stateMixCard.title} support={t.acquisition.stateMixCard.support} /><DonutChart labels={t.acquisition.stateMixCard.donutLabels as string[]} series={entitlement} colors={['#ff9f43', '#28c76f', '#ff4c51', '#a8aaae']} centerLabel={t.shared.workspacesLabel} height={295} /></div></div></div>
    </div>
    <div className="row g-6 mb-6"><div className="col-lg-5"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-filter-exclamation icon-28px" /></span></span><h5>{t.acquisition.gap.title}</h5><h2 className="text-warning mb-2">{t.acquisition.gap.loss(biggestDrop?.loss ?? 0)}</h2><p className="text-body-secondary mb-0">{t.acquisition.gap.prefix}<strong>{biggestDrop?.label ?? t.acquisition.gap.fallbackLabel}</strong>{t.acquisition.gap.suffix}</p></div></div></div><div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.acquisition.readiness.title} support={t.acquisition.readiness.support} /><div className="d-grid gap-3">{[
      { label: t.acquisition.readiness.landingSessions, status: t.shared.notConnected, tone: 'danger', icon: 'tabler-world-search' },
      { label: t.acquisition.readiness.utm, status: t.shared.notConnected, tone: 'danger', icon: 'tabler-tags' },
      { label: t.acquisition.readiness.registrations, status: adminCommon[lang].live, tone: 'success', icon: 'tabler-building-plus' },
      { label: t.acquisition.readiness.activation, status: adminCommon[lang].live, tone: 'success', icon: 'tabler-route' },
    ].map((item) => <div className="d-flex align-items-center gap-3 rounded bg-body-secondary p-3" key={item.label}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1 text-heading fw-medium">{item.label}</span><span className={`badge bg-label-${item.tone}`}>{item.status}</span></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} t={t} warning body={t.acquisition.source} />
  </>;
}

/** Dil-bağımsız look'lar (admin-product `TEMPLATE_LOOKS`/`templateMeta` ayrımı) — İNSAN-OKUR etiket `t.leads.meta`'dan gelir. */
const LEAD_LOOKS: Record<GrowthLeadStage, { tone: string; icon: string; step: number }> = {
  new: { tone: 'primary', icon: 'tabler-sparkles', step: 25 },
  qualified: { tone: 'info', icon: 'tabler-user-check', step: 50 },
  scheduled: { tone: 'warning', icon: 'tabler-calendar-event', step: 75 },
  won: { tone: 'success', icon: 'tabler-rosette-discount-check', step: 100 },
  lost: { tone: 'danger', icon: 'tabler-mood-sad', step: 100 },
};

function LeadCard({ lead, tone, preview, t, lang }: { lead: GrowthLeadRow; tone: string; preview?: boolean; t: AdminGrowthDict; lang: Lang }) {
  const seatProgress = Math.min(100, Math.max(14, Math.round((lead.seats / 120) * 100)));
  const priority = lead.seats >= 80 ? t.leads.card.priority.high : lead.seats >= 40 ? t.leads.card.priority.growth : t.leads.card.priority.standard;
  const priorityTone = lead.seats >= 80 ? 'warning' : lead.seats >= 40 ? 'info' : 'secondary';

  return <article className={`mm-lead-card mm-lead-card--${tone}`}>
    <div className="mm-lead-card__accent" />
    <div className="mm-lead-card__body">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-4">
        <span className={`badge bg-label-${priorityTone}`}><i className="icon-base ti tabler-bolt me-1" />{priority}</span>
        {!preview && <LeadUpdateButton lead={lead} />}
      </div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <InitialAvatar label={lead.company} tone={tone} />
        <div className="min-w-0 flex-grow-1">
          <h6 className="mb-1 text-truncate">{lead.company}</h6>
          <small className="text-body-secondary d-flex align-items-center gap-1 text-truncate"><i className="icon-base ti tabler-user icon-14px" />{lead.contact}</small>
        </div>
      </div>
      <div className="mm-lead-card__source mb-4">
        <span><i className="icon-base ti tabler-world-share" />{t.shared.sourceLabel}</span>
        <strong>{lead.source}</strong>
      </div>
      <div className="mb-4">
        <div className="d-flex align-items-end justify-content-between gap-3 mb-2">
          <span className="small text-body-secondary">{t.leads.card.footprintLabel}</span>
          <span className="text-heading fw-semibold">{lead.seats} <small className="fw-normal text-body-secondary">{t.leads.card.seatsSuffix}</small></span>
        </div>
        <div className="progress mm-lead-card__progress"><div className={`progress-bar bg-${tone}`} style={{ width: `${seatProgress}%` }} /></div>
      </div>
      <div className="mm-lead-card__next">
        <span className={`avatar avatar-sm flex-shrink-0`}><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className="icon-base ti tabler-arrow-forward-up" /></span></span>
        <span className="min-w-0"><small className="d-block text-body-secondary mb-1">{t.leads.card.nextActionLabel}</small><strong className="d-block text-heading text-truncate">{lead.nextStep}</strong></span>
      </div>
      <div className="mm-lead-card__footer">
        <small className="text-body-secondary d-flex align-items-center gap-1"><i className="icon-base ti tabler-clock icon-14px" />{formatCompactDate(lead.createdAt, lang)}</small>
      </div>
    </div>
  </article>;
}

export function LeadsView({ rows, preview }: { rows: GrowthLeadRow[]; preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const groups = groupLeads(rows);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    {rows.length ? <>
      <OperationsKpiStrip>{groups.map((group, index) => { const label = t.leads.meta[group.stage]; const look = LEAD_LOOKS[group.stage]; return <OperationsKpi key={group.stage} label={label} value={String(group.rows.length)} support={t.leads.potentialSeats(group.rows.reduce((sum, row) => sum + row.seats, 0))} icon={look.icon} tone={look.tone} last={index === groups.length - 1} />; })}</OperationsKpiStrip>
      <div className="mm-lead-board mb-6">{groups.map((group) => { const label = t.leads.meta[group.stage]; const look = LEAD_LOOKS[group.stage]; const seats = group.rows.reduce((sum, row) => sum + row.seats, 0); return <section className={`mm-lead-column mm-lead-column--${look.tone}`} key={group.stage}><header className="mm-lead-column__header"><div className="d-flex align-items-center gap-3"><span className="avatar avatar-sm"><span className={`avatar-initial rounded bg-label-${look.tone} text-${look.tone}`}><i className={`icon-base ti ${look.icon}`} /></span></span><span><span className="d-flex align-items-center gap-2"><h6 className="mb-0">{label}</h6><span className={`badge rounded-pill bg-label-${look.tone}`}>{group.rows.length}</span></span><small className="text-body-secondary">{t.leads.potentialSeats(seats)}</small></span></div></header><div className="mm-lead-column__progress"><span className={`bg-${look.tone}`} style={{ width: `${look.step}%` }} /></div><div className="d-grid gap-3">{group.rows.map((lead) => <LeadCard lead={lead} tone={look.tone} preview={preview} t={t} lang={lang} key={lead.id} />)}</div></section>; })}</div>
    </> : <div className="row g-6 mb-6"><div className="col-xl-7"><div className="card h-100"><div className="card-body py-10 text-center"><span className="avatar avatar-xl mb-4"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-user-search icon-32px" /></span></span><h4>{t.leads.empty.title}</h4><p className="text-body-secondary mx-auto mb-0" style={{ maxWidth: '42rem' }}>{t.leads.empty.body}</p></div></div></div><div className="col-xl-5"><div className="card h-100 card-border-shadow-primary"><div className="card-body"><OperationsSectionHeader title={t.leads.fieldsCard.title} support={t.leads.fieldsCard.support} /><div className="d-grid gap-3">{[t.leads.fieldsCard.items.companyContact, t.shared.sourceLabel, t.leads.fieldsCard.items.seatEstimate, t.leads.fieldsCard.items.pipelineStage, t.shared.nextStepFieldLabel].map((label, index) => <div className="d-flex align-items-center gap-3" key={label}><span className="badge rounded-pill bg-label-primary">0{index + 1}</span><span className="text-heading fw-medium">{label}</span></div>)}</div></div></div></div></div>}
    <GrowthSource preview={preview} t={t} body={preview ? t.leads.source.preview : t.leads.source.live} />
  </>;
}

export function PagesSeoView({ preview }: { preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const [query, setQuery] = useState('');
  const rows = useMemo(() => CONTENT_PAGE_REGISTRY.filter((row) => `${row.route} ${row.title} ${row.owner}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const marketing = CONTENT_PAGE_REGISTRY.filter((row) => row.kind === 'marketing').length;
  const legal = CONTENT_PAGE_REGISTRY.length - marketing;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.pagesSeo.kpis.registeredRoutes.label} value={String(CONTENT_PAGE_REGISTRY.length)} support={t.pagesSeo.kpis.registeredRoutes.support} icon="tabler-route" tone="primary" />
      <OperationsKpi label={t.pagesSeo.kpis.metadataTitles.label} value={`${CONTENT_PAGE_REGISTRY.filter((row) => row.metadata).length}/${CONTENT_PAGE_REGISTRY.length}`} support={t.pagesSeo.kpis.metadataTitles.support} icon="tabler-browser-check" tone="success" />
      <OperationsKpi label={t.pagesSeo.kpis.marketingPages.label} value={String(marketing)} support={t.pagesSeo.kpis.marketingPages.support} icon="tabler-speakerphone" tone="info" />
      <OperationsKpi label={t.pagesSeo.kpis.legalPages.label} value={String(legal)} support={t.pagesSeo.kpis.legalPages.support} icon="tabler-scale" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="mb-1">{t.pagesSeo.registryCard.title}</h5><p className="text-body-secondary mb-0">{t.pagesSeo.registryCard.support}</p></div><div className="input-group input-group-merge" style={{ maxWidth: '20rem' }}><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.pagesSeo.registryCard.searchPlaceholder} /></div></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>{t.pagesSeo.registryCard.headers.route}</th><th>{t.pagesSeo.registryCard.headers.title}</th><th>{t.pagesSeo.registryCard.headers.owner}</th><th>{t.pagesSeo.registryCard.headers.index}</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.route}><td><code>{row.route}</code></td><td><span className="fw-medium text-heading d-block">{row.title}</span><small className="text-body-secondary">{row.kind === 'legal' ? t.pagesSeo.registryCard.legalContent : t.pagesSeo.registryCard.marketingContent}</small></td><td><span className="badge bg-label-secondary">{row.owner}</span></td><td><span className={`badge bg-label-${row.indexable ? 'success' : 'warning'}`}>{row.indexable ? t.pagesSeo.registryCard.indexable : t.pagesSeo.registryCard.review}</span></td><td><Link href={row.route} target="_blank" className="btn btn-sm btn-icon btn-label-primary" aria-label={t.pagesSeo.registryCard.openAria(row.route)}><i className="icon-base ti tabler-external-link" /></Link></td></tr>)}</tbody></table></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.pagesSeo.coverageCard.title} support={t.pagesSeo.coverageCard.support} /><div className="d-grid gap-4">{[
      { label: t.pagesSeo.coverageCard.routeTitleMetadata, value: 100, tone: 'success' },
      { label: t.pagesSeo.coverageCard.canonicalRegistry, value: 0, tone: 'warning' },
      { label: t.pagesSeo.coverageCard.searchPerformanceFeed, value: 0, tone: 'danger' },
      { label: t.pagesSeo.coverageCard.contentApprovalWorkflow, value: 0, tone: 'danger' },
    ].map((item) => <div key={item.label}><div className="d-flex justify-content-between mb-2"><span className="text-heading fw-medium">{item.label}</span><span className={`text-${item.tone} fw-semibold`}>{t.shared.pctValue(item.value)}</span></div><div className="progress"><div className={`progress-bar bg-${item.tone}`} style={{ width: `${item.value}%` }} /></div></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} t={t} warning body={t.pagesSeo.source} />
  </>;
}

export function MediaLibraryView({ preview }: { preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.mediaLibrary.registryCard.title} support={t.mediaLibrary.registryCard.support} /><div className="mm-media-grid">{MEDIA_ASSET_REGISTRY.map((asset) => <article className="mm-media-card" key={asset.path}><div className={`mm-media-card__preview mm-media-card__preview--${asset.tone}`}><Image src={asset.path} alt={asset.label} width={220} height={96} className="mm-media-card__image" /></div><div className="p-4"><div className="d-flex align-items-start justify-content-between gap-3 mb-2"><h6 className="mb-0">{asset.label}</h6><span className={`badge bg-label-${asset.tone}`}>{asset.format}</span></div><p className="text-body-secondary small mb-3">{asset.purpose}</p><code className="d-block text-truncate">{asset.path}</code></div></article>)}</div></div></div></div><div className="col-xl-4"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-photo-shield icon-28px" /></span></span><h5>{t.mediaLibrary.boundaryCard.title}</h5><p className="text-body-secondary">{t.mediaLibrary.boundaryCard.body}</p><hr /><div className="d-flex justify-content-between"><span className="text-body-secondary">{t.mediaLibrary.boundaryCard.approvedFiles}</span><strong>{MEDIA_ASSET_REGISTRY.length}</strong></div><div className="d-flex justify-content-between mt-3"><span className="text-body-secondary">{t.mediaLibrary.boundaryCard.cmsUploads}</span><span className="badge bg-label-secondary">{t.shared.notConnected}</span></div></div></div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.mediaLibrary.readinessCard.title} support={t.mediaLibrary.readinessCard.support} /><div className="row g-4">{[
      { label: t.mediaLibrary.readinessCard.publicBrandInventory, value: adminCommon[lang].live, icon: 'tabler-brand-appstore', tone: 'success' },
      { label: t.mediaLibrary.readinessCard.usageOwnership, value: t.mediaLibrary.readinessCard.definedValue, icon: 'tabler-license', tone: 'primary' },
      { label: t.mediaLibrary.readinessCard.editorialUpload, value: t.shared.notConnected, icon: 'tabler-cloud-upload', tone: 'warning' },
      { label: t.mediaLibrary.readinessCard.approvalHistory, value: t.shared.notConnected, icon: 'tabler-history-toggle', tone: 'danger' },
    ].map((item) => <div className="col-sm-6 col-xl-3" key={item.label}><div className={`rounded bg-label-${item.tone} p-4 h-100`}><i className={`icon-base ti ${item.icon} icon-28px mb-4`} /><h6>{item.label}</h6><span className="fw-semibold">{item.value}</span></div></div>)}</div></div></div>
    <GrowthSource preview={preview} t={t} warning body={t.mediaLibrary.source} />
  </>;
}

export function LegalContentView({ preview }: { preview?: boolean }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const published = LEGAL_CONTENT_REGISTRY.filter((row) => row.published).length;
  const tracked = LEGAL_CONTENT_REGISTRY.filter((row) => row.acceptanceTracked).length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.legalContent.kpis.registeredDocuments.label} value={String(LEGAL_CONTENT_REGISTRY.length)} support={t.legalContent.kpis.registeredDocuments.support} icon="tabler-file-description" tone="primary" />
      <OperationsKpi label={t.legalContent.kpis.publishedRoutes.label} value={`${published}/${LEGAL_CONTENT_REGISTRY.length}`} support={t.legalContent.kpis.publishedRoutes.support} icon="tabler-world-check" tone="success" />
      <OperationsKpi label={t.legalContent.kpis.acceptanceTypes.label} value={String(tracked)} support={t.legalContent.kpis.acceptanceTypes.support} icon="tabler-signature" tone="info" />
      <OperationsKpi label={t.legalContent.kpis.missingRoutes.label} value={String(LEGAL_CONTENT_REGISTRY.length - published)} support={t.legalContent.kpis.missingRoutes.support} icon="tabler-file-alert" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.legalContent.registerCard.title} support={t.legalContent.registerCard.support} /><div className="mm-legal-timeline">{LEGAL_CONTENT_REGISTRY.map((item, index) => <div className="mm-legal-timeline__item" key={item.code}><div className={`mm-legal-timeline__marker bg-label-${item.published ? 'success' : 'warning'} text-${item.published ? 'success' : 'warning'}`}><span>0{index + 1}</span></div><div className="flex-grow-1 min-w-0"><div className="d-flex flex-wrap align-items-center gap-2 mb-2"><h6 className="mb-0">{item.label}</h6><span className={`badge bg-label-${item.published ? 'success' : 'warning'}`}>{item.published ? t.legalContent.registerCard.published : t.legalContent.registerCard.routeMissing}</span><span className={`badge bg-label-${item.acceptanceTracked ? 'info' : 'secondary'}`}>{item.acceptanceTracked ? t.legalContent.registerCard.evidenceType : t.legalContent.registerCard.disclosureOnly}</span></div><p className="text-body-secondary mb-2">{item.support}</p>{item.route ? <Link href={item.route} target="_blank" className="small fw-medium">{t.legalContent.registerCard.openRoute(item.route)}<i className="icon-base ti tabler-external-link ms-1" /></Link> : <span className="small text-warning fw-medium">{t.legalContent.registerCard.noPublicRoute}</span>}</div></div>)}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.legalContent.controlCard.title} support={t.legalContent.controlCard.support} /><div className="d-grid gap-4">{[
      { label: t.legalContent.controlCard.items.publicLegalRoutes.label, support: t.legalContent.controlCard.items.publicLegalRoutes.support, icon: 'tabler-world', tone: 'success' },
      { label: t.legalContent.controlCard.items.acceptanceEvidence.label, support: t.legalContent.controlCard.items.acceptanceEvidence.support, icon: 'tabler-shield-check', tone: 'primary' },
      { label: t.legalContent.controlCard.items.editorialRevisions.label, support: t.legalContent.controlCard.items.editorialRevisions.support, icon: 'tabler-git-branch', tone: 'warning' },
      { label: t.legalContent.controlCard.items.approvalChain.label, support: t.legalContent.controlCard.items.approvalChain.support, icon: 'tabler-user-question', tone: 'danger' },
    ].map((item) => <div className="d-flex gap-3" key={item.label}><span className="avatar"><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">{item.support}</small></span></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} t={t} warning body={t.legalContent.source} />
  </>;
}

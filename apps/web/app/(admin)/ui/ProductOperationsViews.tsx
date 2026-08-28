'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import {
  activationStages,
  cohortRows,
  distribution,
  monthlyEventSeries,
  productFacts,
  templateFacts,
  type ProductAnalyticsSnapshot,
  type ProductEventRow,
} from '../product-analytics-model';
import {
  formatCompactDate,
  InitialAvatar,
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminProduct, type AdminProductDict } from '../../../lib/i18n/dict/admin-product';
import type { Lang } from '../../../lib/i18n/types';

const COLORS = ['#7367f0', '#00bad1', '#28c76f', '#ff9f43', '#ff4c51', '#a8aaae'];

/**
 * İkon/ton dil-bağımsız veri — burada kalır. Görünen ad/açıklama
 * `admin-product.ts`'in `templateMeta`'sından gelir (dosya başı notu:
 * TERİM HİZASI kanıtı orada). `templateId` model tarafında düz `string`
 * olduğu için (sabit bir literal union değil) dinamik anahtarla okunur —
 * `noUncheckedIndexedAccess` yüzünden her iki taraf da `?? fallback` alır.
 */
const TEMPLATE_LOOKS: Record<string, { icon: string; tone: string }> = {
  'classic-horizontal': { icon: 'tabler-layout-sidebar-right', tone: 'primary' },
  'stacked-minimal': { icon: 'tabler-layout-rows', tone: 'info' },
  'card-bordered': { icon: 'tabler-border-all', tone: 'warning' },
  'divider-columns': { icon: 'tabler-layout-sidebar', tone: 'primary' },
  'photo-first': { icon: 'tabler-user-circle', tone: 'info' },
  'cta-banner': { icon: 'tabler-rectangle', tone: 'warning' },
};

function templateDisplay(t: AdminProductDict, id: string) {
  const text = t.templateMeta[id];
  const look = TEMPLATE_LOOKS[id] ?? { icon: 'tabler-template', tone: 'secondary' };
  return { name: text?.name ?? id, copy: text?.copy ?? t.templateFallbackCopy, icon: look.icon, tone: look.tone };
}

const EVENT_LOOKS: Record<string, { icon: string; tone: string }> = {
  'sender.published': { icon: 'tabler-broadcast', tone: 'success' },
  'sender.deactivated': { icon: 'tabler-user-off', tone: 'danger' },
  'export.zip': { icon: 'tabler-file-zip', tone: 'primary' },
  'brand.saved': { icon: 'tabler-palette', tone: 'info' },
};

function eventMeta(t: AdminProductDict, type: string) {
  const look = EVENT_LOOKS[type] ?? { icon: 'tabler-activity', tone: 'secondary' };
  return { label: t.eventMeta[type] ?? type, icon: look.icon, tone: look.tone };
}

const PRODUCT_WORKBENCHES = [
  { route: 'activation', icon: 'tabler-filter', tone: 'primary' },
  { route: 'builder', icon: 'tabler-pencil-code', tone: 'info' },
  { route: 'exports', icon: 'tabler-file-export', tone: 'success' },
  { route: 'templates', icon: 'tabler-template', tone: 'warning' },
  { route: 'cohorts', icon: 'tabler-calendar-stats', tone: 'danger' },
] as const;

function PreviewBadge({ preview, t }: { preview?: boolean; t: AdminProductDict }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />{t.previewBadge}</span> : null;
}

function ProductSource({ preview, body, t }: { preview?: boolean; body: string; t: AdminProductDict }) {
  return <SourceNotice title={preview ? t.source.demonstrationTitle : t.source.title} body={preview ? `${t.source.previewPrefix}${body}` : body} tone={preview ? 'warning' : 'info'} icon={preview ? 'tabler-flask' : 'tabler-database'} />;
}

function EventStream({ rows, t, lang, empty }: { rows: ProductEventRow[]; t: AdminProductDict; lang: Lang; empty: string }) {
  if (!rows.length) return <div className="text-center py-8 text-body-secondary"><i className="icon-base ti tabler-activity-off icon-32px mb-3" /><p className="mb-0">{empty}</p></div>;
  return <div className="d-grid gap-1">{rows.map((row) => { const meta = eventMeta(t, row.type); return <div className="d-flex align-items-center gap-3 rounded p-3 mm-product-event" key={row.id}><span className="avatar avatar-sm flex-shrink-0"><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="flex-grow-1 min-w-0"><span className="d-block fw-medium text-heading text-truncate">{meta.label}</span><small className="text-body-secondary d-block text-truncate">{row.orgName}{row.type === 'export.zip' ? t.eventStream.detail(row.fileCount, row.senderCount) : ''}</small></span><small className="text-body-secondary text-nowrap">{formatCompactDate(row.createdAt, lang)}</small></div>; })}</div>;
}

export function ProductOverviewView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const facts = productFacts(source, now);
  const funnel = activationStages(source);
  const monthly = monthlyEventSeries(source, now, 6, lang);
  const eventTotal = monthly.map((row) => row.publishes + row.exports + row.brandChanges);
  const adoption = source.organizations.map((org) => ({ ...org, depth: Number(org.signatureCount > 0) + Number(org.activeSenderCount > 0) + Number(org.exportedSenderCount > 0) })).sort((a, b) => b.depth - a.depth || b.activeSenderCount - a.activeSenderCount).slice(0, 6);
  const productHref = (route: string) => `${preview ? '/dev/admin-preview' : '/admin'}/product/${route}`;
  const attention = [
    { label: t.overview.attention.needFirstSignature, value: source.organizations.filter((org) => org.signatureCount === 0).length, icon: 'tabler-signature-off', tone: 'warning' },
    { label: t.overview.attention.savedNotPublished, value: source.organizations.filter((org) => org.signatureCount > 0 && org.activeSenderCount === 0).length, icon: 'tabler-broadcast-off', tone: 'danger' },
    { label: t.overview.attention.liveNoExport, value: source.organizations.filter((org) => org.activeSenderCount > 0 && org.exportedSenderCount === 0).length, icon: 'tabler-file-alert', tone: 'info' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.overview.kpis.savedSignatures.label} value={String(facts.signatures)} support={t.overview.kpis.savedSignatures.support(facts.recentSignatures)} icon="tabler-signature" tone="primary" />
      <OperationsKpi label={t.overview.kpis.activeSenders.label} value={String(facts.activeSenders)} support={t.overview.kpis.activeSenders.support(facts.activeOrgs)} icon="tabler-broadcast" tone="success" />
      <OperationsKpi label={t.overview.kpis.exportCoverage.label} value={`${facts.exportCoverage}%`} support={t.overview.kpis.exportCoverage.support(facts.exportEvents)} icon="tabler-file-zip" tone="info" />
      <OperationsKpi label={t.overview.kpis.returning.label} value={`${facts.returningOrgs}/${facts.activeOrgs}`} support={t.overview.kpis.returning.support} icon="tabler-refresh" tone="warning" last />
    </OperationsKpiStrip>

    <div className="card mb-6 mm-product-shortcuts"><div className="card-body"><OperationsSectionHeader title={t.overview.workbenchesCard.title} support={t.overview.workbenchesCard.support} /><div className="mm-product-shortcuts__grid">{PRODUCT_WORKBENCHES.map((item) => { const w = t.workbenches[item.route]; return <Link className={`mm-product-shortcut mm-product-shortcut--${item.tone}`} href={productHref(item.route)} key={item.route}><span className={`avatar avatar-md flex-shrink-0 bg-label-${item.tone}`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon} icon-22px`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading">{w.label}</strong><small className="text-body-secondary d-block text-truncate">{w.support}</small></span><i className="icon-base ti tabler-arrow-up-right mm-product-shortcut__arrow" /></Link>; })}</div></div></div>

    <div className="card mb-6 mm-product-funnel-card"><div className="card-body"><OperationsSectionHeader title={t.overview.funnelCard.title} support={t.overview.funnelCard.support} action={<Link href={productHref('activation')} className="btn btn-sm btn-primary">{t.overview.funnelCard.openFunnel}<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="mm-product-funnel">{funnel.map((stage, index) => { const tone = index === funnel.length - 1 ? 'success' : index >= 3 ? 'info' : 'primary'; return <div className={`mm-product-funnel__stage mm-product-funnel__stage--${tone}`} key={stage.key}><div className="d-flex align-items-start justify-content-between gap-3"><span className="mm-product-funnel__number">0{index + 1}</span><strong className="fs-4 text-heading">{stage.value}</strong></div><h6 className="mt-4 mb-1">{stage.label}</h6><small className="text-body-secondary">{t.overview.funnelCard.ratePct(stage.rate)}</small><div className="progress mt-3"><div className={`progress-bar bg-${tone}`} style={{ width: `${stage.rate}%` }} /></div></div>; })}</div></div></div>

    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.overview.evidenceCard.title} support={t.overview.evidenceCard.support} /><BarsChart categories={monthly.map((row) => row.label)} seriesName={t.overview.evidenceCard.seriesName} data={eventTotal} color="#7367f0" height={280} /><div className="d-flex flex-wrap justify-content-center gap-4 small text-body-secondary"><span><i className="icon-base ti tabler-point-filled text-success" /> {t.overview.evidenceCard.legendPublish}</span><span><i className="icon-base ti tabler-point-filled text-primary" /> {t.overview.evidenceCard.legendExport}</span><span><i className="icon-base ti tabler-point-filled text-info" /> {t.overview.evidenceCard.legendBrand}</span></div></div></div></div>
      <div className="col-xl-4"><div className="card h-100 mm-product-attention"><div className="card-body"><OperationsSectionHeader title={t.overview.attention.title} support={t.overview.attention.support} /><div className="d-grid gap-3">{attention.map((item) => <div className={`mm-product-attention__item mm-product-attention__item--${item.tone}`} key={item.label}><span className={`avatar avatar-md flex-shrink-0`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">{t.overview.attention.caption}</small></span><strong className={`fs-4 text-${item.tone}`}>{item.value}</strong></div>)}</div><Link href={productHref('activation')} className="btn btn-label-primary w-100 mt-4">{t.overview.attention.reviewButton}<i className="icon-base ti tabler-arrow-right ms-2" /></Link></div></div></div>
    </div>

    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.overview.depthCard.title} support={t.overview.depthCard.support} action={<Link href={productHref('cohorts')} className="btn btn-sm btn-label-primary">{t.overview.depthCard.openCohorts}<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="row g-4">{adoption.map((org) => { const tone = org.depth === 3 ? 'success' : org.depth === 2 ? 'primary' : 'warning'; return <div className="col-md-6 col-xl-4" key={org.id}><div className={`mm-product-adoption-card mm-product-adoption-card--${tone}`}><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={org.name} tone={tone} /><div className="min-w-0 flex-grow-1"><h6 className="mb-0 text-truncate">{org.name}</h6><small className="text-body-secondary">{t.overview.depthCard.activeSenders(org.activeSenderCount)}</small></div><span className={`badge bg-${tone}`}>{org.depth}/3</span></div><div className="mm-product-milestones">{[t.overview.depthCard.milestoneSignature, t.overview.depthCard.milestonePublish, t.overview.depthCard.milestoneExport].map((label, index) => <span className={`mm-product-milestone ${org.depth > index ? `is-complete text-${tone}` : 'is-pending'}`} key={label}><i className={`icon-base ti ${org.depth > index ? 'tabler-circle-check-filled' : 'tabler-circle-dashed'}`} />{label}</span>)}</div><div className="progress mt-4"><div className={`progress-bar bg-${tone}`} style={{ width: `${(org.depth / 3) * 100}%` }} /></div></div></div>; })}</div></div></div>
    <ProductSource preview={preview} body={t.overview.sourceBody} t={t} />
  </>;
}

export function ActivationFunnelView({ source, preview }: { source: ProductAnalyticsSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const stages = activationStages(source);
  const biggestLoss = [...stages.slice(1)].sort((a, b) => b.loss - a.loss)[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <div className="card mb-6 overflow-hidden"><div className="card-body p-0"><div className="row g-0">{stages.map((stage, index) => <div className="col-12 col-md mm-activation-stage" key={stage.key}><div className="p-5 h-100"><div className="d-flex justify-content-between align-items-center mb-5"><span className="text-primary fw-semibold">0{index + 1}</span><i className={`icon-base ti ${['tabler-building', 'tabler-user-check', 'tabler-signature', 'tabler-broadcast', 'tabler-file-export'][index]} icon-24px text-body-secondary`} /></div><h3 className="mb-1">{stage.value}</h3><h6 className="mb-2">{stage.label}</h6><p className="text-body-secondary small mb-4">{index === 0 ? t.activation.cohortBaseline : t.activation.stepRateDropoff(stage.stepRate, stage.loss)}</p><div className="progress"><div className={`progress-bar bg-${index === stages.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div></div>)}</div></div></div>
    <div className="row g-6 mb-6">
      <div className="col-lg-5"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-filter-exclamation icon-28px" /></span></span><h5>{t.activation.biggestDrop.title}</h5><h2 className="text-warning mb-2">{t.activation.biggestDrop.value(biggestLoss?.loss ?? 0)}</h2><p className="text-body-secondary mb-5">{t.activation.biggestDrop.before}<strong>{biggestLoss?.label ?? t.activation.biggestDrop.fallbackLabel}</strong>{t.activation.biggestDrop.after}</p><div className="alert alert-warning mb-0"><small>{t.activation.biggestDrop.recommendation}</small></div></div></div></div>
      <div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.activation.byWorkspace.title} support={t.activation.byWorkspace.support} /><div className="d-grid gap-4">{source.organizations.slice().sort((a, b) => b.activeSenderCount - a.activeSenderCount).slice(0, 8).map((org) => { const value = Number(org.memberCount > 0) + Number(org.signatureCount > 0) + Number(org.activeSenderCount > 0) + Number(org.exportedSenderCount > 0); return <div key={org.id}><div className="d-flex align-items-center gap-3 mb-2"><InitialAvatar label={org.name} tone={value === 4 ? 'success' : 'primary'} /><span className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block text-truncate">{org.name}</span><small className="text-body-secondary">{t.activation.byWorkspace.milestones(value)}</small></span><strong>{Math.round((value / 4) * 100)}%</strong></div><div className="progress ms-11"><div className={`progress-bar bg-${value === 4 ? 'success' : value >= 2 ? 'primary' : 'warning'}`} style={{ width: `${(value / 4) * 100}%` }} /></div></div>; })}</div></div></div></div>
    </div>
    <ProductSource preview={preview} body={t.activation.sourceBody} t={t} />
  </>;
}

export function BuilderUsageView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const sizes = distribution(source.signatures.map((row) => row.size));
  const icons = distribution(source.signatures.map((row) => row.iconStyle));
  const assigned = source.signatures.filter((row) => row.assigned).length;
  const features = [
    { label: t.builderUsage.features.assignedToSender, value: assigned, icon: 'tabler-user-check', tone: 'primary' },
    { label: t.builderUsage.features.logoIncluded, value: source.signatures.filter((row) => row.hasLogo).length, icon: 'tabler-photo', tone: 'info' },
    { label: t.builderUsage.features.avatarIncluded, value: source.signatures.filter((row) => row.hasAvatar).length, icon: 'tabler-user-circle', tone: 'success' },
    { label: t.builderUsage.features.ctaConfigured, value: source.signatures.filter((row) => row.hasCta).length, icon: 'tabler-click', tone: 'warning' },
  ];
  const recent = source.signatures.filter((row) => now - new Date(row.updatedAt).getTime() <= 30 * 86_400_000).slice(0, 8);
  const templatesHref = `${preview ? '/dev/admin-preview' : '/admin'}/product/templates`;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.builderUsage.kpis.savedDesigns.label} value={String(source.signatures.length)} support={t.builderUsage.kpis.savedDesigns.support} icon="tabler-signature" tone="primary" />
      <OperationsKpi label={t.builderUsage.kpis.assigned.label} value={`${source.signatures.length ? Math.round((assigned / source.signatures.length) * 100) : 0}%`} support={t.builderUsage.kpis.assigned.support(assigned)} icon="tabler-user-check" tone="success" />
      <OperationsKpi label={t.builderUsage.kpis.editedIn30d.label} value={String(recent.length)} support={t.builderUsage.kpis.editedIn30d.support} icon="tabler-pencil" tone="info" />
      <OperationsKpi label={t.builderUsage.kpis.designVariants.label} value={String(new Set(source.signatures.map((row) => row.templateId)).size)} support={t.builderUsage.kpis.designVariants.support} icon="tabler-template" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.builderUsage.sizeCard.title} support={t.builderUsage.sizeCard.support} /><DonutChart labels={sizes.map((row) => row.label)} series={sizes.map((row) => row.value)} colors={COLORS} centerLabel={t.builderUsage.sizeCard.centerLabel} height={260} /></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.builderUsage.iconCard.title} support={t.builderUsage.iconCard.support} /><DonutChart labels={icons.map((row) => row.label)} series={icons.map((row) => row.value)} colors={COLORS.slice(1)} centerLabel={t.builderUsage.iconCard.centerLabel} height={260} /></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.builderUsage.featureCard.title} support={t.builderUsage.featureCard.support} /><div className="d-grid gap-5 mt-6">{features.map((feature) => { const rate = source.signatures.length ? Math.round((feature.value / source.signatures.length) * 100) : 0; return <div key={feature.label}><div className="d-flex align-items-center gap-3 mb-2"><span className={`avatar avatar-sm bg-label-${feature.tone} rounded`}><span className={`avatar-initial bg-label-${feature.tone}`}><i className={`icon-base ti ${feature.icon}`} /></span></span><span className="flex-grow-1 fw-medium text-heading">{feature.label}</span><strong>{rate}%</strong></div><div className="progress ms-11"><div className={`progress-bar bg-${feature.tone}`} style={{ width: `${rate}%` }} /></div></div>; })}</div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.builderUsage.recentCard.title} support={t.builderUsage.recentCard.support} action={<Link href={templatesHref} className="btn btn-sm btn-label-primary">{t.builderUsage.recentCard.templatePortfolio}<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="row g-4">{recent.map((row) => { const meta = templateDisplay(t, row.templateId); const tone = row.assigned ? meta.tone : 'secondary'; return <div className="col-md-6 col-xl-3" key={row.id}><div className={`mm-builder-record-card mm-builder-record-card--${tone}`}><div className="d-flex justify-content-between align-items-start gap-3 mb-5"><InitialAvatar label={row.orgName} tone={tone} /><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span></div><h6 className="text-truncate mb-1">{row.orgName}</h6><span className={`badge bg-label-${tone} mb-4`}>{row.assigned ? t.builderUsage.recentCard.assignedBadge : t.builderUsage.recentCard.draftBadge}</span><div className="mm-builder-record-card__meta"><span><i className="icon-base ti tabler-layout" />{meta.name}</span><span><i className="icon-base ti tabler-calendar-event" />{formatCompactDate(row.updatedAt, lang)}</span></div></div></div>; })}</div></div></div>
    <ProductSource preview={preview} body={t.builderUsage.sourceBody} t={t} />
  </>;
}

export function ExportsView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const facts = productFacts(source, now);
  const monthly = monthlyEventSeries(source, now, 6, lang);
  const exportEvents = source.events.filter((row) => row.type === 'export.zip');
  const active = source.senders.filter((row) => row.publishedAt && !row.deactivatedAt);
  const never = active.filter((row) => !row.lastExportedAt).length;
  const stale = active.filter((row) => row.lastExportedAt && now - new Date(row.lastExportedAt).getTime() > 90 * 86_400_000).length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.exports.kpis.recordedExports.label} value={String(facts.exportEvents)} support={t.exports.kpis.recordedExports.support} icon="tabler-file-zip" tone="primary" />
      <OperationsKpi label={t.exports.kpis.filesGenerated.label} value={String(facts.exportedFiles)} support={t.exports.kpis.filesGenerated.support} icon="tabler-files" tone="info" />
      <OperationsKpi label={t.exports.kpis.activeCoverage.label} value={`${facts.exportCoverage}%`} support={t.exports.kpis.activeCoverage.support(never)} icon="tabler-chart-donut" tone="success" />
      <OperationsKpi label={t.exports.kpis.staleExports.label} value={String(stale)} support={t.exports.kpis.staleExports.support} icon="tabler-clock-exclamation" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.exports.movementCard.title} support={t.exports.movementCard.support} /><BarsChart categories={monthly.map((row) => row.label)} seriesName={t.exports.movementCard.seriesName} data={monthly.map((row) => row.exports)} color="#00bad1" height={280} /></div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.exports.coverageCard.title} support={t.exports.coverageCard.support} /><DonutChart labels={[t.exports.coverageCard.labelExported, t.exports.coverageCard.labelNeverExported, t.exports.coverageCard.labelStale]} series={[Math.max(0, active.length - never - stale), never, stale]} colors={['#28c76f', '#ff4c51', '#ff9f43']} centerLabel={t.exports.coverageCard.centerLabel} height={280} /></div></div></div>
    </div>
    <div className="row g-6 mb-6"><div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.exports.recentEvidenceCard.title} support={t.exports.recentEvidenceCard.support} /><EventStream rows={exportEvents.slice(0, 8)} t={t} lang={lang} empty={t.eventStream.emptyDefault} /></div></div></div><div className="col-lg-5"><div className="card h-100 card-border-shadow-info"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-info"><i className="icon-base ti tabler-shield-check icon-28px" /></span></span><h5>{t.exports.boundaryCard.title}</h5><p className="text-body-secondary">{t.exports.boundaryCard.body}</p><div className="alert alert-info mb-0"><strong>{t.exports.boundaryCard.thereforeWord}</strong>{t.exports.boundaryCard.thereforeRest}</div></div></div></div></div>
    <ProductSource preview={preview} body={t.exports.sourceBody} t={t} />
  </>;
}

export function TemplatesView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const templates = templateFacts(source, now);
  const total = source.signatures.length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <div className="row g-6 mb-6">{templates.map((template, index) => { const meta = templateDisplay(t, template.label); const assignRate = template.value ? Math.round((template.assigned / template.value) * 100) : 0; return <div className="col-lg-4" key={template.label}><div className={`card h-100 card-border-shadow-${meta.tone} mm-template-card`}><div className="card-body"><div className="d-flex justify-content-between align-items-start mb-6"><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${meta.tone}`}><i className={`icon-base ti ${meta.icon} icon-28px`} /></span></span><span className="text-body-secondary fw-semibold">0{index + 1}</span></div><h4 className="mb-2">{meta.name}</h4><p className="text-body-secondary mb-6">{meta.copy}</p><div className="d-flex align-items-end justify-content-between mb-2"><div><small className="text-body-secondary">{t.templates.currentAdoption}</small><h3 className="mb-0">{template.value}</h3></div><span className={`badge bg-label-${meta.tone}`}>{t.templates.sharePct(template.share)}</span></div><div className="progress mb-5"><div className={`progress-bar bg-${meta.tone}`} style={{ width: `${template.share}%` }} /></div><div className="row g-3"><div className="col-6"><div className="rounded bg-body-secondary p-3"><small className="text-body-secondary d-block">{t.templates.assignedLabel}</small><strong>{template.assigned} · {assignRate}%</strong></div></div><div className="col-6"><div className="rounded bg-body-secondary p-3"><small className="text-body-secondary d-block">{t.templates.editedLabel}</small><strong>{template.recent}</strong></div></div></div></div></div></div>; })}</div>
    {!templates.length && <div className="card mb-6"><div className="card-body text-center py-10"><i className="icon-base ti tabler-template-off icon-36px text-body-secondary mb-4" /><h5>{t.templates.empty.title}</h5><p className="text-body-secondary mb-0">{t.templates.empty.body}</p></div></div>}
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.templates.interpretation.title} support={t.templates.interpretation.support} /><div className="row g-4"><div className="col-md-4"><div className="rounded bg-label-primary p-5 h-100"><i className="icon-base ti tabler-chart-pie icon-28px mb-4" /><h5>{t.templates.interpretation.savedDesigns.value(total)}</h5><p className="mb-0">{t.templates.interpretation.savedDesigns.body}</p></div></div><div className="col-md-4"><div className="rounded bg-label-success p-5 h-100"><i className="icon-base ti tabler-user-check icon-28px mb-4" /><h5>{t.templates.interpretation.assigned.value(source.signatures.filter((row) => row.assigned).length)}</h5><p className="mb-0">{t.templates.interpretation.assigned.body}</p></div></div><div className="col-md-4"><div className="rounded bg-label-warning p-5 h-100"><i className="icon-base ti tabler-pencil icon-28px mb-4" /><h5>{t.templates.interpretation.recentlyEdited.value(source.signatures.filter((row) => now - new Date(row.updatedAt).getTime() <= 30 * 86_400_000).length)}</h5><p className="mb-0">{t.templates.interpretation.recentlyEdited.body}</p></div></div></div></div></div>
    <ProductSource preview={preview} body={t.templates.sourceBody} t={t} />
  </>;
}

export function CohortsView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminProduct[lang];
  const rows = cohortRows(source, now, 6, lang);
  const facts = productFacts(source, now);
  const maxWorkspaces = Math.max(1, ...rows.map((row) => row.workspaces));
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.cohorts.kpis.loadedCohorts.label} value={String(rows.length)} support={t.cohorts.kpis.loadedCohorts.support} icon="tabler-calendar-stats" tone="primary" />
      <OperationsKpi label={t.cohorts.kpis.activatedOrgs.label} value={String(facts.activeOrgs)} support={t.cohorts.kpis.activatedOrgs.support} icon="tabler-broadcast" tone="success" />
      <OperationsKpi label={t.cohorts.kpis.returning.label} value={String(facts.returningOrgs)} support={t.cohorts.kpis.returning.support} icon="tabler-refresh" tone="info" />
      <OperationsKpi label={t.cohorts.kpis.eventWindow.label} value={t.cohorts.kpis.eventWindow.value} support={t.cohorts.kpis.eventWindow.support} icon="tabler-database" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.cohorts.tableCard.title} support={t.cohorts.tableCard.support} /><div className="table-responsive"><table className="table align-middle mb-0 mm-cohort-table"><thead><tr><th>{t.cohorts.tableCard.headers.cohort}</th><th>{t.cohorts.tableCard.headers.workspaces}</th><th>{t.cohorts.tableCard.headers.activated}</th><th>{t.cohorts.tableCard.headers.returning}</th><th>{t.cohorts.tableCard.headers.signal}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td className="fw-medium text-heading">{row.label}</td><td><div className="d-flex align-items-center gap-3"><span className="fw-semibold">{row.workspaces}</span><div className="progress flex-grow-1"><div className="progress-bar bg-primary" style={{ width: `${(row.workspaces / maxWorkspaces) * 100}%` }} /></div></div></td><td><span className="badge bg-label-success">{row.activated} · {row.activationRate}%</span></td><td><span className="badge bg-label-info">{row.returned} · {row.returnRate}%</span></td><td><div className="d-flex gap-1">{[20, 40, 60, 80, 100].map((cut) => <span key={cut} className={`mm-cohort-cell ${row.returnRate >= cut ? 'is-active' : ''}`} />)}</div></td></tr>)}</tbody></table></div></div></div></div><div className="col-xl-4"><div className="card h-100 card-border-shadow-primary"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-ruler-measure icon-28px" /></span></span><h5>{t.cohorts.retention.title}</h5><p className="text-body-secondary">{t.cohorts.retention.activatedIntro}<strong>{t.cohorts.retention.activatedWord}</strong>{t.cohorts.retention.activatedRest}{t.cohorts.retention.returnedIntro}<strong>{t.cohorts.retention.returnedWord}</strong>{t.cohorts.retention.returnedRest}</p><hr /><p className="small text-body-secondary mb-0">{t.cohorts.retention.footnote}</p></div></div></div></div>
    <ProductSource preview={preview} body={t.cohorts.sourceBody} t={t} />
  </>;
}

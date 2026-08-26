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

const COLORS = ['#7367f0', '#00bad1', '#28c76f', '#ff9f43', '#ff4c51', '#a8aaae'];
const TEMPLATE_META: Record<string, { name: string; icon: string; tone: string; copy: string }> = {
  'classic-horizontal': { name: 'Classic horizontal', icon: 'tabler-layout-sidebar-right', tone: 'primary', copy: 'Photo-led corporate layout with a strong horizontal information rhythm.' },
  'stacked-minimal': { name: 'Stacked minimal', icon: 'tabler-layout-rows', tone: 'info', copy: 'Compact single-column structure designed for narrow inbox surfaces.' },
  'card-bordered': { name: 'Card bordered', icon: 'tabler-border-all', tone: 'warning', copy: 'Framed identity system with a dedicated CTA and campaign-ready edge.' },
  'divider-columns': { name: 'Corporate divider', icon: 'tabler-layout-columns', tone: 'primary', copy: 'Logo left, a strong brand rule, contact on the right.' },
  'photo-first': { name: 'Photo first', icon: 'tabler-user-circle', tone: 'info', copy: 'A big round portrait leads — built for personal brands.' },
  'cta-banner': { name: 'CTA banner', icon: 'tabler-rectangle', tone: 'warning', copy: 'A full-width action bar closes the signature.' },
};

const PRODUCT_WORKBENCHES = [
  { route: 'activation', label: 'Activation', support: 'Find milestone drop-offs', icon: 'tabler-filter', tone: 'primary' },
  { route: 'builder', label: 'Builder usage', support: 'Inspect saved design state', icon: 'tabler-pencil-code', tone: 'info' },
  { route: 'exports', label: 'Exports', support: 'Review delivery evidence', icon: 'tabler-file-export', tone: 'success' },
  { route: 'templates', label: 'Templates', support: 'Compare layout adoption', icon: 'tabler-template', tone: 'warning' },
  { route: 'cohorts', label: 'Cohorts', support: 'Track operational return', icon: 'tabler-calendar-stats', tone: 'danger' },
] as const;

function PreviewBadge({ preview }: { preview?: boolean }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />Preview data</span> : null;
}

function ProductSource({ preview, body }: { preview?: boolean; body: string }) {
  return <SourceNotice title={preview ? 'Demonstration dataset' : 'Source-backed product snapshot'} body={preview ? `This preview uses representative data. ${body}` : body} tone={preview ? 'warning' : 'info'} icon={preview ? 'tabler-flask' : 'tabler-database'} />;
}

function eventMeta(type: string) {
  const map: Record<string, { label: string; icon: string; tone: string }> = {
    'sender.published': { label: 'Sender published', icon: 'tabler-broadcast', tone: 'success' },
    'sender.deactivated': { label: 'Sender deactivated', icon: 'tabler-user-off', tone: 'danger' },
    'export.zip': { label: 'Export completed', icon: 'tabler-file-zip', tone: 'primary' },
    'brand.saved': { label: 'Brand rules saved', icon: 'tabler-palette', tone: 'info' },
  };
  return map[type] ?? { label: type, icon: 'tabler-activity', tone: 'secondary' };
}

function EventStream({ rows, empty = 'No product events in the loaded window.' }: { rows: ProductEventRow[]; empty?: string }) {
  if (!rows.length) return <div className="text-center py-8 text-body-secondary"><i className="icon-base ti tabler-activity-off icon-32px mb-3" /><p className="mb-0">{empty}</p></div>;
  return <div className="d-grid gap-1">{rows.map((row) => { const meta = eventMeta(row.type); return <div className="d-flex align-items-center gap-3 rounded p-3 mm-product-event" key={row.id}><span className="avatar avatar-sm flex-shrink-0"><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span className="flex-grow-1 min-w-0"><span className="d-block fw-medium text-heading text-truncate">{meta.label}</span><small className="text-body-secondary d-block text-truncate">{row.orgName}{row.type === 'export.zip' ? ` · ${row.fileCount} files / ${row.senderCount} senders` : ''}</small></span><small className="text-body-secondary text-nowrap">{formatCompactDate(row.createdAt)}</small></div>; })}</div>;
}

export function ProductOverviewView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const facts = productFacts(source, now);
  const funnel = activationStages(source);
  const monthly = monthlyEventSeries(source, now);
  const eventTotal = monthly.map((row) => row.publishes + row.exports + row.brandChanges);
  const adoption = source.organizations.map((org) => ({ ...org, depth: Number(org.signatureCount > 0) + Number(org.activeSenderCount > 0) + Number(org.exportedSenderCount > 0) })).sort((a, b) => b.depth - a.depth || b.activeSenderCount - a.activeSenderCount).slice(0, 6);
  const productHref = (route: string) => `${preview ? '/dev/admin-preview' : '/admin'}/product/${route}`;
  const attention = [
    { label: 'Need first signature', value: source.organizations.filter((org) => org.signatureCount === 0).length, icon: 'tabler-signature-off', tone: 'warning' },
    { label: 'Saved, not published', value: source.organizations.filter((org) => org.signatureCount > 0 && org.activeSenderCount === 0).length, icon: 'tabler-broadcast-off', tone: 'danger' },
    { label: 'Live, no export evidence', value: source.organizations.filter((org) => org.activeSenderCount > 0 && org.exportedSenderCount === 0).length, icon: 'tabler-file-alert', tone: 'info' },
  ];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Saved signatures" value={String(facts.signatures)} support={`${facts.recentSignatures} updated in 30 days`} icon="tabler-signature" tone="primary" />
      <OperationsKpi label="Active senders" value={String(facts.activeSenders)} support={`${facts.activeOrgs} activated workspaces`} icon="tabler-broadcast" tone="success" />
      <OperationsKpi label="Export coverage" value={`${facts.exportCoverage}%`} support={`${facts.exportEvents} evidenced exports`} icon="tabler-file-zip" tone="info" />
      <OperationsKpi label="30-day return" value={`${facts.returningOrgs}/${facts.activeOrgs}`} support="Active orgs with recent activity" icon="tabler-refresh" tone="warning" last />
    </OperationsKpiStrip>

    <div className="card mb-6 mm-product-shortcuts"><div className="card-body"><OperationsSectionHeader title="Product workbenches" support="Move from the portfolio signal directly into the operating view." /><div className="mm-product-shortcuts__grid">{PRODUCT_WORKBENCHES.map((item) => <Link className={`mm-product-shortcut mm-product-shortcut--${item.tone}`} href={productHref(item.route)} key={item.route}><span className={`avatar avatar-md flex-shrink-0 bg-label-${item.tone}`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon} icon-22px`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary d-block text-truncate">{item.support}</small></span><i className="icon-base ti tabler-arrow-up-right mm-product-shortcut__arrow" /></Link>)}</div></div></div>

    <div className="card mb-6 mm-product-funnel-card"><div className="card-body"><OperationsSectionHeader title="Activation path" support="Workspace-level progression through observable product states." action={<Link href={productHref('activation')} className="btn btn-sm btn-primary">Open funnel<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="mm-product-funnel">{funnel.map((stage, index) => { const tone = index === funnel.length - 1 ? 'success' : index >= 3 ? 'info' : 'primary'; return <div className={`mm-product-funnel__stage mm-product-funnel__stage--${tone}`} key={stage.key}><div className="d-flex align-items-start justify-content-between gap-3"><span className="mm-product-funnel__number">0{index + 1}</span><strong className="fs-4 text-heading">{stage.value}</strong></div><h6 className="mt-4 mb-1">{stage.label}</h6><small className="text-body-secondary">{stage.rate}% of workspaces</small><div className="progress mt-3"><div className={`progress-bar bg-${tone}`} style={{ width: `${stage.rate}%` }} /></div></div>; })}</div></div></div>

    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Product evidence" support="Bounded operational events by month." /><BarsChart categories={monthly.map((row) => row.label)} seriesName="Events" data={eventTotal} color="#7367f0" height={280} /><div className="d-flex flex-wrap justify-content-center gap-4 small text-body-secondary"><span><i className="icon-base ti tabler-point-filled text-success" /> Publish</span><span><i className="icon-base ti tabler-point-filled text-primary" /> Export</span><span><i className="icon-base ti tabler-point-filled text-info" /> Brand</span></div></div></div></div>
      <div className="col-xl-4"><div className="card h-100 mm-product-attention"><div className="card-body"><OperationsSectionHeader title="Adoption queue" support="Current-state gaps that deserve a closer look." /><div className="d-grid gap-3">{attention.map((item) => <div className={`mm-product-attention__item mm-product-attention__item--${item.tone}`} key={item.label}><span className={`avatar avatar-md flex-shrink-0`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">Observable workspace state</small></span><strong className={`fs-4 text-${item.tone}`}>{item.value}</strong></div>)}</div><Link href={productHref('activation')} className="btn btn-label-primary w-100 mt-4">Review activation gaps<i className="icon-base ti tabler-arrow-right ms-2" /></Link></div></div></div>
    </div>

    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Workspace adoption depth" support="Three observable milestones: signature saved, sender live and export evidenced." action={<Link href={productHref('cohorts')} className="btn btn-sm btn-label-primary">Open cohorts<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="row g-4">{adoption.map((org) => { const tone = org.depth === 3 ? 'success' : org.depth === 2 ? 'primary' : 'warning'; return <div className="col-md-6 col-xl-4" key={org.id}><div className={`mm-product-adoption-card mm-product-adoption-card--${tone}`}><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={org.name} tone={tone} /><div className="min-w-0 flex-grow-1"><h6 className="mb-0 text-truncate">{org.name}</h6><small className="text-body-secondary">{org.activeSenderCount} active senders</small></div><span className={`badge bg-${tone}`}>{org.depth}/3</span></div><div className="mm-product-milestones">{['Signature', 'Publish', 'Export'].map((label, index) => <span className={`mm-product-milestone ${org.depth > index ? `is-complete text-${tone}` : 'is-pending'}`} key={label}><i className={`icon-base ti ${org.depth > index ? 'tabler-circle-check-filled' : 'tabler-circle-dashed'}`} />{label}</span>)}</div><div className="progress mt-4"><div className={`progress-bar bg-${tone}`} style={{ width: `${(org.depth / 3) * 100}%` }} /></div></div></div>; })}</div></div></div>
    <ProductSource preview={preview} body="Counts come from current organizations, signatures, sender publication state and recorded export/activity evidence. No session telemetry is inferred." />
  </>;
}

export function ActivationFunnelView({ source, preview }: { source: ProductAnalyticsSnapshot; preview?: boolean }) {
  const stages = activationStages(source);
  const biggestLoss = [...stages.slice(1)].sort((a, b) => b.loss - a.loss)[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <div className="card mb-6 overflow-hidden"><div className="card-body p-0"><div className="row g-0">{stages.map((stage, index) => <div className="col-12 col-md mm-activation-stage" key={stage.key}><div className="p-5 h-100"><div className="d-flex justify-content-between align-items-center mb-5"><span className="text-primary fw-semibold">0{index + 1}</span><i className={`icon-base ti ${['tabler-building', 'tabler-user-check', 'tabler-signature', 'tabler-broadcast', 'tabler-file-export'][index]} icon-24px text-body-secondary`} /></div><h3 className="mb-1">{stage.value}</h3><h6 className="mb-2">{stage.label}</h6><p className="text-body-secondary small mb-4">{index === 0 ? 'Cohort baseline' : `${stage.stepRate}% from prior step · ${stage.loss} drop-off`}</p><div className="progress"><div className={`progress-bar bg-${index === stages.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div></div>)}</div></div></div>
    <div className="row g-6 mb-6">
      <div className="col-lg-5"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-filter-exclamation icon-28px" /></span></span><h5>Largest observable drop</h5><h2 className="text-warning mb-2">{biggestLoss?.loss ?? 0} workspaces</h2><p className="text-body-secondary mb-5">Between the prior milestone and <strong>{biggestLoss?.label ?? 'the next step'}</strong>. This is a state transition gap, not a session conversion rate.</p><div className="alert alert-warning mb-0"><small>Recommended review: onboarding copy, empty states and the hand-off into this milestone.</small></div></div></div></div>
      <div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Activation by workspace" support="Current milestone completion; useful for onboarding follow-up." /><div className="d-grid gap-4">{source.organizations.slice().sort((a, b) => b.activeSenderCount - a.activeSenderCount).slice(0, 8).map((org) => { const value = Number(org.memberCount > 0) + Number(org.signatureCount > 0) + Number(org.activeSenderCount > 0) + Number(org.exportedSenderCount > 0); return <div key={org.id}><div className="d-flex align-items-center gap-3 mb-2"><InitialAvatar label={org.name} tone={value === 4 ? 'success' : 'primary'} /><span className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block text-truncate">{org.name}</span><small className="text-body-secondary">{value}/4 activation milestones</small></span><strong>{Math.round((value / 4) * 100)}%</strong></div><div className="progress ms-11"><div className={`progress-bar bg-${value === 4 ? 'success' : value >= 2 ? 'primary' : 'warning'}`} style={{ width: `${(value / 4) * 100}%` }} /></div></div>; })}</div></div></div></div>
    </div>
    <ProductSource preview={preview} body="The funnel is reconstructed from durable workspace state. Login sessions and in-builder step views are not currently instrumented." />
  </>;
}

export function BuilderUsageView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const sizes = distribution(source.signatures.map((row) => row.size));
  const icons = distribution(source.signatures.map((row) => row.iconStyle));
  const assigned = source.signatures.filter((row) => row.assigned).length;
  const features = [
    { label: 'Assigned to sender', value: assigned, icon: 'tabler-user-check', tone: 'primary' },
    { label: 'Logo included', value: source.signatures.filter((row) => row.hasLogo).length, icon: 'tabler-photo', tone: 'info' },
    { label: 'Avatar included', value: source.signatures.filter((row) => row.hasAvatar).length, icon: 'tabler-user-circle', tone: 'success' },
    { label: 'CTA configured', value: source.signatures.filter((row) => row.hasCta).length, icon: 'tabler-click', tone: 'warning' },
  ];
  const recent = source.signatures.filter((row) => now - new Date(row.updatedAt).getTime() <= 30 * 86_400_000).slice(0, 8);
  const templatesHref = `${preview ? '/dev/admin-preview' : '/admin'}/product/templates`;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Saved designs" value={String(source.signatures.length)} support="Current signature records" icon="tabler-signature" tone="primary" />
      <OperationsKpi label="Assigned" value={`${source.signatures.length ? Math.round((assigned / source.signatures.length) * 100) : 0}%`} support={`${assigned} connected to senders`} icon="tabler-user-check" tone="success" />
      <OperationsKpi label="Edited in 30d" value={String(recent.length)} support="Based on updatedAt" icon="tabler-pencil" tone="info" />
      <OperationsKpi label="Design variants" value={String(new Set(source.signatures.map((row) => row.templateId)).size)} support="Templates currently in use" icon="tabler-template" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Signature size" support="Current saved configuration." /><DonutChart labels={sizes.map((row) => row.label)} series={sizes.map((row) => row.value)} colors={COLORS} centerLabel="Designs" height={260} /></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Icon treatment" support="Filled, outline and mono usage." /><DonutChart labels={icons.map((row) => row.label)} series={icons.map((row) => row.value)} colors={COLORS.slice(1)} centerLabel="Designs" height={260} /></div></div></div>
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Feature adoption" support="Presence in saved signature documents." /><div className="d-grid gap-5 mt-6">{features.map((feature) => { const rate = source.signatures.length ? Math.round((feature.value / source.signatures.length) * 100) : 0; return <div key={feature.label}><div className="d-flex align-items-center gap-3 mb-2"><span className={`avatar avatar-sm bg-label-${feature.tone} rounded`}><span className={`avatar-initial bg-label-${feature.tone}`}><i className={`icon-base ti ${feature.icon}`} /></span></span><span className="flex-grow-1 fw-medium text-heading">{feature.label}</span><strong>{rate}%</strong></div><div className="progress ms-11"><div className={`progress-bar bg-${feature.tone}`} style={{ width: `${rate}%` }} /></div></div>; })}</div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Recently edited designs" support="Latest current-state builder records; content fields remain private." action={<Link href={templatesHref} className="btn btn-sm btn-label-primary">Template portfolio<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} /><div className="row g-4">{recent.map((row) => { const meta = TEMPLATE_META[row.templateId] ?? { name: row.templateId, icon: 'tabler-template', tone: 'secondary', copy: '' }; const tone = row.assigned ? meta.tone : 'secondary'; return <div className="col-md-6 col-xl-3" key={row.id}><div className={`mm-builder-record-card mm-builder-record-card--${tone}`}><div className="d-flex justify-content-between align-items-start gap-3 mb-5"><InitialAvatar label={row.orgName} tone={tone} /><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span></div><h6 className="text-truncate mb-1">{row.orgName}</h6><span className={`badge bg-label-${tone} mb-4`}>{row.assigned ? 'Assigned' : 'Draft'}</span><div className="mm-builder-record-card__meta"><span><i className="icon-base ti tabler-layout" />{meta.name}</span><span><i className="icon-base ti tabler-calendar-event" />{formatCompactDate(row.updatedAt)}</span></div></div></div>; })}</div></div></div>
    <ProductSource preview={preview} body="This page reads saved configuration state and update timestamps. It does not claim builder sessions, time-on-step or click analytics." />
  </>;
}

export function ExportsView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const facts = productFacts(source, now);
  const monthly = monthlyEventSeries(source, now);
  const exportEvents = source.events.filter((row) => row.type === 'export.zip');
  const active = source.senders.filter((row) => row.publishedAt && !row.deactivatedAt);
  const never = active.filter((row) => !row.lastExportedAt).length;
  const stale = active.filter((row) => row.lastExportedAt && now - new Date(row.lastExportedAt).getTime() > 90 * 86_400_000).length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Recorded exports" value={String(facts.exportEvents)} support="Within the loaded event window" icon="tabler-file-zip" tone="primary" />
      <OperationsKpi label="Files generated" value={String(facts.exportedFiles)} support="Copied from export payloads" icon="tabler-files" tone="info" />
      <OperationsKpi label="Active coverage" value={`${facts.exportCoverage}%`} support={`${never} active senders never exported`} icon="tabler-chart-donut" tone="success" />
      <OperationsKpi label="Stale exports" value={String(stale)} support="Last export more than 90d ago" icon="tabler-clock-exclamation" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Export movement" support="Completed ZIP events by month." /><BarsChart categories={monthly.map((row) => row.label)} seriesName="Exports" data={monthly.map((row) => row.exports)} color="#00bad1" height={280} /></div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Coverage position" support="Active senders by export evidence." /><DonutChart labels={['Exported', 'Never exported', 'Stale >90d']} series={[Math.max(0, active.length - never - stale), never, stale]} colors={['#28c76f', '#ff4c51', '#ff9f43']} centerLabel="Senders" height={280} /></div></div></div>
    </div>
    <div className="row g-6 mb-6"><div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Recent export evidence" support="Newest completed exports across customer workspaces." /><EventStream rows={exportEvents.slice(0, 8)} /></div></div></div><div className="col-lg-5"><div className="card h-100 card-border-shadow-info"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-info"><i className="icon-base ti tabler-shield-check icon-28px" /></span></span><h5>Delivery boundary</h5><p className="text-body-secondary">Mailmyra records that a ZIP was generated and which sender records were included. It does not currently observe installation inside Outlook, Gmail or Apple Mail.</p><div className="alert alert-info mb-0"><strong>Therefore:</strong> export coverage is evidence of file creation, not inbox installation success.</div></div></div></div></div>
    <ProductSource preview={preview} body="Export totals use immutable export.zip activity plus each active sender's lastExportedAt field. Installation and delivery telemetry are outside the current schema." />
  </>;
}

export function TemplatesView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const templates = templateFacts(source, now);
  const total = source.signatures.length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <div className="row g-6 mb-6">{templates.map((template, index) => { const meta = TEMPLATE_META[template.label] ?? { name: template.label, icon: 'tabler-template', tone: 'secondary', copy: 'Saved signature layout.' }; const assignRate = template.value ? Math.round((template.assigned / template.value) * 100) : 0; return <div className="col-lg-4" key={template.label}><div className={`card h-100 card-border-shadow-${meta.tone} mm-template-card`}><div className="card-body"><div className="d-flex justify-content-between align-items-start mb-6"><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${meta.tone}`}><i className={`icon-base ti ${meta.icon} icon-28px`} /></span></span><span className="text-body-secondary fw-semibold">0{index + 1}</span></div><h4 className="mb-2">{meta.name}</h4><p className="text-body-secondary mb-6">{meta.copy}</p><div className="d-flex align-items-end justify-content-between mb-2"><div><small className="text-body-secondary">Current adoption</small><h3 className="mb-0">{template.value}</h3></div><span className={`badge bg-label-${meta.tone}`}>{template.share}% share</span></div><div className="progress mb-5"><div className={`progress-bar bg-${meta.tone}`} style={{ width: `${template.share}%` }} /></div><div className="row g-3"><div className="col-6"><div className="rounded bg-body-secondary p-3"><small className="text-body-secondary d-block">Assigned</small><strong>{template.assigned} · {assignRate}%</strong></div></div><div className="col-6"><div className="rounded bg-body-secondary p-3"><small className="text-body-secondary d-block">Edited 30d</small><strong>{template.recent}</strong></div></div></div></div></div></div>; })}</div>
    {!templates.length && <div className="card mb-6"><div className="card-body text-center py-10"><i className="icon-base ti tabler-template-off icon-36px text-body-secondary mb-4" /><h5>No saved templates yet</h5><p className="text-body-secondary mb-0">Template adoption will appear when signatures are saved.</p></div></div>}
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Portfolio interpretation" support="Current stock, not marketing conversion." /><div className="row g-4"><div className="col-md-4"><div className="rounded bg-label-primary p-5 h-100"><i className="icon-base ti tabler-chart-pie icon-28px mb-4" /><h5>{total} saved designs</h5><p className="mb-0">The denominator for every adoption share on this page.</p></div></div><div className="col-md-4"><div className="rounded bg-label-success p-5 h-100"><i className="icon-base ti tabler-user-check icon-28px mb-4" /><h5>{source.signatures.filter((row) => row.assigned).length} assigned</h5><p className="mb-0">Designs connected to a sender identity in current state.</p></div></div><div className="col-md-4"><div className="rounded bg-label-warning p-5 h-100"><i className="icon-base ti tabler-pencil icon-28px mb-4" /><h5>{source.signatures.filter((row) => now - new Date(row.updatedAt).getTime() <= 30 * 86_400_000).length} recently edited</h5><p className="mb-0">Updated during the latest rolling 30-day window.</p></div></div></div></div></div>
    <ProductSource preview={preview} body="Template ranking is based on current saved signature records. It does not claim conversion, engagement or recipient performance." />
  </>;
}

export function CohortsView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const rows = cohortRows(source, now);
  const facts = productFacts(source, now);
  const maxWorkspaces = Math.max(1, ...rows.map((row) => row.workspaces));
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Loaded cohorts" value={String(rows.length)} support="Monthly registration cohorts" icon="tabler-calendar-stats" tone="primary" />
      <OperationsKpi label="Activated orgs" value={String(facts.activeOrgs)} support="At least one live sender" icon="tabler-broadcast" tone="success" />
      <OperationsKpi label="30-day return" value={String(facts.returningOrgs)} support="Activated orgs with recent activity" icon="tabler-refresh" tone="info" />
      <OperationsKpi label="Event window" value="12m" support="Bounded activity evidence" icon="tabler-database" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Cohort activation and return" support="Registration month compared with current activation and recent operational activity." /><div className="table-responsive"><table className="table align-middle mb-0 mm-cohort-table"><thead><tr><th>Cohort</th><th>Workspaces</th><th>Activated</th><th>30-day return</th><th>Signal</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td className="fw-medium text-heading">{row.label}</td><td><div className="d-flex align-items-center gap-3"><span className="fw-semibold">{row.workspaces}</span><div className="progress flex-grow-1"><div className="progress-bar bg-primary" style={{ width: `${(row.workspaces / maxWorkspaces) * 100}%` }} /></div></div></td><td><span className="badge bg-label-success">{row.activated} · {row.activationRate}%</span></td><td><span className="badge bg-label-info">{row.returned} · {row.returnRate}%</span></td><td><div className="d-flex gap-1">{[20, 40, 60, 80, 100].map((cut) => <span key={cut} className={`mm-cohort-cell ${row.returnRate >= cut ? 'is-active' : ''}`} />)}</div></td></tr>)}</tbody></table></div></div></div></div><div className="col-xl-4"><div className="card h-100 card-border-shadow-primary"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-ruler-measure icon-28px" /></span></span><h5>Retention definition</h5><p className="text-body-secondary">An organization is <strong>activated</strong> when it has a currently published sender. It is <strong>returned</strong> when its latest durable activity is within 30 days.</p><hr /><p className="small text-body-secondary mb-0">This operational heuristic is appropriate for support and adoption review. It is not DAU/WAU, session retention or a recipient-engagement metric.</p></div></div></div></div>
    <ProductSource preview={preview} body="Cohorts use organization creation month, current published-sender state and the latest recorded activity. Historical state changes before the activity window are not reconstructed." />
  </>;
}

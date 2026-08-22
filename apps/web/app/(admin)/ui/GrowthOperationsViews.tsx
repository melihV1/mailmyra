'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
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
} from '../growth-analytics-model';
import type { ProductAnalyticsSnapshot } from '../product-analytics-model';
import {
  formatCompactDate,
  InitialAvatar,
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';

const WORKBENCHES = [
  { route: 'acquisition', label: 'Acquisition', support: 'Durable lifecycle evidence', icon: 'tabler-route', tone: 'primary' },
  { route: 'leads', label: 'Leads', support: 'CRM connection readiness', icon: 'tabler-user-search', tone: 'success' },
  { route: 'content/pages', label: 'Pages & SEO', support: 'Published route registry', icon: 'tabler-browser-check', tone: 'info' },
  { route: 'content/media', label: 'Media library', support: 'Approved brand assets', icon: 'tabler-photo-scan', tone: 'warning' },
  { route: 'content/legal', label: 'Legal content', support: 'Publication and evidence', icon: 'tabler-scale', tone: 'danger' },
] as const;

function PreviewBadge({ preview }: { preview?: boolean }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />Preview data</span> : null;
}

function GrowthSource({ preview, body, warning }: { preview?: boolean; body: string; warning?: boolean }) {
  return <SourceNotice title={preview ? 'Demonstration dataset' : warning ? 'Source boundary' : 'Source-backed growth snapshot'} body={preview ? `This preview uses representative data. ${body}` : body} tone={preview ? 'warning' : warning ? 'warning' : 'info'} icon={preview ? 'tabler-flask' : warning ? 'tabler-plug-off' : 'tabler-database'} />;
}

function GrowthShortcuts({ preview }: { preview?: boolean }) {
  const base = preview ? '/dev/admin-preview/growth' : '/admin/growth';
  return <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Growth workbenches" support="Move directly from the portfolio signal into the relevant operating surface." /><div className="mm-growth-shortcuts">{WORKBENCHES.map((item) => <Link href={`${base}/${item.route}`} className={`mm-growth-shortcut mm-growth-shortcut--${item.tone}`} key={item.route}><span className={`avatar avatar-md`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon} icon-22px`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="d-block text-body-secondary text-truncate">{item.support}</small></span><i className="icon-base ti tabler-arrow-up-right" /></Link>)}</div></div></div>;
}

export function GrowthOverviewView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const facts = growthFacts(source, now);
  const registrations = registrationSeries(source, now);
  const lifecycle = growthLifecycle(source);
  const momentum = momentumRows(source, now).slice(0, 6);
  const recentEvents = source.events.filter((row) => now - new Date(row.createdAt).getTime() <= 30 * 86_400_000);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Workspaces" value={String(facts.organizations)} support={`${facts.recentOrganizations} created in 30 days`} icon="tabler-building-community" tone="primary" />
      <OperationsKpi label="Activated" value={`${facts.activationRate}%`} support={`${facts.activeOrganizations} with a live sender`} icon="tabler-broadcast" tone="success" />
      <OperationsKpi label="Export evidenced" value={`${facts.exportRate}%`} support={`${facts.exportOrganizations} workspaces`} icon="tabler-file-export" tone="info" />
      <OperationsKpi label="30-day signals" value={String(facts.recentSignals)} support="Durable product events" icon="tabler-pulse" tone="warning" last />
    </OperationsKpiStrip>
    <GrowthShortcuts preview={preview} />
    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Workspace creation" support="Monthly registrations from the organization record." /><BarsChart categories={registrations.map((row) => row.label)} seriesName="Workspaces" data={registrations.map((row) => row.value)} color="#7367f0" height={286} /></div></div></div>
      <div className="col-xl-4"><div className="card h-100 mm-growth-signal-card"><div className="card-body"><OperationsSectionHeader title="Signal coverage" support="What this dashboard can prove today." /><div className="d-grid gap-4">{[
        { label: 'Registration state', value: facts.organizations, icon: 'tabler-building-plus', tone: 'primary' },
        { label: 'Product milestones', value: lifecycle.filter((row) => row.value > 0).length, icon: 'tabler-route', tone: 'success' },
        { label: 'Durable events', value: recentEvents.length, icon: 'tabler-activity', tone: 'info' },
      ].map((item) => <div className="d-flex align-items-center gap-3" key={item.label}><span className="avatar"><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1"><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">Loaded source</small></span><strong className={`fs-4 text-${item.tone}`}>{item.value}</strong></div>)}</div><div className="alert alert-warning mt-5 mb-0"><small>Traffic sessions, UTM attribution and referrers are not stored, so they are intentionally absent.</small></div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Lifecycle position" support="Current workspace depth across observable product milestones." /><div className="mm-growth-lifecycle">{lifecycle.map((stage, index) => <div className="mm-growth-lifecycle__stage" key={stage.key}><div className="d-flex justify-content-between align-items-start"><span className="badge bg-label-primary">0{index + 1}</span><strong className="fs-4 text-heading">{stage.value}</strong></div><h6 className="mt-4 mb-1">{stage.label}</h6><small className="text-body-secondary">{stage.rate}% of registered workspaces</small><div className="progress mt-3"><div className={`progress-bar bg-${index === lifecycle.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div>)}</div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Workspace momentum" support="Milestone depth and recency, ranked without inventing session engagement." /><div className="row g-4">{momentum.map((org) => <div className="col-md-6 col-xl-4" key={org.id}><div className="mm-growth-momentum"><div className="d-flex align-items-center gap-3"><InitialAvatar label={org.name} tone={org.score >= 80 ? 'success' : 'primary'} /><span className="min-w-0 flex-grow-1"><strong className="d-block text-heading text-truncate">{org.name}</strong><small className="text-body-secondary">{org.milestones}/4 milestones · {org.recent === null ? 'No event' : `${org.recent}d since activity`}</small></span><span className={`badge bg-label-${org.score >= 80 ? 'success' : org.score >= 40 ? 'primary' : 'warning'}`}>{org.score}</span></div><div className="progress mt-4"><div className={`progress-bar bg-${org.score >= 80 ? 'success' : 'primary'}`} style={{ width: `${org.score}%` }} /></div></div></div>)}</div></div></div>
    <GrowthSource preview={preview} body="Counts use organization creation, current membership/signature/sender state and bounded product activity. They do not infer visits, channels or campaign attribution." />
  </>;
}

export function AcquisitionView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lifecycle = growthLifecycle(source);
  const registrations = registrationSeries(source, now, 10);
  const entitlement = ['trial', 'active', 'past_due', 'cancelled'].map((state) => source.organizations.filter((org) => org.entitlementState === state).length);
  const biggestDrop = lifecycle.slice(1).map((stage, index) => ({ ...stage, loss: (lifecycle[index]?.value ?? 0) - stage.value })).sort((a, b) => b.loss - a.loss)[0];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <div className="card mb-6 overflow-hidden"><div className="card-body p-0"><div className="mm-acquisition-path">{lifecycle.map((stage, index) => <div className="mm-acquisition-path__step" key={stage.key}><div className="d-flex justify-content-between align-items-center mb-5"><span className="text-primary fw-semibold">0{index + 1}</span><i className={`icon-base ti ${['tabler-building', 'tabler-user-check', 'tabler-signature', 'tabler-broadcast', 'tabler-file-export'][index]} icon-24px text-body-secondary`} /></div><h3 className="mb-1">{stage.value}</h3><h6 className="mb-2">{stage.label}</h6><p className="small text-body-secondary mb-4">{index === 0 ? 'Registered baseline' : `${stage.stepRate}% from prior state`}</p><div className="progress"><div className={`progress-bar bg-${index === lifecycle.length - 1 ? 'success' : 'primary'}`} style={{ width: `${stage.rate}%` }} /></div></div>)}</div></div></div>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Registration movement" support="New organization records by month." /><BarsChart categories={registrations.map((row) => row.label)} seriesName="Registered" data={registrations.map((row) => row.value)} color="#00bad1" height={295} /></div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Commercial state mix" support="Current entitlement state, not acquisition source." /><DonutChart labels={['Trial', 'Active', 'Past due', 'Cancelled']} series={entitlement} colors={['#ff9f43', '#28c76f', '#ff4c51', '#a8aaae']} centerLabel="Workspaces" height={295} /></div></div></div>
    </div>
    <div className="row g-6 mb-6"><div className="col-lg-5"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-filter-exclamation icon-28px" /></span></span><h5>Largest observable gap</h5><h2 className="text-warning mb-2">{biggestDrop?.loss ?? 0} workspaces</h2><p className="text-body-secondary mb-0">The largest durable-state loss occurs before <strong>{biggestDrop?.label ?? 'the next milestone'}</strong>. This supports onboarding review, not paid-channel optimization.</p></div></div></div><div className="col-lg-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Attribution readiness" support="Required sources for a true acquisition dashboard." /><div className="d-grid gap-3">{[
      { label: 'Landing sessions and referrers', status: 'Not connected', tone: 'danger', icon: 'tabler-world-search' },
      { label: 'UTM and campaign identity', status: 'Not connected', tone: 'danger', icon: 'tabler-tags' },
      { label: 'Workspace registrations', status: 'Live', tone: 'success', icon: 'tabler-building-plus' },
      { label: 'Product activation evidence', status: 'Live', tone: 'success', icon: 'tabler-route' },
    ].map((item) => <div className="d-flex align-items-center gap-3 rounded bg-body-secondary p-3" key={item.label}><span className={`avatar avatar-sm`}><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span className="flex-grow-1 text-heading fw-medium">{item.label}</span><span className={`badge bg-label-${item.tone}`}>{item.status}</span></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} warning body="This view deliberately starts at workspace creation. Channel, campaign, session and referrer telemetry do not exist in the current production schema." />
  </>;
}

const LEAD_META = {
  new: { label: 'New', tone: 'primary', icon: 'tabler-sparkles', step: 25 },
  qualified: { label: 'Qualified', tone: 'info', icon: 'tabler-user-check', step: 50 },
  scheduled: { label: 'Demo scheduled', tone: 'warning', icon: 'tabler-calendar-event', step: 75 },
  won: { label: 'Converted', tone: 'success', icon: 'tabler-rosette-discount-check', step: 100 },
  lost: { label: 'Lost', tone: 'danger', icon: 'tabler-mood-sad', step: 100 },
} as const;

function LeadCard({ lead, tone }: { lead: GrowthLeadRow; tone: string }) {
  const seatProgress = Math.min(100, Math.max(14, Math.round((lead.seats / 120) * 100)));
  const priority = lead.seats >= 80 ? 'High value' : lead.seats >= 40 ? 'Growth' : 'Standard';
  const priorityTone = lead.seats >= 80 ? 'warning' : lead.seats >= 40 ? 'info' : 'secondary';

  return <article className={`mm-lead-card mm-lead-card--${tone}`}>
    <div className="mm-lead-card__accent" />
    <div className="mm-lead-card__body">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-4">
        <span className={`badge bg-label-${priorityTone}`}><i className="icon-base ti tabler-bolt me-1" />{priority}</span>
        <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`More actions for ${lead.company}`}><i className="icon-base ti tabler-dots-vertical" /></button>
      </div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <InitialAvatar label={lead.company} tone={tone} />
        <div className="min-w-0 flex-grow-1">
          <h6 className="mb-1 text-truncate">{lead.company}</h6>
          <small className="text-body-secondary d-flex align-items-center gap-1 text-truncate"><i className="icon-base ti tabler-user icon-14px" />{lead.contact}</small>
        </div>
      </div>
      <div className="mm-lead-card__source mb-4">
        <span><i className="icon-base ti tabler-world-share" />Source</span>
        <strong>{lead.source}</strong>
      </div>
      <div className="mb-4">
        <div className="d-flex align-items-end justify-content-between gap-3 mb-2">
          <span className="small text-body-secondary">Potential footprint</span>
          <span className="text-heading fw-semibold">{lead.seats} <small className="fw-normal text-body-secondary">seats</small></span>
        </div>
        <div className="progress mm-lead-card__progress"><div className={`progress-bar bg-${tone}`} style={{ width: `${seatProgress}%` }} /></div>
      </div>
      <div className="mm-lead-card__next">
        <span className={`avatar avatar-sm flex-shrink-0`}><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className="icon-base ti tabler-arrow-forward-up" /></span></span>
        <span className="min-w-0"><small className="d-block text-body-secondary mb-1">Next action</small><strong className="d-block text-heading text-truncate">{lead.nextStep}</strong></span>
      </div>
      <div className="mm-lead-card__footer">
        <small className="text-body-secondary d-flex align-items-center gap-1"><i className="icon-base ti tabler-clock icon-14px" />{formatCompactDate(lead.createdAt)}</small>
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`Add note for ${lead.company}`}><i className="icon-base ti tabler-message-circle" /></button>
          <button className={`btn btn-sm btn-icon btn-label-${tone} rounded-pill`} type="button" aria-label={`Open ${lead.company}`}><i className="icon-base ti tabler-arrow-up-right" /></button>
        </div>
      </div>
    </div>
  </article>;
}

export function LeadsView({ rows, preview }: { rows: GrowthLeadRow[]; preview?: boolean }) {
  const groups = groupLeads(rows);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    {rows.length ? <>
      <OperationsKpiStrip>{groups.map((group, index) => { const meta = LEAD_META[group.stage]; return <OperationsKpi key={group.stage} label={meta.label} value={String(group.rows.length)} support={`${group.rows.reduce((sum, row) => sum + row.seats, 0)} potential seats`} icon={meta.icon} tone={meta.tone} last={index === groups.length - 1} />; })}</OperationsKpiStrip>
      <div className="mm-lead-board mb-6">{groups.map((group) => { const meta = LEAD_META[group.stage]; const seats = group.rows.reduce((sum, row) => sum + row.seats, 0); return <section className={`mm-lead-column mm-lead-column--${meta.tone}`} key={group.stage}><header className="mm-lead-column__header"><div className="d-flex align-items-center gap-3"><span className="avatar avatar-sm"><span className={`avatar-initial rounded bg-label-${meta.tone} text-${meta.tone}`}><i className={`icon-base ti ${meta.icon}`} /></span></span><span><span className="d-flex align-items-center gap-2"><h6 className="mb-0">{meta.label}</h6><span className={`badge rounded-pill bg-label-${meta.tone}`}>{group.rows.length}</span></span><small className="text-body-secondary">{seats} potential seats</small></span></div><button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`${meta.label} column actions`}><i className="icon-base ti tabler-dots" /></button></header><div className="mm-lead-column__progress"><span className={`bg-${meta.tone}`} style={{ width: `${meta.step}%` }} /></div><div className="d-grid gap-3">{group.rows.map((lead) => <LeadCard lead={lead} tone={meta.tone} key={lead.id} />)}</div><button className={`btn btn-sm btn-text-${meta.tone} mm-lead-column__add`} type="button"><i className="icon-base ti tabler-plus me-1" />Add lead</button></section>; })}</div>
    </> : <div className="row g-6 mb-6"><div className="col-xl-7"><div className="card h-100"><div className="card-body py-10 text-center"><span className="avatar avatar-xl mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-database-off icon-32px" /></span></span><h4>No production lead store is connected</h4><p className="text-body-secondary mx-auto mb-0" style={{ maxWidth: '42rem' }}>The current schema contains accounts, organizations and product operations, but no contact request or CRM lead entity. Showing registered customers as leads would corrupt the funnel.</p></div></div></div><div className="col-xl-5"><div className="card h-100 card-border-shadow-primary"><div className="card-body"><OperationsSectionHeader title="Connection contract" support="Minimum fields required before this workbench can go live." /><div className="d-grid gap-3">{['Lead ID and consent timestamp', 'Contact and company identity', 'Source / campaign reference', 'Pipeline stage and owner', 'Next action and outcome'].map((label, index) => <div className="d-flex align-items-center gap-3" key={label}><span className="badge rounded-pill bg-label-primary">0{index + 1}</span><span className="text-heading fw-medium">{label}</span></div>)}</div></div></div></div></div>}
    <GrowthSource preview={preview} warning={!preview} body={preview ? 'The board demonstrates the intended CRM workflow and does not represent production leads.' : 'No lead or contact-request model exists. This page remains intentionally empty until a consent-aware source is connected.'} />
  </>;
}

export function PagesSeoView({ preview }: { preview?: boolean }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => CONTENT_PAGE_REGISTRY.filter((row) => `${row.route} ${row.title} ${row.owner}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const marketing = CONTENT_PAGE_REGISTRY.filter((row) => row.kind === 'marketing').length;
  const legal = CONTENT_PAGE_REGISTRY.length - marketing;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Registered routes" value={String(CONTENT_PAGE_REGISTRY.length)} support="Source-owned public pages" icon="tabler-route" tone="primary" />
      <OperationsKpi label="Metadata titles" value={`${CONTENT_PAGE_REGISTRY.filter((row) => row.metadata).length}/${CONTENT_PAGE_REGISTRY.length}`} support="Declared in route source" icon="tabler-browser-check" tone="success" />
      <OperationsKpi label="Marketing pages" value={String(marketing)} support="Public product narrative" icon="tabler-speakerphone" tone="info" />
      <OperationsKpi label="Legal pages" value={String(legal)} support="Public policy content" icon="tabler-scale" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="mb-1">Published route registry</h5><p className="text-body-secondary mb-0">Actual App Router pages and declared metadata.</p></div><div className="input-group input-group-merge" style={{ maxWidth: '20rem' }}><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search route or owner" /></div></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Route</th><th>Page title</th><th>Owner</th><th>Index</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.route}><td><code>{row.route}</code></td><td><span className="fw-medium text-heading d-block">{row.title}</span><small className="text-body-secondary">{row.kind === 'legal' ? 'Legal content' : 'Marketing content'}</small></td><td><span className="badge bg-label-secondary">{row.owner}</span></td><td><span className={`badge bg-label-${row.indexable ? 'success' : 'warning'}`}>{row.indexable ? 'Indexable' : 'Review'}</span></td><td><Link href={row.route} target="_blank" className="btn btn-sm btn-icon btn-label-primary" aria-label={`Open ${row.route}`}><i className="icon-base ti tabler-external-link" /></Link></td></tr>)}</tbody></table></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="SEO source coverage" support="Checks that are provable from the current codebase." /><div className="d-grid gap-4">{[
      { label: 'Route title metadata', value: 100, tone: 'success' },
      { label: 'Canonical registry', value: 0, tone: 'warning' },
      { label: 'Search performance feed', value: 0, tone: 'danger' },
      { label: 'Content approval workflow', value: 0, tone: 'danger' },
    ].map((item) => <div key={item.label}><div className="d-flex justify-content-between mb-2"><span className="text-heading fw-medium">{item.label}</span><span className={`text-${item.tone} fw-semibold`}>{item.value}%</span></div><div className="progress"><div className={`progress-bar bg-${item.tone}`} style={{ width: `${item.value}%` }} /></div></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} warning body="This registry is source-backed. Search impressions, rankings, canonical validation and editorial approvals are not stored by the application and are not inferred." />
  </>;
}

export function MediaLibraryView({ preview }: { preview?: boolean }) {
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Approved brand media" support="Static assets currently shipped by the Mailmyra application." /><div className="mm-media-grid">{MEDIA_ASSET_REGISTRY.map((asset) => <article className="mm-media-card" key={asset.path}><div className={`mm-media-card__preview mm-media-card__preview--${asset.tone}`}><Image src={asset.path} alt={asset.label} width={220} height={96} className="mm-media-card__image" /></div><div className="p-4"><div className="d-flex align-items-start justify-content-between gap-3 mb-2"><h6 className="mb-0">{asset.label}</h6><span className={`badge bg-label-${asset.tone}`}>{asset.format}</span></div><p className="text-body-secondary small mb-3">{asset.purpose}</p><code className="d-block text-truncate">{asset.path}</code></div></article>)}</div></div></div></div><div className="col-xl-4"><div className="card h-100 card-border-shadow-warning"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-warning"><i className="icon-base ti tabler-photo-shield icon-28px" /></span></span><h5>Library boundary</h5><p className="text-body-secondary">This view inventories product-owned public brand files. Customer-uploaded logos, avatars and handwritten signatures remain customer data and are not surfaced as marketing media.</p><hr /><div className="d-flex justify-content-between"><span className="text-body-secondary">Approved files</span><strong>{MEDIA_ASSET_REGISTRY.length}</strong></div><div className="d-flex justify-content-between mt-3"><span className="text-body-secondary">CMS uploads</span><span className="badge bg-label-secondary">Not connected</span></div></div></div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Publishing readiness" support="Controls required for a writable media desk." /><div className="row g-4">{[
      { label: 'Public brand inventory', value: 'Live', icon: 'tabler-brand-appstore', tone: 'success' },
      { label: 'Usage ownership', value: 'Defined', icon: 'tabler-license', tone: 'primary' },
      { label: 'Editorial upload', value: 'Not connected', icon: 'tabler-cloud-upload', tone: 'warning' },
      { label: 'Approval history', value: 'Not connected', icon: 'tabler-history-toggle', tone: 'danger' },
    ].map((item) => <div className="col-sm-6 col-xl-3" key={item.label}><div className={`rounded bg-label-${item.tone} p-4 h-100`}><i className={`icon-base ti ${item.icon} icon-28px mb-4`} /><h6>{item.label}</h6><span className="fw-semibold">{item.value}</span></div></div>)}</div></div></div>
    <GrowthSource preview={preview} warning body="The application has no marketing-media CMS. The visible inventory is limited to approved public brand files and deliberately excludes customer CDN assets." />
  </>;
}

export function LegalContentView({ preview }: { preview?: boolean }) {
  const published = LEGAL_CONTENT_REGISTRY.filter((row) => row.published).length;
  const tracked = LEGAL_CONTENT_REGISTRY.filter((row) => row.acceptanceTracked).length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Registered documents" value={String(LEGAL_CONTENT_REGISTRY.length)} support="Content and evidence types" icon="tabler-file-description" tone="primary" />
      <OperationsKpi label="Published routes" value={`${published}/${LEGAL_CONTENT_REGISTRY.length}`} support="Publicly readable documents" icon="tabler-world-check" tone="success" />
      <OperationsKpi label="Acceptance types" value={String(tracked)} support="Schema-level evidence types" icon="tabler-signature" tone="info" />
      <OperationsKpi label="Missing routes" value={String(LEGAL_CONTENT_REGISTRY.length - published)} support="Requires content publication" icon="tabler-file-alert" tone="warning" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Legal publication register" support="Public route status compared with acceptance evidence capability." /><div className="mm-legal-timeline">{LEGAL_CONTENT_REGISTRY.map((item, index) => <div className="mm-legal-timeline__item" key={item.code}><div className={`mm-legal-timeline__marker bg-label-${item.published ? 'success' : 'warning'} text-${item.published ? 'success' : 'warning'}`}><span>0{index + 1}</span></div><div className="flex-grow-1 min-w-0"><div className="d-flex flex-wrap align-items-center gap-2 mb-2"><h6 className="mb-0">{item.label}</h6><span className={`badge bg-label-${item.published ? 'success' : 'warning'}`}>{item.published ? 'Published' : 'Route missing'}</span><span className={`badge bg-label-${item.acceptanceTracked ? 'info' : 'secondary'}`}>{item.acceptanceTracked ? 'Evidence type' : 'Disclosure only'}</span></div><p className="text-body-secondary mb-2">{item.support}</p>{item.route ? <Link href={item.route} target="_blank" className="small fw-medium">Open {item.route}<i className="icon-base ti tabler-external-link ms-1" /></Link> : <span className="small text-warning fw-medium">No public route registered</span>}</div></div>)}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Control model" support="What exists and what remains outside the current schema." /><div className="d-grid gap-4">{[
      { label: 'Public legal routes', support: 'Source-controlled pages', icon: 'tabler-world', tone: 'success' },
      { label: 'Acceptance evidence', support: 'Document type, version, time and IP', icon: 'tabler-shield-check', tone: 'primary' },
      { label: 'Editorial revisions', support: 'No CMS version workflow', icon: 'tabler-git-branch', tone: 'warning' },
      { label: 'Approval chain', support: 'No reviewer/sign-off model', icon: 'tabler-user-question', tone: 'danger' },
    ].map((item) => <div className="d-flex gap-3" key={item.label}><span className="avatar"><span className={`avatar-initial rounded bg-label-${item.tone} text-${item.tone}`}><i className={`icon-base ti ${item.icon}`} /></span></span><span><strong className="d-block text-heading">{item.label}</strong><small className="text-body-secondary">{item.support}</small></span></div>)}</div></div></div></div></div>
    <GrowthSource preview={preview} warning body="Publication status comes from actual routes and document types from the application schema. Legal copy revisions and approvals are source-controlled, not managed by a CMS." />
  </>;
}

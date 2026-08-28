'use client';

import Link from 'next/link';

import { fmtMoney } from '../format';
import type { QueueRow } from '../queue-model';
import { AdminAuditTimeline, type AuditEvent } from './AdminAuditTimeline';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminQueue } from './AdminQueue';
import { CommandAnalyticsCockpit, DashboardCustomizer } from './CommandCenterControls';
import { CustomerTable, type CustomerRow } from './CustomerTable';
import { RefreshButton } from './RefreshButton';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommand } from '../../../lib/i18n/dict/admin-command';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminNav } from '../../../lib/i18n/dict/admin-nav';
import type { Lang } from '../../../lib/i18n/types';

export interface CommandFinancials {
  currency: string;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  invoiceCount: number;
  paidCount: number;
  dueCount: number;
  voidCount: number;
  excludedCurrencyRows: number;
}

export interface CommandCustomerStates {
  active: number;
  trial: number;
  pastDue: number;
  cancelled: number;
}

export interface CommandAudit {
  reads24h: number;
  writes24h: number;
  events: AuditEvent[];
}

interface CommandTotals {
  activeSeats: number;
  entitledSeats: number;
  seatPct: number;
  listPriceCents: number;
  workspaceCount: number;
  activityCoverage: number;
  activityCoveragePct: number;
}

type MetaState = 'live' | 'setup' | 'connect';

/** `live`/`setup` `admin-common`dan, `connect` `admin-nav`dan gelir (Task 3/4 emsali). */
function metaStateLabel(lang: Lang, state: MetaState): string {
  if (state === 'live') return adminCommon[lang].live;
  if (state === 'setup') return adminCommon[lang].setup;
  return adminNav[lang].sourceState.connect;
}

const QUICK_ACTIONS = [
  { key: 'findCustomer', href: '/admin/orgs', icon: 'tabler-search', tone: 'primary', state: 'live' },
  { key: 'createInvoice', href: '/admin/invoices?new=1', icon: 'tabler-file-dollar', tone: 'success', state: 'live' },
  { key: 'reviewTrials', href: '/admin/customers/trials', icon: 'tabler-hourglass', tone: 'warning', state: 'live' },
  { key: 'seatExceptions', href: '/admin/revenue/seats', icon: 'tabler-users-minus', tone: 'danger', state: 'live' },
  { key: 'supportQueue', href: '/admin/support/queue', icon: 'tabler-headset', tone: 'info', state: 'setup' },
  { key: 'contentDesk', href: '/admin/growth/content/pages', icon: 'tabler-file-pencil', tone: 'warning', state: 'setup' },
  { key: 'accessAudit', href: '/admin/access', icon: 'tabler-shield-search', tone: 'danger', state: 'live' },
  { key: 'reportLibrary', href: '/admin/reports/library', icon: 'tabler-report-analytics', tone: 'secondary', state: 'setup' },
] as const;

const DATA_SOURCES = [
  { key: 'coreDatabase', state: 'live', tone: 'success' },
  { key: 'billingLedger', state: 'live', tone: 'success' },
  { key: 'productEventLayer', state: 'setup', tone: 'warning' },
  { key: 'observability', state: 'connect', tone: 'secondary' },
] as const;

const WORKSPACES = [
  { key: 'customers', icon: 'tabler-building-community', href: '/admin/orgs', state: 'live' },
  { key: 'product', icon: 'tabler-activity-heartbeat', href: '/admin/product/overview', state: 'setup' },
  { key: 'revenue', icon: 'tabler-file-dollar', href: '/admin/invoices', state: 'live' },
  { key: 'growth', icon: 'tabler-speakerphone', href: '/admin/growth/overview', state: 'setup' },
  { key: 'support', icon: 'tabler-headset', href: '/admin/support/queue', state: 'setup' },
  { key: 'platform', icon: 'tabler-server-cog', href: '/admin/platform/overview', state: 'setup' },
  { key: 'security', icon: 'tabler-shield-lock', href: '/admin/access', state: 'live' },
  { key: 'reports', icon: 'tabler-report-analytics', href: '/admin/reports/library', state: 'setup' },
] as const;

/** Current-record command center; unavailable sources stay explicit. */
export function CommandCenterView({
  queueRows,
  tableRows,
  totals,
  customerCount,
  customerStates,
  financials,
  audit,
  trialsEndingCount,
  overdueCount,
  nextTrialEnd,
  now,
}: {
  queueRows: QueueRow[];
  tableRows: CustomerRow[];
  totals: CommandTotals;
  customerCount: number;
  customerStates: CommandCustomerStates;
  financials: CommandFinancials;
  audit: CommandAudit;
  trialsEndingCount: number;
  overdueCount: number;
  nextTrialEnd: string | null;
  now: number;
}) {
  const lang = useLang();
  const t = adminCommand[lang].view;
  const queueDanger = queueRows.filter((row) => row.severity === 3).length;
  const queueWarning = queueRows.filter((row) => row.severity === 2).length;
  const collectionPct = financials.billedCents
    ? Math.min(100, (financials.collectedCents / financials.billedCents) * 100)
    : 0;
  const seatMix = [...tableRows]
    .filter((row) => row.activeSeats > 0)
    .sort((a, b) => b.activeSeats - a.activeSeats)
    .slice(0, 6);
  const customerHealth = buildCustomerHealth(tableRows);

  return (
    <section id="admin-command-center">
      <AdminPageHeader
        crumb={adminNav[lang].menu.commandCenter}
        title={adminNav[lang].menu.commandCenter}
        support={t.headerSupport}
        right={
          <>
            <DashboardCustomizer />
            <Link href="/admin/orgs" className="btn btn-label-primary">
              <i className="icon-base ti tabler-building-community me-2" aria-hidden="true" />
              {t.headerCustomersLink}
            </Link>
            <RefreshButton />
          </>
        }
      />

      <div className="card mb-6 mm-command-shortcuts" data-dashboard-section="quick-actions">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 pb-2">
          <div>
            <h5 className="card-title mb-1">{t.quickActions.title}</h5>
            <p className="card-subtitle mb-0">{t.quickActions.subtitle}</p>
          </div>
          <span className="badge bg-label-primary">{t.quickActions.badge}</span>
        </div>
        <div className="card-body pt-2">
          <div className="row g-3">
            {QUICK_ACTIONS.map((action) => {
              const text = t.quickActions.items[action.key];
              return (
                <div className="col-sm-6 col-lg-3" key={action.key}>
                  <Link
                    href={action.href}
                    className={`mm-command-shortcut mm-command-shortcut--${action.tone} d-flex align-items-center gap-3 p-3 h-100`}
                  >
                    <span className="mm-command-shortcut__icon avatar avatar-md rounded">
                      <span className="avatar-initial rounded"><i className={`icon-base ti ${action.icon} icon-24px`} aria-hidden="true" /></span>
                    </span>
                    <span className="flex-grow-1 min-w-0">
                      <span className="d-flex align-items-center gap-2">
                        <span className="d-block fw-medium text-heading text-truncate">{text.label}</span>
                        <span className={`badge mm-command-shortcut__state ${action.state === 'live' ? 'bg-label-success' : 'bg-label-secondary'}`}>{metaStateLabel(lang, action.state)}</span>
                      </span>
                      <small className="text-body-secondary d-block text-truncate">{text.detail}</small>
                    </span>
                    <i className="icon-base ti tabler-arrow-up-right mm-command-shortcut__arrow" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="overview">
        <div className="col-xl-4">
          <div className="card h-100 bg-primary text-white overflow-hidden mm-control-desk">
            <div className="card-body position-relative">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-5">
                <div>
                  <span className="badge bg-white text-primary mb-3">{t.controlDesk.eyebrow}</span>
                  <h3 className="text-white mb-2">{t.controlDesk.itemsNeedAttention(queueRows.length)}</h3>
                  <p className="mb-0 opacity-75">{t.controlDesk.support}</p>
                </div>
                <span className="avatar avatar-lg bg-white rounded">
                  <span className="avatar-initial rounded text-primary"><i className="icon-base ti tabler-command icon-28px" aria-hidden="true" /></span>
                </span>
              </div>
              <div className="d-flex gap-2 flex-wrap mb-5">
                <span className="badge bg-danger">{t.controlDesk.critical(queueDanger)}</span>
                <span className="badge bg-warning text-dark">{t.controlDesk.warning(queueWarning)}</span>
                <span className="badge bg-white text-primary">{t.controlDesk.trialsEnding(trialsEndingCount)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-2 opacity-75">
                <span>{t.controlDesk.seatUtilization}</span>
                <span>{Math.round(totals.seatPct)}%</span>
              </div>
              <div className="progress bg-white bg-opacity-25 mb-5" style={{ height: 8 }}>
                <div className={`progress-bar ${totals.activeSeats > totals.entitledSeats ? 'bg-danger' : 'bg-white'}`} style={{ width: `${Math.min(100, totals.seatPct)}%` }} />
              </div>
              <Link href="#command-action-queue" className="btn w-100 mm-control-desk__action">{t.controlDesk.openQueue}</Link>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="row g-6 h-100">
            <StatCard icon="tabler-users" tone="primary" label={t.stats.activeSeats.label} value={`${totals.activeSeats} / ${totals.entitledSeats}`} support={t.stats.activeSeats.support} progress={totals.seatPct} />
            <StatCard icon="tabler-building" tone="info" label={t.stats.billingCustomers.label} value={String(customerCount)} support={t.stats.billingCustomers.support(totals.workspaceCount)} />
            <StatCard icon="tabler-receipt-dollar" tone="primary" label={t.stats.billed.label} value={fmtMoney(financials.billedCents, financials.currency)} support={t.stats.billed.support(financials.invoiceCount)} />
            <StatCard icon="tabler-circle-check" tone="success" label={t.stats.collected.label} value={fmtMoney(financials.collectedCents, financials.currency)} support={t.stats.collected.support(Math.round(collectionPct))} progress={collectionPct} />
            <StatCard icon="tabler-clock-dollar" tone={overdueCount ? 'warning' : 'success'} label={t.stats.outstanding.label} value={fmtMoney(financials.outstandingCents, financials.currency)} support={t.stats.outstanding.support(financials.dueCount, overdueCount)} />
            <StatCard icon="tabler-activity" tone="secondary" label={t.stats.activityCoverage.label} value={`${Math.round(totals.activityCoveragePct)}%`} support={t.stats.activityCoverage.support(totals.activityCoverage, customerCount)} progress={totals.activityCoveragePct} />
          </div>
        </div>
      </div>

      <div className="mb-6" data-dashboard-section="analysis">
        <CommandAnalyticsCockpit
          customerStates={customerStates}
          financials={financials}
          activeSeats={totals.activeSeats}
          entitledSeats={totals.entitledSeats}
          workspaceCount={totals.workspaceCount}
          customerCount={customerCount}
          seatMix={{ categories: seatMix.map((row) => shortName(row.name)), data: seatMix.map((row) => row.activeSeats) }}
        />
      </div>

      <div id="command-action-queue" className="row g-6 mb-6" data-dashboard-section="operations">
        <div className="col-xl-8"><AdminQueue rows={queueRows} /></div>
        <div className="col-xl-4"><OperatingCalendar lang={lang} trialsEndingCount={trialsEndingCount} overdueCount={overdueCount} nextTrialEnd={nextTrialEnd} reads24h={audit.reads24h} /></div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="audit">
        <div className="col-xl-4"><AdminAuditTimeline events={audit.events} /></div>
        <div className="col-md-6 col-xl-4"><ApprovalCenter lang={lang} /></div>
        <div className="col-md-6 col-xl-4"><DataReadiness lang={lang} /></div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="audit">
        <div className="col-xl-4"><CustomerHealth lang={lang} health={customerHealth} total={customerCount} /></div>
        <div className="col-xl-8"><ControlPlaneLaunchpad lang={lang} /></div>
      </div>

      <div data-dashboard-section="customers">
        <CustomerTable rows={tableRows} now={now} />
      </div>
    </section>
  );
}

function StatCard({ icon, tone, label, value, support, progress }: { icon: string; tone: string; label: string; value: string; support: string; progress?: number }) {
  return (
    <div className="col-md-6 col-lg-4">
      <div className={`card card-border-shadow-${tone} h-100 mm-kpi-card`}>
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <span className={`mm-kpi-card__icon badge rounded bg-label-${tone} p-2`}>
              <i className={`icon-base ti ${icon} icon-26px`} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <small className="text-body-secondary d-block">{label}</small>
              <h4 className="mb-0 mt-1 text-truncate">{value}</h4>
            </div>
          </div>
          <small className="text-body-secondary d-block mm-kpi-card__support">{support}</small>
          {progress !== undefined && <div className="progress mt-3" style={{ height: 5 }}><div className={`progress-bar bg-${tone}`} style={{ width: `${Math.min(100, progress)}%` }} /></div>}
        </div>
      </div>
    </div>
  );
}

function OperatingCalendar({ lang, trialsEndingCount, overdueCount, nextTrialEnd, reads24h }: { lang: Lang; trialsEndingCount: number; overdueCount: number; nextTrialEnd: string | null; reads24h: number }) {
  const t = adminCommand[lang].view.operatingCalendar;
  const events = [
    { icon: 'tabler-hourglass', tone: trialsEndingCount ? 'warning' : 'success', label: t.trialReview.label, detail: trialsEndingCount ? t.trialReview.ending(trialsEndingCount, nextTrialEnd ?? t.trialReview.defaultNext) : t.trialReview.none, href: '/admin/customers/trials' },
    { icon: 'tabler-receipt-dollar', tone: overdueCount ? 'danger' : 'success', label: t.receivables.label, detail: overdueCount ? t.receivables.overdue(overdueCount) : t.receivables.none, href: '/admin/revenue/receivables' },
    { icon: 'tabler-eye-search', tone: 'info', label: t.accessReview.label, detail: t.accessReview.detail(reads24h), href: '/admin/access' },
    { icon: 'tabler-rocket', tone: 'secondary', label: t.releaseHealth.label, detail: t.releaseHealth.detail, href: '/admin/platform/releases' },
  ];
  return (
    <div className="card h-100">
      <div className="card-header"><h5 className="card-title mb-1">{t.title}</h5><p className="card-subtitle mb-0">{t.subtitle}</p></div>
      <div className="card-body pt-2"><ul className="timeline mb-0">{events.map((event) => <li className="timeline-item timeline-item-transparent" key={event.label}><span className={`timeline-point timeline-point-${event.tone}`} /><div className="timeline-event pb-4"><div className="d-flex align-items-start gap-3"><span className={`avatar avatar-sm bg-label-${event.tone} rounded`}><span className="avatar-initial rounded"><i className={`icon-base ti ${event.icon}`} aria-hidden="true" /></span></span><div className="flex-grow-1"><Link className="fw-medium text-heading" href={event.href}>{event.label}</Link><small className="text-body-secondary d-block mt-1">{event.detail}</small></div></div></div></li>)}</ul></div>
    </div>
  );
}

function ApprovalCenter({ lang }: { lang: Lang }) {
  const t = adminCommand[lang].view.approvalCenter;
  const rows = [
    { key: 'invoiceVoids', icon: 'tabler-file-x' },
    { key: 'entitlementReductions', icon: 'tabler-users-minus' },
    { key: 'legalPublishing', icon: 'tabler-gavel' },
    { key: 'productionFeatureFlags', icon: 'tabler-toggle-right' },
  ] as const;
  return (
    <div className="card h-100"><div className="card-header d-flex align-items-start justify-content-between gap-3"><div><h5 className="card-title mb-1">{t.title}</h5><p className="card-subtitle mb-0">{t.subtitle}</p></div><span className="badge bg-label-warning">{adminCommon[lang].setup}</span></div><div className="card-body pt-2">{rows.map((row) => <div className="d-flex align-items-center gap-3 py-3 border-bottom" key={row.key}><span className="avatar avatar-sm bg-label-warning rounded"><span className="avatar-initial rounded"><i className={`icon-base ti ${row.icon}`} aria-hidden="true" /></span></span><span className="flex-grow-1 fw-medium text-heading">{t.items[row.key]}</span><span className="badge bg-label-secondary">{t.modelBadge}</span></div>)}<Link href="/admin/security/approvals" className="btn btn-label-warning w-100 mt-4">{t.action}</Link></div></div>
  );
}

function DataReadiness({ lang }: { lang: Lang }) {
  const t = adminCommand[lang].view.dataReadiness;
  return (
    <div className="card h-100"><div className="card-header"><h5 className="card-title mb-1">{t.title}</h5><p className="card-subtitle mb-0">{t.subtitle}</p></div><div className="card-body pt-2">{DATA_SOURCES.map((source) => <div className="d-flex align-items-center gap-3 py-3 border-bottom" key={source.key}><span className={`avatar avatar-sm bg-label-${source.tone} rounded`}><span className="avatar-initial rounded"><i className="icon-base ti tabler-database" aria-hidden="true" /></span></span><span className="flex-grow-1"><span className="fw-medium text-heading d-block">{t.items[source.key].label}</span><small className="text-body-secondary">{t.items[source.key].detail}</small></span><span className={`badge bg-label-${source.tone}`}>{metaStateLabel(lang, source.state)}</span></div>)}<Link href="/admin/reports/definitions" className="btn btn-label-primary w-100 mt-4">{t.action}</Link></div></div>
  );
}

function CustomerHealth({ lang, health, total }: { lang: Lang; health: { healthy: number; watch: number; risk: number }; total: number }) {
  const t = adminCommand[lang].view.customerHealth;
  const pct = (value: number) => total ? (value / total) * 100 : 0;
  return (
    <div className="card h-100"><div className="card-header"><h5 className="card-title mb-1">{t.title}</h5><p className="card-subtitle mb-0">{t.subtitle}</p></div><div className="card-body"><div className="d-flex justify-content-around text-center mb-5"><HealthFact label={t.healthy} value={health.healthy} tone="success" /><HealthFact label={t.watch} value={health.watch} tone="warning" /><HealthFact label={t.risk} value={health.risk} tone="danger" /></div><div className="progress mb-4" style={{ height: 12 }}><div className="progress-bar bg-success" style={{ width: `${pct(health.healthy)}%` }} /><div className="progress-bar bg-warning" style={{ width: `${pct(health.watch)}%` }} /><div className="progress-bar bg-danger" style={{ width: `${pct(health.risk)}%` }} /></div><ul className="list-unstyled small text-body-secondary mb-0"><li className="mb-2"><i className="icon-base ti tabler-check text-success me-2" />{t.facts.activityPresent}</li><li className="mb-2"><i className="icon-base ti tabler-check text-success me-2" />{t.facts.withinEntitlement}</li><li><i className="icon-base ti tabler-check text-success me-2" />{t.facts.commercialStateVisible}</li></ul></div></div>
  );
}

function ControlPlaneLaunchpad({ lang }: { lang: Lang }) {
  const t = adminCommand[lang].view.controlPlaneLaunchpad;
  return (
    <div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="card-title mb-1">{t.title}</h5><p className="card-subtitle mb-0">{t.subtitle}</p></div><span className="badge bg-label-primary">{t.badge}</span></div><div className="card-body pt-2"><div className="row g-3">{WORKSPACES.map((workspace) => <div className="col-sm-6 col-lg-3" key={workspace.key}><Link href={workspace.href} className="d-flex align-items-center gap-3 p-3 rounded bg-lighter h-100"><span className="avatar avatar-sm"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${workspace.icon}`} aria-hidden="true" /></span></span><span className="flex-grow-1 min-w-0"><span className="d-flex align-items-center gap-2"><span className="d-block fw-medium text-heading text-truncate">{t.items[workspace.key].label}</span><small className={workspace.state === 'live' ? 'text-success' : 'text-body-secondary'}>{metaStateLabel(lang, workspace.state)}</small></span><small className="text-body-secondary text-truncate d-block">{t.items[workspace.key].support}</small></span></Link></div>)}</div></div></div>
  );
}

function HealthFact({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><span className={`avatar avatar-md bg-label-${tone} rounded-circle mb-2`}><span className="avatar-initial rounded-circle fw-semibold">{value}</span></span><small className="d-block text-body-secondary">{label}</small></div>;
}

function buildCustomerHealth(rows: CustomerRow[]) {
  return rows.reduce((result, row) => {
    if (row.activeSeats > row.entitledSeats || row.entitlementState === 'past_due' || row.entitlementState === 'cancelled') result.risk += 1;
    else if (row.entitlementState === 'trial' || row.lastActivityAt === null || row.activeSeats === 0) result.watch += 1;
    else result.healthy += 1;
    return result;
  }, { healthy: 0, watch: 0, risk: 0 });
}

function shortName(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0]} ${words[1]}` : name;
}

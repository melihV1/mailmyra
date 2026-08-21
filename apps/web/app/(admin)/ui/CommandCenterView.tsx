import Link from 'next/link';

import { fmtMoney } from '../format';
import type { QueueRow } from '../queue-model';
import { AdminAuditTimeline, type AuditEvent } from './AdminAuditTimeline';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminQueue } from './AdminQueue';
import { CommandAnalyticsCockpit, DashboardCustomizer } from './CommandCenterControls';
import { CustomerTable, type CustomerRow } from './CustomerTable';
import { RefreshButton } from './RefreshButton';

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

const QUICK_ACTIONS = [
  { label: 'Find customer', detail: 'Organizations and users', href: '/admin/orgs', icon: 'tabler-search', tone: 'primary', state: 'Live' },
  { label: 'Create invoice', detail: 'Manual billing record', href: '/admin/invoices?new=1', icon: 'tabler-file-dollar', tone: 'success', state: 'Live' },
  { label: 'Review trials', detail: 'Ending and expired', href: '/admin/customers/trials', icon: 'tabler-hourglass', tone: 'warning', state: 'Live' },
  { label: 'Seat exceptions', detail: 'Active over entitled', href: '/admin/revenue/seats', icon: 'tabler-users-minus', tone: 'danger', state: 'Live' },
  { label: 'Support queue', detail: 'Cases and follow-ups', href: '/admin/support/queue', icon: 'tabler-headset', tone: 'info', state: 'Setup' },
  { label: 'Content desk', detail: 'Pages and approvals', href: '/admin/growth/content/pages', icon: 'tabler-file-pencil', tone: 'warning', state: 'Setup' },
  { label: 'Access audit', detail: 'Sensitive customer reads', href: '/admin/access', icon: 'tabler-shield-search', tone: 'danger', state: 'Live' },
  { label: 'Report library', detail: 'Defined operating views', href: '/admin/reports/library', icon: 'tabler-report-analytics', tone: 'secondary', state: 'Setup' },
] as const;

const DATA_SOURCES = [
  { label: 'Core database', detail: 'Customers, seats, members', state: 'Live', tone: 'success' },
  { label: 'Billing ledger', detail: 'Invoices and payments', state: 'Live', tone: 'success' },
  { label: 'Product event layer', detail: 'Activation and exports', state: 'Setup', tone: 'warning' },
  { label: 'Observability', detail: 'Errors, jobs and uptime', state: 'Connect', tone: 'secondary' },
] as const;

const WORKSPACES = [
  { label: 'Customers', icon: 'tabler-building-community', href: '/admin/orgs', state: 'Live', support: 'Organizations, people and seats' },
  { label: 'Product', icon: 'tabler-activity-heartbeat', href: '/admin/product/overview', state: 'Setup', support: 'Activation, builder and exports' },
  { label: 'Revenue', icon: 'tabler-file-dollar', href: '/admin/invoices', state: 'Live', support: 'Invoices, collection and pricing' },
  { label: 'Growth', icon: 'tabler-speakerphone', href: '/admin/growth/overview', state: 'Setup', support: 'Acquisition, leads and content' },
  { label: 'Support', icon: 'tabler-headset', href: '/admin/support/queue', state: 'Setup', support: 'Cases, tasks and playbooks' },
  { label: 'Platform', icon: 'tabler-server-cog', href: '/admin/platform/overview', state: 'Setup', support: 'Health, jobs and releases' },
  { label: 'Security', icon: 'tabler-shield-lock', href: '/admin/access', state: 'Live', support: 'Access, actions and governance' },
  { label: 'Reports', icon: 'tabler-report-analytics', href: '/admin/reports/library', state: 'Setup', support: 'Recurring operating reports' },
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
        crumb="Command center"
        title="Command center"
        support="Run customers, revenue, product operations and governance from one source-aware workspace."
        right={
          <>
            <DashboardCustomizer />
            <Link href="/admin/orgs" className="btn btn-label-primary">
              <i className="icon-base ti tabler-building-community me-2" aria-hidden="true" />
              Customers
            </Link>
            <RefreshButton />
          </>
        }
      />

      <div className="card mb-6 mm-command-shortcuts" data-dashboard-section="quick-actions">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 pb-2">
          <div>
            <h5 className="card-title mb-1">Control shortcuts</h5>
            <p className="card-subtitle mb-0">Jump directly into the operating task, not another summary page.</p>
          </div>
          <span className="badge bg-label-primary">8 workbenches</span>
        </div>
        <div className="card-body pt-2">
          <div className="row g-3">
            {QUICK_ACTIONS.map((action) => (
              <div className="col-sm-6 col-lg-3" key={action.label}>
                <Link
                  href={action.href}
                  className={`mm-command-shortcut mm-command-shortcut--${action.tone} d-flex align-items-center gap-3 p-3 h-100`}
                >
                  <span className="mm-command-shortcut__icon avatar avatar-md rounded">
                    <span className="avatar-initial rounded"><i className={`icon-base ti ${action.icon} icon-24px`} aria-hidden="true" /></span>
                  </span>
                  <span className="flex-grow-1 min-w-0">
                    <span className="d-flex align-items-center gap-2">
                      <span className="d-block fw-medium text-heading text-truncate">{action.label}</span>
                      <span className={`badge mm-command-shortcut__state ${action.state === 'Live' ? 'bg-label-success' : 'bg-label-secondary'}`}>{action.state}</span>
                    </span>
                    <small className="text-body-secondary d-block text-truncate">{action.detail}</small>
                  </span>
                  <i className="icon-base ti tabler-arrow-up-right mm-command-shortcut__arrow" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="overview">
        <div className="col-xl-4">
          <div className="card h-100 bg-primary text-white overflow-hidden mm-control-desk">
            <div className="card-body position-relative">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-5">
                <div>
                  <span className="badge bg-white text-primary mb-3">TODAY&apos;S CONTROL DESK</span>
                  <h3 className="text-white mb-2">{queueRows.length} items need attention</h3>
                  <p className="mb-0 opacity-75">Critical exceptions lead; routine monitoring stays out of the way.</p>
                </div>
                <span className="avatar avatar-lg bg-white rounded">
                  <span className="avatar-initial rounded text-primary"><i className="icon-base ti tabler-command icon-28px" aria-hidden="true" /></span>
                </span>
              </div>
              <div className="d-flex gap-2 flex-wrap mb-5">
                <span className="badge bg-danger">{queueDanger} critical</span>
                <span className="badge bg-warning text-dark">{queueWarning} warning</span>
                <span className="badge bg-white text-primary">{trialsEndingCount} trials ending</span>
              </div>
              <div className="d-flex justify-content-between small mb-2 opacity-75">
                <span>Seat utilization</span>
                <span>{Math.round(totals.seatPct)}%</span>
              </div>
              <div className="progress bg-white bg-opacity-25 mb-5" style={{ height: 8 }}>
                <div className={`progress-bar ${totals.activeSeats > totals.entitledSeats ? 'bg-danger' : 'bg-white'}`} style={{ width: `${Math.min(100, totals.seatPct)}%` }} />
              </div>
              <Link href="#command-action-queue" className="btn w-100 mm-control-desk__action">Open action queue</Link>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="row g-6 h-100">
            <StatCard icon="tabler-users" tone="primary" label="Active seats" value={`${totals.activeSeats} / ${totals.entitledSeats}`} support="Current billing footprint" progress={totals.seatPct} />
            <StatCard icon="tabler-building" tone="info" label="Billing customers" value={String(customerCount)} support={`${totals.workspaceCount} total workspaces`} />
            <StatCard icon="tabler-receipt-dollar" tone="primary" label="Billed" value={fmtMoney(financials.billedCents, financials.currency)} support={`${financials.invoiceCount} authoritative invoices`} />
            <StatCard icon="tabler-circle-check" tone="success" label="Collected" value={fmtMoney(financials.collectedCents, financials.currency)} support={`${Math.round(collectionPct)}% of billed amount`} progress={collectionPct} />
            <StatCard icon="tabler-clock-dollar" tone={overdueCount ? 'warning' : 'success'} label="Outstanding" value={fmtMoney(financials.outstandingCents, financials.currency)} support={`${financials.dueCount} due · ${overdueCount} overdue`} />
            <StatCard icon="tabler-activity" tone="secondary" label="Activity coverage" value={`${Math.round(totals.activityCoveragePct)}%`} support={`${totals.activityCoverage}/${customerCount} roots with events`} progress={totals.activityCoveragePct} />
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
        <div className="col-xl-4"><OperatingCalendar trialsEndingCount={trialsEndingCount} overdueCount={overdueCount} nextTrialEnd={nextTrialEnd} reads24h={audit.reads24h} /></div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="audit">
        <div className="col-xl-4"><AdminAuditTimeline events={audit.events} /></div>
        <div className="col-md-6 col-xl-4"><ApprovalCenter /></div>
        <div className="col-md-6 col-xl-4"><DataReadiness /></div>
      </div>

      <div className="row g-6 mb-6" data-dashboard-section="audit">
        <div className="col-xl-4"><CustomerHealth health={customerHealth} total={customerCount} /></div>
        <div className="col-xl-8"><ControlPlaneLaunchpad /></div>
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

function OperatingCalendar({ trialsEndingCount, overdueCount, nextTrialEnd, reads24h }: { trialsEndingCount: number; overdueCount: number; nextTrialEnd: string | null; reads24h: number }) {
  const events = [
    { icon: 'tabler-hourglass', tone: trialsEndingCount ? 'warning' : 'success', label: 'Trial review', detail: trialsEndingCount ? `${trialsEndingCount} ending · next ${nextTrialEnd ?? 'this week'}` : 'No trials ending in 7 days', href: '/admin/customers/trials' },
    { icon: 'tabler-receipt-dollar', tone: overdueCount ? 'danger' : 'success', label: 'Receivables', detail: overdueCount ? `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}` : 'Nothing overdue', href: '/admin/revenue/receivables' },
    { icon: 'tabler-eye-search', tone: 'info', label: 'Access review', detail: `${reads24h} sensitive reads in 24h`, href: '/admin/access' },
    { icon: 'tabler-rocket', tone: 'secondary', label: 'Release health', detail: 'Deployment source not connected', href: '/admin/platform/releases' },
  ];
  return (
    <div className="card h-100">
      <div className="card-header"><h5 className="card-title mb-1">Operating calendar</h5><p className="card-subtitle mb-0">Deadlines and recurring control checks</p></div>
      <div className="card-body pt-2"><ul className="timeline mb-0">{events.map((event) => <li className="timeline-item timeline-item-transparent" key={event.label}><span className={`timeline-point timeline-point-${event.tone}`} /><div className="timeline-event pb-4"><div className="d-flex align-items-start gap-3"><span className={`avatar avatar-sm bg-label-${event.tone} rounded`}><span className="avatar-initial rounded"><i className={`icon-base ti ${event.icon}`} aria-hidden="true" /></span></span><div className="flex-grow-1"><Link className="fw-medium text-heading" href={event.href}>{event.label}</Link><small className="text-body-secondary d-block mt-1">{event.detail}</small></div></div></div></li>)}</ul></div>
    </div>
  );
}

function ApprovalCenter() {
  const rows = [
    { label: 'Invoice voids', icon: 'tabler-file-x' },
    { label: 'Entitlement reductions', icon: 'tabler-users-minus' },
    { label: 'Legal publishing', icon: 'tabler-gavel' },
    { label: 'Production feature flags', icon: 'tabler-toggle-right' },
  ];
  return (
    <div className="card h-100"><div className="card-header d-flex align-items-start justify-content-between gap-3"><div><h5 className="card-title mb-1">Approval center</h5><p className="card-subtitle mb-0">High-risk changes require an explicit path</p></div><span className="badge bg-label-warning">Setup</span></div><div className="card-body pt-2">{rows.map((row) => <div className="d-flex align-items-center gap-3 py-3 border-bottom" key={row.label}><span className="avatar avatar-sm bg-label-warning rounded"><span className="avatar-initial rounded"><i className={`icon-base ti ${row.icon}`} aria-hidden="true" /></span></span><span className="flex-grow-1 fw-medium text-heading">{row.label}</span><span className="badge bg-label-secondary">Model</span></div>)}<Link href="/admin/security/approvals" className="btn btn-label-warning w-100 mt-4">Design approval policies</Link></div></div>
  );
}

function DataReadiness() {
  return (
    <div className="card h-100"><div className="card-header"><h5 className="card-title mb-1">Data readiness</h5><p className="card-subtitle mb-0">Sources behind every control surface</p></div><div className="card-body pt-2">{DATA_SOURCES.map((source) => <div className="d-flex align-items-center gap-3 py-3 border-bottom" key={source.label}><span className={`avatar avatar-sm bg-label-${source.tone} rounded`}><span className="avatar-initial rounded"><i className="icon-base ti tabler-database" aria-hidden="true" /></span></span><span className="flex-grow-1"><span className="fw-medium text-heading d-block">{source.label}</span><small className="text-body-secondary">{source.detail}</small></span><span className={`badge bg-label-${source.tone}`}>{source.state}</span></div>)}<Link href="/admin/reports/definitions" className="btn btn-label-primary w-100 mt-4">Open measurement plan</Link></div></div>
  );
}

function CustomerHealth({ health, total }: { health: { healthy: number; watch: number; risk: number }; total: number }) {
  const pct = (value: number) => total ? (value / total) * 100 : 0;
  return (
    <div className="card h-100"><div className="card-header"><h5 className="card-title mb-1">Customer health</h5><p className="card-subtitle mb-0">Transparent operational signals, not a hidden score</p></div><div className="card-body"><div className="d-flex justify-content-around text-center mb-5"><HealthFact label="Healthy" value={health.healthy} tone="success" /><HealthFact label="Watch" value={health.watch} tone="warning" /><HealthFact label="Risk" value={health.risk} tone="danger" /></div><div className="progress mb-4" style={{ height: 12 }}><div className="progress-bar bg-success" style={{ width: `${pct(health.healthy)}%` }} /><div className="progress-bar bg-warning" style={{ width: `${pct(health.watch)}%` }} /><div className="progress-bar bg-danger" style={{ width: `${pct(health.risk)}%` }} /></div><ul className="list-unstyled small text-body-secondary mb-0"><li className="mb-2"><i className="icon-base ti tabler-check text-success me-2" />Activity present</li><li className="mb-2"><i className="icon-base ti tabler-check text-success me-2" />Within seat entitlement</li><li><i className="icon-base ti tabler-check text-success me-2" />Commercial state visible</li></ul></div></div>
  );
}

function ControlPlaneLaunchpad() {
  return (
    <div className="card h-100"><div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h5 className="card-title mb-1">Control plane</h5><p className="card-subtitle mb-0">Specialist workspaces keep the command center focused.</p></div><span className="badge bg-label-primary">3 live · 5 foundation</span></div><div className="card-body pt-2"><div className="row g-3">{WORKSPACES.map((workspace) => <div className="col-sm-6 col-lg-3" key={workspace.label}><Link href={workspace.href} className="d-flex align-items-center gap-3 p-3 rounded bg-lighter h-100"><span className="avatar avatar-sm"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${workspace.icon}`} aria-hidden="true" /></span></span><span className="flex-grow-1 min-w-0"><span className="d-flex align-items-center gap-2"><span className="d-block fw-medium text-heading text-truncate">{workspace.label}</span><small className={workspace.state === 'Live' ? 'text-success' : 'text-body-secondary'}>{workspace.state}</small></span><small className="text-body-secondary text-truncate d-block">{workspace.support}</small></span></Link></div>)}</div></div></div>
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

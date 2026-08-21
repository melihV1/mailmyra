import Link from 'next/link';

import { AdminPageHeader } from '../../ui/AdminPageHeader';

export const dynamic = 'force-dynamic';

const WORKSPACE: Record<string, { label: string; icon: string; source: string; first: string; guardrail: string }> = {
  customers: {
    label: 'Customers',
    icon: 'tabler-building-community',
    source: 'Organizations, memberships, entitlements and activity events',
    first: 'Unified user, trial and customer-health views',
    guardrail: 'Customer personal data reads must create StaffAccess records',
  },
  product: {
    label: 'Product',
    icon: 'tabler-activity-heartbeat',
    source: 'A versioned product-event taxonomy and server-side event collector',
    first: 'Activation, builder, preview and export funnels',
    guardrail: 'No inferred usage from mutable records; event history is append-only',
  },
  revenue: {
    label: 'Revenue',
    icon: 'tabler-currency-dollar',
    source: 'Invoice ledger, entitlement snapshots and pricing versions',
    first: 'Revenue overview, receivables and seat movement ledger',
    guardrail: 'Never sum different currencies and never delete invoices',
  },
  growth: {
    label: 'Growth & content',
    icon: 'tabler-speakerphone',
    source: 'Consent-aware web analytics, lead capture and a content registry',
    first: 'Acquisition, leads, pages, SEO and media governance',
    guardrail: 'Marketing consent and operational email purposes remain separate',
  },
  support: {
    label: 'Support',
    icon: 'tabler-headset',
    source: 'Case model, queue ownership and customer activity context',
    first: 'Support inbox, onboarding queue and reusable playbooks',
    guardrail: 'No impersonation and no customer-content editing',
  },
  platform: {
    label: 'Platform',
    icon: 'tabler-server-cog',
    source: 'Job telemetry, structured errors, delivery probes and release markers',
    first: 'Health, failures, jobs, releases and feature controls',
    guardrail: 'Operational controls require confirmation, reason and audit evidence',
  },
  security: {
    label: 'Security & governance',
    icon: 'tabler-shield-lock',
    source: 'StaffAccess, AdminAction, staff roles and approval records',
    first: 'Security overview, approvals, roles and KVKK request workflow',
    guardrail: 'Least privilege, four-eyes approval and immutable audit records',
  },
  reports: {
    label: 'Reports',
    icon: 'tabler-report-analytics',
    source: 'Versioned KPI definitions backed by named source queries',
    first: 'Report library, schedules and an auditable KPI dictionary',
    guardrail: 'Every number must expose definition, source, grain and freshness',
  },
};

export default async function WorkspaceFoundationPage({
  params,
}: {
  params: Promise<{ workspace: string[] }>;
}) {
  const { workspace } = await params;
  const group = WORKSPACE[workspace[0] ?? ''] ?? WORKSPACE.reports!;
  const pageName = humanize(workspace.at(-1) ?? group.label);

  return (
    <section>
      <AdminPageHeader
        crumb={group.label}
        title={pageName}
        support="This control-plane surface is defined and ready for its data contract."
        right={<span className="badge bg-label-warning">Foundation</span>}
      />

      <div className="alert alert-warning d-flex align-items-start gap-3 mb-6" role="status">
        <i className="icon-base ti tabler-database-cog icon-26px mt-1" aria-hidden="true" />
        <div>
          <h6 className="alert-heading mb-1">Source setup required</h6>
          <p className="mb-0">
            Navigation and governance are in place. This screen will not display generated or
            estimated metrics before its authoritative source exists.
          </p>
        </div>
      </div>

      <div className="row g-6 mb-6">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body d-flex flex-column flex-md-row align-items-md-center gap-5">
              <span className="avatar avatar-xl flex-shrink-0">
                <span className="avatar-initial rounded bg-label-primary">
                  <i className={`icon-base ti ${group.icon} icon-32px`} aria-hidden="true" />
                </span>
              </span>
              <div>
                <span className="badge bg-label-primary mb-3">{group.label} workspace</span>
                <h3 className="mb-2">Build the source before the chart.</h3>
                <p className="text-body-secondary mb-0">
                  The information architecture is stable, so implementation can progress module by
                  module without another navigation redesign.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">Readiness</h5></div>
            <div className="card-body pt-2">
              <Readiness label="Information architecture" state="Ready" tone="success" />
              <Readiness label="Access boundary" state="Ready" tone="success" />
              <Readiness label="Authoritative source" state="Required" tone="warning" />
              <Readiness label="Historical coverage" state="Unavailable" tone="secondary" />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-6">
        <FoundationCard number="01" title="Source contract" icon="tabler-database" body={group.source} />
        <FoundationCard number="02" title="First deliverable" icon="tabler-layout-dashboard" body={group.first} />
        <FoundationCard number="03" title="Control boundary" icon="tabler-shield-check" body={group.guardrail} />
      </div>

      <div className="d-flex justify-content-between align-items-center mt-6">
        <Link href="/admin" className="btn btn-label-secondary">
          <i className="icon-base ti tabler-arrow-left me-2" aria-hidden="true" />
          Command center
        </Link>
        <Link href="/admin/reports/definitions" className="btn btn-primary">
          Open measurement plan
          <i className="icon-base ti tabler-arrow-right ms-2" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function Readiness({ label, state, tone }: { label: string; state: string; tone: string }) {
  return <div className="d-flex align-items-center justify-content-between py-2"><span className="text-heading">{label}</span><span className={`badge bg-label-${tone}`}>{state}</span></div>;
}

function FoundationCard({ number, title, icon, body }: { number: string; title: string; icon: string; body: string }) {
  return <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="d-flex align-items-center justify-content-between mb-5"><span className="badge bg-label-secondary">{number}</span><span className="avatar avatar-sm"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${icon}`} aria-hidden="true" /></span></span></div><h5>{title}</h5><p className="text-body-secondary mb-0">{body}</p></div></div></div>;
}

function humanize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

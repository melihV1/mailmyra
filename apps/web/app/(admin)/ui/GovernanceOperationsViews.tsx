'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';

import type { GovernanceOverviewSnapshot } from '../governance-overview-model';
import { getRequestFacts, type ApprovalQueueRow, type DataRequestRow, type StaffAccountRow } from '../operations-model';
import { ApprovalRowActions } from './ApprovalActions';
import { KvkkRowActions } from './KvkkActions';
import { EmptyWorkbench, formatCompactDate, InitialAvatar, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { StaffDialog } from './StaffDialog';

export function SecurityOverviewView({ snapshot, preview = false }: { snapshot: GovernanceOverviewSnapshot; preview?: boolean }) {
  const connected = snapshot.controls.filter((control) => control.connected).length;
  return <>
    {preview && <div className="mb-4"><SourceNotice title="Preview control plane" body="Approval and KVKK records on this route are representative fixtures. Production reads only connected, authoritative sources." tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip>
      <OperationsKpi label="Control readiness" value={`${snapshot.readiness}%`} support={`${connected}/${snapshot.controls.length} domains connected`} icon="tabler-shield-check" tone="primary" />
      <OperationsKpi label="Sensitive reads" value={String(snapshot.sensitiveReads)} support={`${snapshot.readsToday} recorded today`} icon="tabler-eye-shield" tone="info" />
      <OperationsKpi label="Privileged writes" value={String(snapshot.adminActions)} support={`${snapshot.actionsToday} recorded today`} icon="tabler-pencil-check" tone="success" />
      <OperationsKpi label="Review queue" value={String(snapshot.riskQueue)} support="Critical decisions and overdue work" icon="tabler-alert-triangle" tone={snapshot.riskQueue ? 'warning' : 'success'} last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xxl-8">
        <div className="card h-100 mm-governance-command">
          <div className="card-body">
            <OperationsSectionHeader title="Governance control map" support="One source-aware view of who can enter, what they read, what they change and which workflows still need persistence." action={<span className="badge bg-label-primary">{connected} connected</span>} />
            <div className="mm-governance-control-grid">
              {snapshot.controls.map((control, index) => <Link className={`mm-governance-control mm-governance-control--${control.tone}`} href={control.href} key={control.id}>
                <span className="avatar avatar-md"><span className={`avatar-initial rounded bg-label-${control.tone}`}><i className={`icon-base ti ${control.icon} icon-24px`} /></span></span>
                <span className="min-w-0 flex-grow-1"><small className="text-body-secondary d-block mb-1">0{index + 1} · {control.connected ? 'Connected' : 'Source gap'}</small><strong className="text-heading d-block mb-1">{control.label}</strong><small className="text-body-secondary d-block">{control.support}</small></span>
                <span className="text-end flex-shrink-0"><strong className={`text-${control.connected ? control.tone : 'secondary'} d-block`}>{control.value}</strong><i className="icon-base ti tabler-arrow-up-right mt-2" /></span>
              </Link>)}
            </div>
          </div>
        </div>
      </div>
      <div className="col-xxl-4">
        <div className="card h-100 mm-governance-posture">
          <div className="card-body d-flex flex-column">
            <OperationsSectionHeader title="Control posture" support="Coverage, not a security certification score." />
            <div className="mm-governance-ring" style={{ '--mm-progress': `${snapshot.readiness * 3.6}deg` } as CSSProperties}><div><strong>{snapshot.readiness}%</strong><span>source coverage</span></div></div>
            <div className="d-grid gap-3 mt-auto">
              <PostureRow label="Staff identities" value={`${snapshot.staffWithLogin}/${snapshot.staffAccounts} seen`} tone="primary" />
              <PostureRow label="Read review signals" value={String(snapshot.reviewSignals)} tone={snapshot.reviewSignals ? 'warning' : 'success'} />
              <PostureRow label="Critical approvals" value={String(snapshot.criticalApprovals)} tone={snapshot.criticalApprovals ? 'danger' : 'success'} />
              <PostureRow label="Overdue KVKK" value={String(snapshot.overdueRequests)} tone={snapshot.overdueRequests ? 'danger' : 'success'} />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Recent governance activity" support="Newest reads, writes, decisions and data-rights work across the loaded sources." action={<Link href="/admin/access" className="btn btn-sm btn-label-primary">Open audit log<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} />
        {snapshot.activity.length ? <div className="mm-governance-activity">{snapshot.activity.map((row) => <div className="mm-governance-activity__row" key={row.id}><span className="avatar avatar-sm"><span className={`avatar-initial rounded-circle bg-label-${row.tone}`}><i className={`icon-base ti ${row.icon}`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="text-heading d-block text-truncate">{row.title}</strong><small className="text-body-secondary d-block text-truncate">{row.actor} · {row.subject}</small></span><small className="text-body-secondary text-nowrap">{formatCompactDate(row.createdAt)}</small></div>)}</div> : <SourceNotice title="No governance events loaded" body="Connected audit sources are available, but no records exist in the current window." tone="info" icon="tabler-history-off" />}
      </div></div></div>
      <div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Open control work" support="Move directly to the evidence or policy surface that needs attention." /><div className="list-group list-group-flush mm-governance-queue"><QueueLink href="/admin/security/approvals" icon="tabler-checkup-list" tone="warning" title="Approval decisions" value={`${snapshot.pendingApprovals} pending`} /><QueueLink href="/admin/security/data-requests" icon="tabler-shield-search" tone="danger" title="KVKK evidence" value={`${snapshot.openRequests} open`} /><QueueLink href="/admin/access" icon="tabler-eye" tone="info" title="Sensitive reads" value={`${snapshot.reviewSignals} signals`} /><QueueLink href="/admin/actions" icon="tabler-pencil-check" tone="success" title="Privileged writes" value={`${snapshot.adminActions} records`} /></div></div></div></div>
    </div>
    {!preview && snapshot.readiness < 100 && <SourceNotice title="Two governance sources are not persisted yet" body="Approval decisions and KVKK request lifecycle records require dedicated schemas, immutable events and ownership rules. The overview marks those gaps instead of manufacturing production telemetry." tone="warning" icon="tabler-database-off" />}
  </>;
}

function PostureRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="d-flex align-items-center justify-content-between gap-3"><span className="d-flex align-items-center gap-2"><span className={`badge badge-dot bg-${tone}`} /><span className="text-body-secondary">{label}</span></span><strong className="text-heading">{value}</strong></div>;
}

function QueueLink({ href, icon, tone, title, value }: { href: string; icon: string; tone: string; title: string; value: string }) {
  return <Link href={href} className="list-group-item list-group-item-action d-flex align-items-center gap-3 px-0"><span className="avatar avatar-sm"><span className={`avatar-initial rounded bg-label-${tone}`}><i className={`icon-base ti ${icon}`} /></span></span><span className="flex-grow-1"><strong className="text-heading d-block">{title}</strong><small className="text-body-secondary">{value}</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></Link>;
}

export function StaffRolesView({ rows }: { rows: StaffAccountRow[] }) {
  const active = rows.filter((row) => row.lastLoginAt).length;
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Staff accounts" value={String(rows.length)} support="Accounts behind isStaff" icon="tabler-shield-check" tone="primary" />
      <OperationsKpi label="Recorded login" value={String(active)} support="At least one login event" icon="tabler-login" tone="success" />
      <OperationsKpi label="Persisted roles" value="1" support="Single staff gate" icon="tabler-lock-access" tone="warning" />
      <OperationsKpi label="Write access" value="Limited" support="Billing and entitlement flows" icon="tabler-pencil-check" tone="info" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Staff directory" support="Read-only view of accounts currently allowed into the control plane." /><div className="row g-4">{rows.map((row) => <div className="col-md-6" key={row.id}><div className="d-flex align-items-center gap-3 rounded bg-body-secondary p-4 h-100"><InitialAvatar label={row.email} tone="primary" /><span className="flex-grow-1 min-w-0"><strong className="text-heading d-block text-truncate">{row.email}</strong><small className="text-body-secondary">Added {formatCompactDate(row.createdAt)}</small></span><span className="badge bg-label-success">Staff</span></div></div>)}</div>{rows.length === 0 && <SourceNotice title="No staff accounts" body="No account currently has the staff gate enabled." tone="warning" icon="tabler-user-off" />}</div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Current access model" support="The database has one staff flag, not granular role assignments." /><div className="timeline timeline-center mt-6"><AccessStep icon="tabler-login-2" tone="primary" title="Authenticate" body="A normal Mailmyra account signs in." /><AccessStep icon="tabler-shield-check" tone="success" title="Staff gate" body="isStaff permits the control-plane shell." /><AccessStep icon="tabler-history" tone="info" title="Audit" body="Sensitive reads and supported writes create immutable events." /></div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Capability boundary" support="What staff can do today, without implying a role engine that does not exist." /><div className="row g-4"><Capability icon="tabler-eye" tone="primary" title="Sensitive customer reads" body="Logged per organization and target scope." /><Capability icon="tabler-file-dollar" tone="success" title="Invoice operations" body="Issue, settle and void authoritative invoice records." /><Capability icon="tabler-license" tone="warning" title="Entitlement updates" body="Change seats, state and trial dates with a reason." /><Capability icon="tabler-user-cog" tone="secondary" title="Role administration" body="Not persisted yet; staff provisioning remains outside this UI." /></div></div></div>
    <SourceNotice title="Role engine not yet implemented" body="This page deliberately does not show editable permissions. Introduce persisted roles, grants and approval policy before exposing staff administration controls." tone="warning" icon="tabler-shield-exclamation" />
  </>;
}

function AccessStep({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  return <div className="timeline-item pb-5"><span className={`timeline-indicator timeline-indicator-${tone}`}><i className={`icon-base ti ${icon}`} /></span><div className="timeline-event"><h6 className="mb-1">{title}</h6><p className="text-body-secondary mb-0">{body}</p></div></div>;
}

function Capability({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  return <div className="col-md-6 col-xl-3"><div className="d-flex gap-3 h-100"><span className="avatar flex-shrink-0"><span className={`avatar-initial rounded bg-label-${tone}`}><i className={`icon-base ti ${icon}`} /></span></span><div><h6 className="mb-1">{title}</h6><small className="text-body-secondary">{body}</small></div></div></div>;
}

export function ApprovalsView({ rows, preview = false }: { rows: ApprovalQueueRow[]; preview?: boolean }) {
  const [selected, setSelected] = useState<ApprovalQueueRow | null>(null);
  const pending = rows.filter((row) => row.status === 'pending');
  const critical = pending.filter((row) => row.risk === 'critical').length;
  const complete = rows.filter((row) => row.status !== 'pending').length;
  if (!rows.length) return <><EmptyWorkbench icon="tabler-checkup-list" title="Approval workflow needs a source" body="No approval model exists in the current schema. Add approval requests, approvers, decisions and immutable decision events before this workbench can become operational." /><div className="mt-6"><SourceNotice title="No simulated approvals in production" body="The navigation remains ready, but this screen will not present invented queues or functional approve/reject controls." tone="warning" icon="tabler-database-off" /></div></>;
  const columns: Array<{ key: ApprovalQueueRow['status']; title: string; tone: string }> = [{ key: 'pending', title: 'Awaiting decision', tone: 'warning' }, { key: 'approved', title: 'Approved', tone: 'success' }, { key: 'rejected', title: 'Rejected', tone: 'danger' }];
  return <>
    {preview && <div className="mb-4"><SourceNotice title="Preview data" body="These records exist only to validate the future approval workbench layout." tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label="Pending" value={String(pending.length)} support="Awaiting a decision" icon="tabler-hourglass" tone="warning" /><OperationsKpi label="Critical" value={String(critical)} support="Highest risk requests" icon="tabler-alert-octagon" tone="danger" /><OperationsKpi label="Decided" value={String(complete)} support="Approved or rejected" icon="tabler-checks" tone="success" /><OperationsKpi label="Policy" value="2-person" support="Preview target only" icon="tabler-users-group" tone="primary" last /></OperationsKpiStrip>
    <div className="row g-6">{columns.map((column) => <div className="col-lg-4" key={column.key}><div className="card h-100"><div className="card-header d-flex align-items-center justify-content-between"><h5 className="mb-0">{column.title}</h5><span className={`badge bg-label-${column.tone}`}>{rows.filter((row) => row.status === column.key).length}</span></div><div className="card-body d-grid gap-4 align-content-start">{rows.filter((row) => row.status === column.key).map((row) => <button key={row.id} type="button" className="btn text-start p-0 border-0" onClick={() => setSelected(row)}><span className={`d-block rounded bg-label-${column.tone} p-4`}><span className="d-flex justify-content-between gap-3 mb-3"><span className={`badge bg-label-${row.risk === 'critical' ? 'danger' : row.risk === 'high' ? 'warning' : 'info'}`}>{row.risk}</span><small className="text-body-secondary">{formatCompactDate(row.requestedAt)}</small></span><strong className="text-heading d-block mb-1">{row.title}</strong><small className="text-body-secondary d-block">{row.domain} · {row.requester}</small><span className="d-flex align-items-center gap-2 mt-3"><span className="progress flex-grow-1" style={{ height: '.35rem' }}><span className={`progress-bar bg-${column.tone}`} style={{ width: `${Math.min(100, (row.approvals / row.requiredApprovals) * 100)}%` }} /></span><small>{row.approvals}/{row.requiredApprovals}</small></span></span></button>)}</div></div></div>)}</div>
    {selected && <StaffDialog title="Approval request" subtitle="Preview-only request context." labelledBy={selected.title} busy={false} onClose={() => setSelected(null)}><div className="list-group mb-6"><Row label="Request" value={selected.title} /><Row label="Domain" value={selected.domain} /><Row label="Requester" value={selected.requester} /><Row label="Customer" value={selected.customer ?? 'Platform'} /><Row label="Decision progress" value={`${selected.approvals}/${selected.requiredApprovals}`} /></div>{!preview && selected.status === 'pending' && <div className="d-flex gap-2 mb-6"><ApprovalRowActions row={selected} onDone={() => setSelected(null)} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>Close preview</button></StaffDialog>}
  </>;
}

export function DataRequestsView({ rows, now, preview = false }: { rows: DataRequestRow[]; now: number; preview?: boolean }) {
  const [selected, setSelected] = useState<DataRequestRow | null>(null);
  const facts = useMemo(() => rows.map((row) => ({ row, facts: getRequestFacts(row, now) })), [now, rows]);
  if (!rows.length) return <><EmptyWorkbench icon="tabler-shield-search" title="KVKK request register needs a source" body="The current schema has no data-subject request record, ownership, identity-check evidence or due-date workflow. Add those records before operational controls are exposed." /><div className="mt-6"><SourceNotice title="Access evidence is available separately" body="Existing staff access and admin action logs support investigations, but they are not a substitute for a formal KVKK request register." tone="info" icon="tabler-history" /></div></>;
  const open = facts.filter((item) => !item.facts.completed);
  const overdue = open.filter((item) => item.facts.overdue).length;
  const urgent = open.filter((item) => item.facts.urgent).length;
  return <>
    {preview && <div className="mb-4"><SourceNotice title="Preview data" body="These requests are illustrative and are not customer records." tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label="Open requests" value={String(open.length)} support="Active statutory work" icon="tabler-file-description" tone="primary" /><OperationsKpi label="Due in 5 days" value={String(urgent)} support="Near SLA boundary" icon="tabler-clock-exclamation" tone="warning" /><OperationsKpi label="Overdue" value={String(overdue)} support="Immediate escalation" icon="tabler-alert-triangle" tone="danger" /><OperationsKpi label="Completed" value={String(facts.length - open.length)} support="Closed with evidence" icon="tabler-circle-check" tone="success" last /></OperationsKpiStrip>
    <div className="row g-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Request register" support="SLA-first work queue with identity and evidence context." /><div className="d-grid gap-3">{facts.sort((a, b) => Date.parse(a.row.dueAt) - Date.parse(b.row.dueAt)).map(({ row, facts: request }) => { const tone = request.completed ? 'success' : request.overdue ? 'danger' : request.urgent ? 'warning' : 'primary'; return <button type="button" key={row.id} className="btn mm-request-button text-start border-0 p-0 w-100" onClick={() => setSelected(row)}><span className={`mm-request-row d-flex flex-column flex-sm-row align-items-sm-center gap-3 rounded bg-label-${tone} p-4`}><span className="d-flex align-items-center gap-3 flex-grow-1 min-w-0"><InitialAvatar label={row.subjectEmail} tone={tone} square /><span className="flex-grow-1 min-w-0"><span className="d-flex align-items-center flex-wrap gap-2"><strong className="text-heading">{row.reference}</strong><span className={`badge bg-label-${tone}`}>{row.status.replace('_', ' ')}</span></span><small className="text-body-secondary d-block text-truncate">{row.customer} · {row.type} · {row.subjectEmail}</small></span></span><span className="d-flex align-items-center justify-content-between justify-content-sm-end gap-3"><span className="text-start text-sm-end"><strong className={`text-${tone} d-block`}>{request.completed ? 'Closed' : request.overdue ? `${Math.abs(request.remainingDays)}d overdue` : `${request.remainingDays}d left`}</strong><small className="text-body-secondary">{row.evidenceCount} evidence</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></span></span></button>; })}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Statutory workflow" support="A visible evidence chain from intake to closure." /><div className="timeline mt-6"><AccessStep icon="tabler-inbox" tone="primary" title="Intake" body="Register scope and statutory clock." /><AccessStep icon="tabler-id" tone="info" title="Identity check" body="Validate the data subject safely." /><AccessStep icon="tabler-database-search" tone="warning" title="Collect evidence" body="Locate data and access history." /><AccessStep icon="tabler-scale" tone="danger" title="Legal review" body="Confirm exemptions and response." /><AccessStep icon="tabler-send" tone="success" title="Respond and close" body="Deliver securely and retain proof." /></div></div></div></div></div>
    {selected && <StaffDialog title={selected.reference} subtitle="Preview-only request detail." labelledBy={selected.reference} busy={false} onClose={() => setSelected(null)} wide><div className="row g-4 mb-6"><div className="col-sm-6"><Row label="Subject" value={selected.subjectEmail} /><Row label="Customer" value={selected.customer} /><Row label="Owner" value={selected.owner ?? 'Unassigned'} /></div><div className="col-sm-6"><Row label="Request type" value={selected.type} /><Row label="Received" value={formatCompactDate(selected.receivedAt)} /><Row label="Due" value={formatCompactDate(selected.dueAt)} /></div></div>{!preview && <div className="d-flex flex-wrap gap-2 mb-6"><KvkkRowActions row={selected} onDone={() => setSelected(null)} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>Close preview</button></StaffDialog>}
  </>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item d-flex justify-content-between gap-4"><span className="text-body-secondary">{label}</span><strong className="text-heading text-end">{value}</strong></div>;
}

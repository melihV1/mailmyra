'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';

import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminSecurity } from '../../../lib/i18n/dict/admin-security';
import { common } from '../../../lib/i18n/dict/common';
import type { GovernanceOverviewSnapshot } from '../governance-overview-model';
import { getRequestFacts, type ApprovalQueueRow, type DataRequestRow, type StaffAccountRow, type StaffChangeRequestRow } from '../operations-model';
import { ApprovalActionButtons, ApprovalActionDialog, type ApprovalAction } from './ApprovalActions';
import { KvkkActionButtons, KvkkActionDialog, type KvkkAction } from './KvkkActions';
import { EmptyWorkbench, formatCompactDate, InitialAvatar, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { ExecuteStaffChangeButton } from './StaffFlagActions';
import { StaffDialog } from './StaffDialog';

export function SecurityOverviewView({ snapshot, preview = false }: { snapshot: GovernanceOverviewSnapshot; preview?: boolean }) {
  const lang = useLang();
  const t = adminSecurity[lang];
  const connected = snapshot.controls.filter((control) => control.connected).length;
  return <>
    {preview && <div className="mb-4"><SourceNotice title={t.overview.previewNotice.title} body={t.overview.previewNotice.body} tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip>
      <OperationsKpi label={t.overview.kpis.controlReadiness.label} value={`${snapshot.readiness}%`} support={t.overview.kpis.controlReadiness.support(connected, snapshot.controls.length)} icon="tabler-shield-check" tone="primary" />
      <OperationsKpi label={t.overview.kpis.sensitiveReads.label} value={String(snapshot.sensitiveReads)} support={t.overview.kpis.sensitiveReads.support(snapshot.readsToday)} icon="tabler-eye-shield" tone="info" />
      <OperationsKpi label={t.overview.kpis.privilegedWrites.label} value={String(snapshot.adminActions)} support={t.overview.kpis.privilegedWrites.support(snapshot.actionsToday)} icon="tabler-pencil-check" tone="success" />
      <OperationsKpi label={t.overview.kpis.reviewQueue.label} value={String(snapshot.riskQueue)} support={t.overview.kpis.reviewQueue.support} icon="tabler-alert-triangle" tone={snapshot.riskQueue ? 'warning' : 'success'} last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xxl-8">
        <div className="card h-100 mm-governance-command">
          <div className="card-body">
            <OperationsSectionHeader title={t.overview.controlMap.title} support={t.overview.controlMap.support} action={<span className="badge bg-label-primary">{t.overview.controlMap.connectedBadge(connected)}</span>} />
            <div className="mm-governance-control-grid">
              {snapshot.controls.map((control, index) => <Link className={`mm-governance-control mm-governance-control--${control.tone}`} href={control.href} key={control.id}>
                <span className="avatar avatar-md"><span className={`avatar-initial rounded bg-label-${control.tone}`}><i className={`icon-base ti ${control.icon} icon-24px`} /></span></span>
                <span className="min-w-0 flex-grow-1"><small className="text-body-secondary d-block mb-1">0{index + 1} · {control.connected ? t.overview.controlMap.connected : t.overview.controlMap.sourceGap}</small><strong className="text-heading d-block mb-1">{control.label}</strong><small className="text-body-secondary d-block">{control.support}</small></span>
                <span className="text-end flex-shrink-0"><strong className={`text-${control.connected ? control.tone : 'secondary'} d-block`}>{control.value}</strong><i className="icon-base ti tabler-arrow-up-right mt-2" /></span>
              </Link>)}
            </div>
          </div>
        </div>
      </div>
      <div className="col-xxl-4">
        <div className="card h-100 mm-governance-posture">
          <div className="card-body d-flex flex-column">
            <OperationsSectionHeader title={t.overview.posture.title} support={t.overview.posture.support} />
            <div className="mm-governance-ring" style={{ '--mm-progress': `${snapshot.readiness * 3.6}deg` } as CSSProperties}><div><strong>{snapshot.readiness}%</strong><span>{t.overview.posture.sourceCoverage}</span></div></div>
            <div className="d-grid gap-3 mt-auto">
              <PostureRow label={t.overview.posture.staffIdentities} value={t.overview.posture.seenValue(snapshot.staffWithLogin, snapshot.staffAccounts)} tone="primary" />
              <PostureRow label={t.overview.posture.readReviewSignals} value={String(snapshot.reviewSignals)} tone={snapshot.reviewSignals ? 'warning' : 'success'} />
              <PostureRow label={t.overview.posture.criticalApprovals} value={String(snapshot.criticalApprovals)} tone={snapshot.criticalApprovals ? 'danger' : 'success'} />
              <PostureRow label={t.overview.posture.overdueKvkk} value={String(snapshot.overdueRequests)} tone={snapshot.overdueRequests ? 'danger' : 'success'} />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.overview.activity.title} support={t.overview.activity.support} action={<Link href="/admin/access" className="btn btn-sm btn-label-primary">{t.overview.activity.openAuditLog}<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} />
        {snapshot.activity.length ? <div className="mm-governance-activity">{snapshot.activity.map((row) => <div className="mm-governance-activity__row" key={row.id}><span className="avatar avatar-sm"><span className={`avatar-initial rounded-circle bg-label-${row.tone}`}><i className={`icon-base ti ${row.icon}`} /></span></span><span className="min-w-0 flex-grow-1"><strong className="text-heading d-block text-truncate">{row.title}</strong><small className="text-body-secondary d-block text-truncate">{row.actor} · {row.subject}</small></span><small className="text-body-secondary text-nowrap">{formatCompactDate(row.createdAt, lang)}</small></div>)}</div> : <SourceNotice title={t.overview.activity.empty.title} body={t.overview.activity.empty.body} tone="info" icon="tabler-history-off" />}
      </div></div></div>
      <div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.overview.queue.title} support={t.overview.queue.support} /><div className="list-group list-group-flush mm-governance-queue"><QueueLink href="/admin/security/approvals" icon="tabler-checkup-list" tone="warning" title={t.overview.queue.approvalDecisions} value={t.overview.queue.pendingValue(snapshot.pendingApprovals)} /><QueueLink href="/admin/security/data-requests" icon="tabler-shield-search" tone="danger" title={t.overview.queue.kvkkEvidence} value={t.overview.queue.openValue(snapshot.openRequests)} /><QueueLink href="/admin/access" icon="tabler-eye" tone="info" title={t.overview.queue.sensitiveReads} value={t.overview.queue.signalsValue(snapshot.reviewSignals)} /><QueueLink href="/admin/actions" icon="tabler-pencil-check" tone="success" title={t.overview.queue.privilegedWrites} value={t.overview.queue.recordsValue(snapshot.adminActions)} /></div></div></div></div>
    </div>
    {!preview && snapshot.readiness < 100 && <SourceNotice title={t.overview.gapsNotice.title} body={t.overview.gapsNotice.body} tone="warning" icon="tabler-database-off" />}
  </>;
}

function PostureRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="d-flex align-items-center justify-content-between gap-3"><span className="d-flex align-items-center gap-2"><span className={`badge badge-dot bg-${tone}`} /><span className="text-body-secondary">{label}</span></span><strong className="text-heading">{value}</strong></div>;
}

function QueueLink({ href, icon, tone, title, value }: { href: string; icon: string; tone: string; title: string; value: string }) {
  return <Link href={href} className="list-group-item list-group-item-action d-flex align-items-center gap-3 px-0"><span className="avatar avatar-sm"><span className={`avatar-initial rounded bg-label-${tone}`}><i className={`icon-base ti ${icon}`} /></span></span><span className="flex-grow-1"><strong className="text-heading d-block">{title}</strong><small className="text-body-secondary">{value}</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></Link>;
}

export function StaffRolesView({
  rows,
  requests = [],
  preview = false,
}: {
  rows: StaffAccountRow[];
  requests?: StaffChangeRequestRow[];
  preview?: boolean;
}) {
  const lang = useLang();
  const t = adminSecurity[lang];
  const active = rows.filter((row) => row.lastLoginAt).length;
  const pendingExecutions = requests.filter((request) => request.status === 'approved' && !request.executed).length;
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label={t.staffRoles.kpis.staffAccounts.label} value={String(rows.length)} support={t.staffRoles.kpis.staffAccounts.support} icon="tabler-shield-check" tone="primary" />
      <OperationsKpi label={t.staffRoles.kpis.recordedLogin.label} value={String(active)} support={t.staffRoles.kpis.recordedLogin.support} icon="tabler-login" tone="success" />
      <OperationsKpi label={t.staffRoles.kpis.persistedRoles.label} value={t.staffRoles.kpis.persistedRoles.value} support={t.staffRoles.kpis.persistedRoles.support} icon="tabler-lock-access" tone="warning" />
      <OperationsKpi label={t.staffRoles.kpis.awaitingExecution.label} value={String(pendingExecutions)} support={t.staffRoles.kpis.awaitingExecution.support} icon="tabler-player-play" tone={pendingExecutions ? 'danger' : 'success'} last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.staffRoles.directory.title} support={t.staffRoles.directory.support} /><div className="row g-4">{rows.map((row) => <div className="col-md-6" key={row.id}><div className="d-flex align-items-center gap-3 rounded bg-body-secondary p-4 h-100"><InitialAvatar label={row.email} tone="primary" /><span className="flex-grow-1 min-w-0"><strong className="text-heading d-block text-truncate">{row.email}</strong><small className="text-body-secondary">{t.staffRoles.directory.addedPrefix} {formatCompactDate(row.createdAt, lang)}</small></span><span className="badge bg-label-success">{t.staffRoles.directory.staffBadge}</span></div></div>)}</div>{rows.length === 0 && <SourceNotice title={t.staffRoles.directory.empty.title} body={t.staffRoles.directory.empty.body} tone="warning" icon="tabler-user-off" />}</div></div></div>
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.staffRoles.accessModel.title} support={t.staffRoles.accessModel.support} /><div className="timeline timeline-center mt-6"><AccessStep icon="tabler-login-2" tone="primary" title={t.staffRoles.accessModel.steps.authenticate.title} body={t.staffRoles.accessModel.steps.authenticate.body} /><AccessStep icon="tabler-shield-check" tone="success" title={t.staffRoles.accessModel.steps.staffGate.title} body={t.staffRoles.accessModel.steps.staffGate.body} /><AccessStep icon="tabler-history" tone="info" title={t.staffRoles.accessModel.steps.audit.title} body={t.staffRoles.accessModel.steps.audit.body} /></div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body">
      <OperationsSectionHeader title={t.staffRoles.changeRequests.title} support={t.staffRoles.changeRequests.support} />
      {requests.length ? <div className="list-group list-group-flush">{requests.map((request) => <div className="list-group-item d-flex flex-wrap align-items-center gap-3" key={request.id}>
        <span className={`badge bg-label-${request.targetType === 'staff_grant' ? 'success' : 'danger'}`}>{request.targetType === 'staff_grant' ? t.staffRoles.changeRequests.grantBadge : t.staffRoles.changeRequests.revokeBadge}</span>
        <span className="flex-grow-1 min-w-0"><strong className="text-heading d-block text-truncate">{request.targetId}</strong><small className="text-body-secondary text-capitalize">{request.status}{request.executed ? t.staffRoles.changeRequests.executedSuffix : ''}</small></span>
        {!preview && request.status === 'approved' && !request.executed && <ExecuteStaffChangeButton request={request} />}
      </div>)}</div> : (
        // Security → Approvals'ta AÇILAN genel bir onay talebinin targetType/
        // targetId'si yok — setStaffFlag'in bekçisiyle asla eşleşmez, o yüzden
        // o yolu burada işaret etmiyoruz (2026-08-22 final-review).
        <SourceNotice title={t.staffRoles.changeRequests.empty.title} body={preview ? t.staffRoles.changeRequests.empty.previewBody : t.staffRoles.changeRequests.empty.liveBody} tone="info" icon="tabler-user-shield" />
      )}
    </div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.staffRoles.capabilityBoundary.title} support={t.staffRoles.capabilityBoundary.support} /><div className="row g-4"><Capability icon="tabler-eye" tone="primary" title={t.staffRoles.capabilityBoundary.sensitiveReads.title} body={t.staffRoles.capabilityBoundary.sensitiveReads.body} /><Capability icon="tabler-file-dollar" tone="success" title={t.staffRoles.capabilityBoundary.invoiceOps.title} body={t.staffRoles.capabilityBoundary.invoiceOps.body} /><Capability icon="tabler-license" tone="warning" title={t.staffRoles.capabilityBoundary.entitlementUpdates.title} body={t.staffRoles.capabilityBoundary.entitlementUpdates.body} /><Capability icon="tabler-user-cog" tone="info" title={t.staffRoles.capabilityBoundary.staffProvisioning.title} body={t.staffRoles.capabilityBoundary.staffProvisioning.body} /></div></div></div>
    <SourceNotice title={t.staffRoles.singleFlagNotice.title} body={t.staffRoles.singleFlagNotice.body} tone="info" icon="tabler-shield-half-filled" />
  </>;
}

function AccessStep({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  return <div className="timeline-item pb-5"><span className={`timeline-indicator timeline-indicator-${tone}`}><i className={`icon-base ti ${icon}`} /></span><div className="timeline-event"><h6 className="mb-1">{title}</h6><p className="text-body-secondary mb-0">{body}</p></div></div>;
}

function Capability({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  return <div className="col-md-6 col-xl-3"><div className="d-flex gap-3 h-100"><span className="avatar flex-shrink-0"><span className={`avatar-initial rounded bg-label-${tone}`}><i className={`icon-base ti ${icon}`} /></span></span><div><h6 className="mb-1">{title}</h6><small className="text-body-secondary">{body}</small></div></div></div>;
}

export function ApprovalsView({ rows, preview = false }: { rows: ApprovalQueueRow[]; preview?: boolean }) {
  const lang = useLang();
  const t = adminSecurity[lang];
  const [selected, setSelected] = useState<ApprovalQueueRow | null>(null);
  // Eylem diyaloğu detay panelinin YERİNE açılır (kardeş), İÇİNE değil:
  // iç içe modal iki kapatma düğmesi ve kaymış kutu üretiyordu (2026-08-22).
  const [action, setAction] = useState<ApprovalAction | null>(null);
  const pending = rows.filter((row) => row.status === 'pending');
  const critical = pending.filter((row) => row.risk === 'critical').length;
  const complete = rows.filter((row) => row.status !== 'pending').length;
  if (!rows.length) return <><EmptyWorkbench icon="tabler-checkup-list" title={t.approvalsView.empty.title} body={t.approvalsView.empty.body} /><div className="mt-6"><SourceNotice title={t.approvalsView.noSimulatedNotice.title} body={t.approvalsView.noSimulatedNotice.body} tone="warning" icon="tabler-database-off" /></div></>;
  const columns: Array<{ key: ApprovalQueueRow['status']; title: string; tone: string }> = [{ key: 'pending', title: t.approvalsView.columns.awaitingDecision, tone: 'warning' }, { key: 'approved', title: t.approvalsView.columns.approved, tone: 'success' }, { key: 'rejected', title: t.approvalsView.columns.rejected, tone: 'danger' }];
  return <>
    {preview && <div className="mb-4"><SourceNotice title={t.shared.previewBadge} body={t.approvalsView.previewNotice.body} tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label={t.approvalsView.kpis.pending.label} value={String(pending.length)} support={t.approvalsView.kpis.pending.support} icon="tabler-hourglass" tone="warning" /><OperationsKpi label={t.approvalsView.kpis.critical.label} value={String(critical)} support={t.approvalsView.kpis.critical.support} icon="tabler-alert-octagon" tone="danger" /><OperationsKpi label={t.approvalsView.kpis.decided.label} value={String(complete)} support={t.approvalsView.kpis.decided.support} icon="tabler-checks" tone="success" /><OperationsKpi label={t.approvalsView.kpis.policy.label} value={preview ? t.approvalsView.kpis.policy.previewValue : t.approvalsView.kpis.policy.liveValue} support={preview ? t.approvalsView.kpis.policy.previewSupport : t.approvalsView.kpis.policy.liveSupport} icon="tabler-users-group" tone="primary" last /></OperationsKpiStrip>
    <div className="row g-6">{columns.map((column) => <div className="col-lg-4" key={column.key}><div className="card h-100"><div className="card-header d-flex align-items-center justify-content-between"><h5 className="mb-0">{column.title}</h5><span className={`badge bg-label-${column.tone}`}>{rows.filter((row) => row.status === column.key).length}</span></div><div className="card-body d-grid gap-4 align-content-start">{rows.filter((row) => row.status === column.key).map((row) => <button key={row.id} type="button" className="btn text-start p-0 border-0 w-100" onClick={() => setSelected(row)}><span className={`d-block w-100 rounded bg-label-${column.tone} p-4`}><span className="d-flex justify-content-between gap-3 mb-3"><span className={`badge bg-label-${row.risk === 'critical' ? 'danger' : row.risk === 'high' ? 'warning' : 'info'}`}>{row.risk}</span><small className="text-body-secondary">{formatCompactDate(row.requestedAt, lang)}</small></span><strong className="text-heading d-block mb-1">{row.title}</strong><small className="text-body-secondary d-block">{row.domain} · {row.requester}</small><span className="d-flex align-items-center gap-2 mt-3"><span className="progress flex-grow-1" style={{ height: '.35rem' }}><span className={`progress-bar bg-${column.tone}`} style={{ width: `${Math.min(100, (row.approvals / row.requiredApprovals) * 100)}%` }} /></span><small>{row.approvals}/{row.requiredApprovals}</small></span></span></button>)}</div></div></div>)}</div>
    {selected && action && <ApprovalActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setSelected(null)} />}
    {selected && !action && <StaffDialog title={t.approvalsView.detail.title} subtitle={preview ? t.approvalsView.detail.previewSubtitle : t.approvalsView.detail.subtitle} labelledBy={selected.title} busy={false} onClose={() => setSelected(null)}><div className="list-group mb-6"><Row label={t.approvalsView.detail.fields.request} value={selected.title} /><Row label={t.approvalsView.detail.fields.domain} value={selected.domain} /><Row label={t.approvalsView.detail.fields.requester} value={selected.requester} /><Row label={t.shared.fields.customer} value={selected.customer ?? t.approvalsView.detail.platformFallback} /><Row label={t.approvalsView.detail.fields.decisionProgress} value={`${selected.approvals}/${selected.requiredApprovals}`} /></div>{!preview && selected.status === 'pending' && <div className="d-flex gap-2 mb-6"><ApprovalActionButtons row={selected} onPick={setAction} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? t.shared.closePreview : common[lang].close}</button></StaffDialog>}
  </>;
}

export function DataRequestsView({ rows, now, preview = false }: { rows: DataRequestRow[]; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminSecurity[lang];
  const [selected, setSelected] = useState<DataRequestRow | null>(null);
  // ApprovalsView ile aynı: eylem diyaloğu detayın yerine açılır, içine değil.
  const [action, setAction] = useState<KvkkAction | null>(null);
  const facts = useMemo(() => rows.map((row) => ({ row, facts: getRequestFacts(row, now) })), [now, rows]);
  if (!rows.length) return <><EmptyWorkbench icon="tabler-shield-search" title={t.dataRequestsView.empty.title} body={t.dataRequestsView.empty.body} /><div className="mt-6"><SourceNotice title={t.dataRequestsView.evidenceNotice.title} body={t.dataRequestsView.evidenceNotice.body} tone="info" icon="tabler-history" /></div></>;
  const open = facts.filter((item) => !item.facts.completed);
  const overdue = open.filter((item) => item.facts.overdue).length;
  const urgent = open.filter((item) => item.facts.urgent).length;
  return <>
    {preview && <div className="mb-4"><SourceNotice title={t.shared.previewBadge} body={t.dataRequestsView.previewNotice.body} tone="info" icon="tabler-flask" /></div>}
    <OperationsKpiStrip><OperationsKpi label={t.dataRequestsView.kpis.openRequests.label} value={String(open.length)} support={t.dataRequestsView.kpis.openRequests.support} icon="tabler-file-description" tone="primary" /><OperationsKpi label={t.dataRequestsView.kpis.dueIn5Days.label} value={String(urgent)} support={t.dataRequestsView.kpis.dueIn5Days.support} icon="tabler-clock-exclamation" tone="warning" /><OperationsKpi label={t.dataRequestsView.kpis.overdue.label} value={String(overdue)} support={t.dataRequestsView.kpis.overdue.support} icon="tabler-alert-triangle" tone="danger" /><OperationsKpi label={t.dataRequestsView.kpis.completed.label} value={String(facts.length - open.length)} support={t.dataRequestsView.kpis.completed.support} icon="tabler-circle-check" tone="success" last /></OperationsKpiStrip>
    <div className="row g-6"><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.dataRequestsView.register.title} support={t.dataRequestsView.register.support} /><div className="d-grid gap-3">{facts.sort((a, b) => Date.parse(a.row.dueAt) - Date.parse(b.row.dueAt)).map(({ row, facts: request }) => { const tone = request.completed ? 'success' : request.overdue ? 'danger' : request.urgent ? 'warning' : 'primary'; return <button type="button" key={row.id} className="btn mm-request-button text-start border-0 p-0 w-100" onClick={() => setSelected(row)}><span className={`mm-request-row d-flex flex-column flex-sm-row align-items-sm-center gap-3 rounded bg-label-${tone} p-4`}><span className="d-flex align-items-center gap-3 flex-grow-1 min-w-0"><InitialAvatar label={row.subjectEmail} tone={tone} square /><span className="flex-grow-1 min-w-0"><span className="d-flex align-items-center flex-wrap gap-2"><strong className="text-heading">{row.reference}</strong><span className={`badge bg-label-${tone}`}>{row.status.replace('_', ' ')}</span></span><small className="text-body-secondary d-block text-truncate">{row.customer} · {row.type} · {row.subjectEmail}</small></span></span><span className="d-flex align-items-center justify-content-between justify-content-sm-end gap-3"><span className="text-start text-sm-end"><strong className={`text-${tone} d-block`}>{request.completed ? t.dataRequestsView.remaining.closed : request.overdue ? t.dataRequestsView.remaining.overdue(Math.abs(request.remainingDays)) : t.dataRequestsView.remaining.left(request.remainingDays)}</strong><small className="text-body-secondary">{t.dataRequestsView.evidenceSuffix(row.evidenceCount)}</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></span></span></button>; })}</div></div></div></div><div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.dataRequestsView.workflow.title} support={t.dataRequestsView.workflow.support} /><div className="timeline mt-6"><AccessStep icon="tabler-inbox" tone="primary" title={t.dataRequestsView.workflow.steps.intake.title} body={t.dataRequestsView.workflow.steps.intake.body} /><AccessStep icon="tabler-id" tone="info" title={t.dataRequestsView.workflow.steps.identityCheck.title} body={t.dataRequestsView.workflow.steps.identityCheck.body} /><AccessStep icon="tabler-database-search" tone="warning" title={t.dataRequestsView.workflow.steps.collectEvidence.title} body={t.dataRequestsView.workflow.steps.collectEvidence.body} /><AccessStep icon="tabler-scale" tone="danger" title={t.dataRequestsView.workflow.steps.legalReview.title} body={t.dataRequestsView.workflow.steps.legalReview.body} /><AccessStep icon="tabler-send" tone="success" title={t.dataRequestsView.workflow.steps.respondClose.title} body={t.dataRequestsView.workflow.steps.respondClose.body} /></div></div></div></div></div>
    {selected && action && <KvkkActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setSelected(null)} />}
    {selected && !action && <StaffDialog title={selected.reference} subtitle={preview ? t.dataRequestsView.detail.previewSubtitle : t.dataRequestsView.detail.subtitle} labelledBy={selected.reference} busy={false} onClose={() => setSelected(null)} wide><div className="row g-4 mb-6"><div className="col-sm-6"><Row label={t.dataRequestsView.detail.fields.subject} value={selected.subjectEmail} /><Row label={t.shared.fields.customer} value={selected.customer} /><Row label={t.dataRequestsView.detail.fields.owner} value={selected.owner ?? adminCommon[lang].unassigned} /></div><div className="col-sm-6"><Row label={t.dataRequestsView.detail.fields.requestType} value={selected.type} /><Row label={t.dataRequestsView.detail.fields.received} value={formatCompactDate(selected.receivedAt, lang)} /><Row label={t.dataRequestsView.detail.fields.due} value={formatCompactDate(selected.dueAt, lang)} /></div></div>{!preview && <div className="d-flex flex-wrap gap-2 mb-6"><KvkkActionButtons row={selected} onPick={setAction} /></div>}<button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? t.shared.closePreview : common[lang].close}</button></StaffDialog>}
  </>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item d-flex justify-content-between gap-4"><span className="text-body-secondary">{label}</span><strong className="text-heading text-end">{value}</strong></div>;
}

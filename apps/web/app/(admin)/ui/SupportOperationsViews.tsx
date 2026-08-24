'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  onboardingFacts,
  onboardingRows,
  slaState,
  sortSupportQueue,
  SUPPORT_PLAYBOOKS,
  supportCaseFacts,
  type SupportCaseRow,
  type SupportCaseStatus,
} from '../support-operations-model';
import type { ProductAnalyticsSnapshot } from '../product-analytics-model';
import {
  formatCompactDate,
  InitialAvatar,
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';
import { SupportActionButtons, SupportActionDialog, type SupportAction } from './SupportActions';
import { StaffDialog } from './StaffDialog';

const STATUS_META: Record<SupportCaseStatus, { label: string; tone: string; icon: string }> = {
  open: { label: 'Open', tone: 'primary', icon: 'tabler-mail-opened' },
  waiting_customer: { label: 'Waiting customer', tone: 'warning', icon: 'tabler-hourglass' },
  escalated: { label: 'Escalated', tone: 'danger', icon: 'tabler-arrow-badge-up' },
  resolved: { label: 'Resolved', tone: 'success', icon: 'tabler-circle-check' },
};

const PRIORITY_TONE = { urgent: 'danger', high: 'warning', normal: 'info', low: 'secondary' } as const;
const CATEGORY_ICON = { billing: 'tabler-receipt-dollar', builder: 'tabler-pencil-code', export: 'tabler-file-export', access: 'tabler-key', account: 'tabler-user-cog' } as const;

function PreviewBadge({ preview }: { preview?: boolean }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />Preview data</span> : null;
}

function SupportSource({ preview, body }: { preview?: boolean; body: string }) {
  return <SourceNotice title={preview ? 'Demonstration dataset' : 'Source boundary'} body={preview ? `This preview uses representative support records. ${body}` : body} tone="warning" icon={preview ? 'tabler-flask' : 'tabler-plug-off'} />;
}

function formatSlaTime(ms: number) {
  const hours = Math.max(1, Math.ceil(Math.abs(ms) / 3_600_000));
  return ms < 0 ? `${hours}h overdue` : `${hours}h left`;
}

export function SupportQueueView({ rows, now, preview }: { rows: SupportCaseRow[]; now: number; preview?: boolean }) {
  const queue = useMemo(() => sortSupportQueue(rows), [rows]);
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? '');
  // ApprovalsView/ErrorsView emsali: eylem diyaloğu kardeş olarak açılır.
  // `selected` burada bir kopya değil, `queue`dan (kendisi `rows` prop'undan
  // türer) `.find` ile hesaplanıyor — router.refresh() sonrası bayatlamaz.
  const [action, setAction] = useState<SupportAction | null>(null);
  const selected = queue.find((row) => row.id === selectedId) ?? queue[0];
  const facts = supportCaseFacts(rows, now);

  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Active queue" value={String(facts.active)} support="Unresolved support records" icon="tabler-inbox" tone="primary" />
      <OperationsKpi label="SLA breached" value={String(facts.breached)} support="Immediate response required" icon="tabler-alarm" tone="danger" />
      <OperationsKpi label="Due within 4h" value={String(facts.dueSoon)} support="Approaching response target" icon="tabler-clock-hour-4" tone="warning" />
      <OperationsKpi label="Unassigned" value={String(facts.unassigned)} support="Needs an accountable owner" icon="tabler-user-question" tone="info" last />
    </OperationsKpiStrip>
    {selected ? <div className="card mb-6 mm-support-console">
      <div className="mm-support-inbox">
        <div className="p-4 border-bottom"><OperationsSectionHeader title="Priority inbox" support="SLA first, then urgency and last activity." /><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" placeholder="Search customer or subject" /></div></div>
        <div className="mm-support-inbox__list">{queue.map((row) => { const sla = slaState(row, now); const status = STATUS_META[row.status]; return <button className={`mm-support-inbox__item${selected.id === row.id ? ' is-active' : ''}`} type="button" onClick={() => setSelectedId(row.id)} key={row.id}><div className="d-flex align-items-start gap-3"><InitialAvatar label={row.customer} tone={sla.tone} /><span className="flex-grow-1 min-w-0 text-start"><span className="d-flex align-items-center justify-content-between gap-2"><strong className="text-heading text-truncate">{row.customer}</strong><small className={`text-${sla.tone} flex-shrink-0`}>{formatSlaTime(sla.remaining)}</small></span><span className="d-block text-body-secondary text-truncate mt-1">{row.subject}</span><span className="d-flex align-items-center gap-2 mt-2"><span className={`badge bg-label-${PRIORITY_TONE[row.priority]}`}>{row.priority}</span><small className="text-body-secondary"><i className={`icon-base ti ${status.icon} me-1`} />{status.label}</small></span></span></div><div className="progress mt-3"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div></button>; })}</div>
      </div>
      <div className="mm-support-conversation">
        <header className="mm-support-conversation__header"><div className="d-flex align-items-center gap-3 min-w-0"><InitialAvatar label={selected.customer} tone={PRIORITY_TONE[selected.priority]} /><span className="min-w-0"><small className="text-body-secondary">{selected.reference} · {selected.channel}</small><h5 className="mb-0 text-truncate">{selected.subject}</h5></span></div><div className="d-flex gap-2">{!preview && <SupportActionButtons row={selected} onPick={setAction} />}</div></header>
        <div className="mm-support-conversation__body">
          <div className="row g-4 mb-5"><div className="col-md-8"><div className="mm-support-message"><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={selected.requester} tone="secondary" /><span><strong className="d-block text-heading">{selected.requester}</strong><small className="text-body-secondary">Customer message · {formatCompactDate(selected.createdAt)}</small></span></div><p className="mb-0">{selected.summary}</p></div></div><div className="col-md-4"><SupportSlaCard row={selected} now={now} /></div></div>
          <OperationsSectionHeader title="Case context" support="Operational metadata only; customer signature content is never shown here." />
          <div className="mm-support-context-grid">{[
            ['Customer', selected.customer, 'tabler-building'],
            ['Category', selected.category, CATEGORY_ICON[selected.category]],
            ['Owner', selected.owner ?? 'Unassigned', 'tabler-user-circle'],
            ['Last update', formatCompactDate(selected.updatedAt), 'tabler-history'],
          ].map(([label, value, icon]) => <div className="mm-support-context-item" key={label}><i className={`icon-base ti ${icon}`} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
        </div>
      </div>
    </div> : <SupportConnectionEmpty kind="queue" />}
    <SupportSource preview={preview} body={preview ? 'The inbox demonstrates the intended SLA workflow and is not production customer activity.' : 'Support cases are a persisted, writable register. An empty queue means every case has been resolved, not that the source is missing.'} />
    {selected && action && <SupportActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
  </>;
}

function SupportSlaCard({ row, now }: { row: SupportCaseRow; now: number }) {
  const sla = slaState(row, now);
  return <div className={`mm-support-sla bg-label-${sla.tone}`}><span className={`avatar mb-4`}><span className={`avatar-initial rounded bg-${sla.tone} text-white`}><i className="icon-base ti tabler-alarm" /></span></span><small className="d-block text-uppercase">Response target</small><h4 className={`text-${sla.tone} mt-1 mb-2`}>{sla.label}</h4><div className="progress"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div><small className="d-block mt-3">Priority: <strong>{row.priority}</strong></small></div>;
}

/**
 * Boş liste görünümü — `SupportCase` gerçek, yazılabilir bir kayıt
 * (Task 5). Bu kart artık "kaynak bağlı değil" demiyor: sıfır satır ya
 * hiç vaka açılmamış ya da hepsi çözülmüş demek — sayfa başlığındaki
 * "New case" düğmesi zaten görünür durumda.
 */
function SupportConnectionEmpty({ kind }: { kind: 'queue' | 'cases' }) {
  return <div className="card mb-6"><div className="card-body py-10 text-center"><span className="avatar avatar-xl mb-4"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${kind === 'queue' ? 'tabler-inbox-off' : 'tabler-folders-off'} icon-32px`} /></span></span><h4>{kind === 'queue' ? 'No open support cases' : 'No support cases yet'}</h4><p className="text-body-secondary mx-auto mb-0" style={{ maxWidth: '42rem' }}>{kind === 'queue' ? 'Every case has been resolved, or none have been opened yet.' : 'Cases created from the support queue will appear here.'}</p></div></div>;
}

export function SupportCasesView({ rows, now, preview }: { rows: SupportCaseRow[]; now: number; preview?: boolean }) {
  const [status, setStatus] = useState<'all' | SupportCaseStatus>('all');
  const [query, setQuery] = useState('');
  // ApprovalsView/DataRequestsView emsali: kart ızgarasında "detay" modalı
  // yok, bu yüzden "..." düğmesi bir StaffDialog açar; eylem diyaloğu onun
  // YERİNE (kardeş) render edilir.
  const [selected, setSelected] = useState<SupportCaseRow | null>(null);
  const [action, setAction] = useState<SupportAction | null>(null);
  const facts = supportCaseFacts(rows, now);
  const visible = useMemo(() => rows.filter((row) => (status === 'all' || row.status === status) && `${row.reference} ${row.customer} ${row.subject}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [query, rows, status]);
  const resolved = rows.filter((row) => row.status === 'resolved').length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="All cases" value={String(rows.length)} support="Loaded support portfolio" icon="tabler-folders" tone="primary" /><OperationsKpi label="Open attention" value={String(facts.active)} support="Unresolved records" icon="tabler-folder-open" tone="warning" /><OperationsKpi label="Resolved" value={String(resolved)} support={`${rows.length ? Math.round((resolved / rows.length) * 100) : 0}% resolution share`} icon="tabler-circle-check" tone="success" /><OperationsKpi label="Waiting customer" value={String(facts.waiting)} support="Paused for a customer response" icon="tabler-hourglass" tone="info" last /></OperationsKpiStrip>
    {rows.length ? <div className="card mb-6"><div className="card-body border-bottom"><OperationsSectionHeader title="Case portfolio" support="Scan ownership, current state and SLA without opening every record." /><div className="row g-3"><div className="col-lg-8"><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, customer or subject" /></div></div><div className="col-lg-4"><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option>{Object.entries(STATUS_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></div></div></div><div className="card-body"><div className="mm-support-case-grid">{visible.map((row) => { const state = STATUS_META[row.status]; const sla = slaState(row, now); return <article className={`mm-support-case mm-support-case--${sla.tone}`} key={row.id}><div className="d-flex align-items-start justify-content-between gap-3 mb-4"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${state.tone} text-${state.tone}`}><i className={`icon-base ti ${CATEGORY_ICON[row.category]}`} /></span></span><button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`Actions for ${row.reference}`} onClick={() => setSelected(row)}><i className="icon-base ti tabler-dots-vertical" /></button></div><small className="text-body-secondary">{row.reference}</small><h6 className="mt-1 mb-2 text-truncate">{row.subject}</h6><p className="small text-body-secondary text-truncate mb-4">{row.customer} · {row.requester}</p><div className="d-flex flex-wrap gap-2 mb-4"><span className={`badge bg-label-${state.tone}`}>{state.label}</span><span className={`badge bg-label-${PRIORITY_TONE[row.priority]}`}>{row.priority}</span></div><div className="progress mb-2"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div><div className="d-flex justify-content-between align-items-center"><small className={`text-${sla.tone}`}>{sla.label}</small><InitialAvatar label={row.owner ?? 'Unassigned'} tone={row.owner ? 'primary' : 'secondary'} /></div></article>; })}</div></div></div> : <SupportConnectionEmpty kind="cases" />}
    <SupportSource preview={preview} body={preview ? 'The case portfolio is representative UI data and is not connected to customers.' : 'Support cases are a persisted, writable register; requester emails are personal data: every view of this register is access-logged, and they never enter audit payloads or reports.'} />
    {selected && action && <SupportActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setSelected(null)} />}
    {selected && !action && <StaffDialog title={selected.reference} subtitle={preview ? 'Preview-only case detail.' : 'Case detail.'} labelledBy={selected.reference} busy={false} onClose={() => setSelected(null)}>
      <div className="list-group mb-6">
        <CaseRow label="Subject" value={selected.subject} />
        <CaseRow label="Customer" value={selected.customer} />
        <CaseRow label="Status" value={STATUS_META[selected.status].label} />
        <CaseRow label="Priority" value={selected.priority} />
        <CaseRow label="Owner" value={selected.owner ?? 'Unassigned'} />
        <CaseRow label="SLA due" value={formatCompactDate(selected.slaDueAt)} />
      </div>
      {!preview && <div className="d-flex flex-wrap gap-2 mb-6"><SupportActionButtons row={selected} onPick={setAction} /></div>}
      <button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? 'Close preview' : 'Close'}</button>
    </StaffDialog>}
  </>;
}

function CaseRow({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item d-flex justify-content-between gap-4"><span className="text-body-secondary">{label}</span><strong className="text-heading text-end">{value}</strong></div>;
}

export function SupportOnboardingView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const rows = onboardingRows(source, now);
  const facts = onboardingFacts(rows);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Workspaces" value={String(facts.total)} support="Current onboarding portfolio" icon="tabler-building-community" tone="primary" /><OperationsKpi label="Average progress" value={`${facts.average}%`} support="Five durable milestones" icon="tabler-chart-arcs" tone="info" /><OperationsKpi label="Needs assistance" value={String(facts.assisted)} support="First export not evidenced" icon="tabler-lifebuoy" tone="warning" /><OperationsKpi label="Completed" value={String(facts.complete)} support="Export evidence recorded" icon="tabler-rosette-discount-check" tone="success" last /></OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100 mm-onboarding-desk"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-route icon-28px" /></span></span><h4>Assisted launch desk</h4><p className="text-body-secondary">Prioritize workspaces by the next observable product milestone. Progress is derived from records, not session behavior.</p><div className="mm-onboarding-legend">{['Workspace', 'Identity', 'Design', 'Publish', 'Export'].map((label, index) => <span key={label}><i>{index + 1}</i>{label}</span>)}</div><div className="alert alert-warning mt-5 mb-0"><strong>{facts.atRisk} stalled</strong><br /><small>Older than 14 days and below publish readiness.</small></div></div></div></div><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Milestone coverage" support="Current portfolio depth across the first-value journey." /><div className="mm-onboarding-coverage">{['workspace', 'identity', 'design', 'publish', 'export'].map((stage, index) => { const reached = rows.filter((row) => row.stageIndex >= index).length; const rate = rows.length ? Math.round((reached / rows.length) * 100) : 0; return <div key={stage}><div className="d-flex justify-content-between mb-2"><span className="text-heading fw-medium text-capitalize">{stage}</span><strong>{reached}</strong></div><div className="progress"><span className={`progress-bar bg-${index === 4 ? 'success' : 'primary'}`} style={{ width: `${rate}%` }} /></div><small className="text-body-secondary">{rate}% coverage</small></div>; })}</div></div></div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Workspace launch board" support="Next best action for every incomplete onboarding path." /><div className="mm-onboarding-grid">{rows.map((row) => <Link href={`/admin/orgs/${row.id}`} className={`mm-onboarding-card mm-onboarding-card--${row.tone}`} key={row.id}><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={row.name} tone={row.tone} /><span className="flex-grow-1 min-w-0"><strong className="d-block text-heading text-truncate">{row.name}</strong><small className="text-body-secondary">{row.ownerSignal} · day {row.ageDays}</small></span><strong className={`text-${row.tone}`}>{row.progress}%</strong></div><div className="mm-onboarding-steps">{[0, 1, 2, 3, 4].map((step) => <span className={row.stageIndex >= step ? `is-complete bg-${row.tone}` : ''} key={step} />)}</div><div className="d-flex align-items-center justify-content-between gap-3 mt-4"><span><small className="d-block text-body-secondary">Next milestone</small><strong className="text-heading">{row.nextStep}</strong></span><i className="icon-base ti tabler-arrow-up-right" /></div></Link>)}</div></div></div>
    <SourceNotice title="Source-backed onboarding" body="Progress uses workspace, membership, signature, active-sender and export-evidence records. It does not infer installation success or user engagement." tone="info" icon="tabler-database-check" />
  </>;
}

export function SupportPlaybooksView({ preview }: { preview?: boolean }) {
  const categories = [...new Set(SUPPORT_PLAYBOOKS.map((row) => row.category))];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} /></div>
    <OperationsKpiStrip><OperationsKpi label="Published playbooks" value={String(SUPPORT_PLAYBOOKS.length)} support="Source-controlled procedures" icon="tabler-books" tone="primary" /><OperationsKpi label="Coverage areas" value={String(categories.length)} support={categories.join(' · ')} icon="tabler-category" tone="info" /><OperationsKpi label="Customer-data edits" value="0" support="Read-only support boundary" icon="tabler-shield-lock" tone="success" /><OperationsKpi label="Approval workflow" value="Source" support="No writable CMS connected" icon="tabler-git-pull-request" tone="warning" last /></OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100 mm-playbook-index"><div className="card-body"><span className="badge bg-label-primary mb-4">Support operating system</span><h3>Resolve consistently.<br />Escalate with evidence.</h3><p className="text-body-secondary">Playbooks define the safest next action without giving staff unrestricted access to customer content.</p><div className="d-grid gap-2 mt-5">{categories.map((category) => <a href={`#playbook-${category.toLowerCase()}`} className="mm-playbook-category" key={category}><span>{category}</span><span className="badge bg-label-secondary">{SUPPORT_PLAYBOOKS.filter((row) => row.category === category).length}</span></a>)}</div></div></div></div><div className="col-xl-8"><div className="mm-playbook-grid">{SUPPORT_PLAYBOOKS.map((playbook, index) => <details className={`mm-playbook-card mm-playbook-card--${playbook.tone}`} id={`playbook-${playbook.category.toLowerCase()}`} open={index === 0} key={playbook.id}><summary><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${playbook.tone} text-${playbook.tone}`}><i className={`icon-base ti ${playbook.icon} icon-26px`} /></span></span><span className="flex-grow-1 min-w-0"><small className={`text-${playbook.tone}`}>{playbook.category}</small><h5 className="mb-0">{playbook.title}</h5></span><i className="icon-base ti tabler-chevron-down mm-playbook-card__chevron" /></summary><div className="mm-playbook-card__content"><div className="row g-4 mb-4"><div className="col-md-6"><small className="text-uppercase text-body-secondary">Trigger</small><p className="text-heading mt-1 mb-0">{playbook.trigger}</p></div><div className="col-md-6"><small className="text-uppercase text-body-secondary">Expected outcome</small><p className="text-heading mt-1 mb-0">{playbook.outcome}</p></div></div><ol className="mm-playbook-steps">{playbook.steps.map((step, stepIndex) => <li key={step}><span className={`bg-label-${playbook.tone} text-${playbook.tone}`}>{String(stepIndex + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol></div></details>)}</div></div></div>
    <SourceNotice title="Source-controlled guidance" body="These procedures are static operational guidance. A future writable playbook CMS must add versions, reviewers, approvals and publication history before staff can edit them here." tone="info" icon="tabler-book-2" />
  </>;
}

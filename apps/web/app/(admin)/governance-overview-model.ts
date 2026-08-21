import { getAccessReviewFacts, summarizeAccessLog, type StaffAccessLogRow } from './access-log-model';
import { getActionDescriptor, summarizeAdminActions, type AdminActionLogRow } from './action-log-model';
import { getRequestFacts, type ApprovalQueueRow, type DataRequestRow, type StaffAccountRow } from './operations-model';

export type GovernanceTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'secondary';

export interface GovernanceActivityRow {
  id: string;
  type: 'read' | 'write' | 'approval' | 'request';
  title: string;
  actor: string;
  subject: string;
  createdAt: string;
  icon: string;
  tone: GovernanceTone;
}

export interface GovernanceControlRow {
  id: string;
  label: string;
  support: string;
  value: string;
  connected: boolean;
  icon: string;
  tone: GovernanceTone;
  href: string;
}

export interface GovernanceOverviewSnapshot {
  staffAccounts: number;
  staffWithLogin: number;
  sensitiveReads: number;
  readsToday: number;
  reviewSignals: number;
  adminActions: number;
  actionsToday: number;
  pendingApprovals: number;
  criticalApprovals: number;
  openRequests: number;
  overdueRequests: number;
  riskQueue: number;
  readiness: number;
  controls: GovernanceControlRow[];
  activity: GovernanceActivityRow[];
}

export function buildGovernanceOverview(input: {
  staff: readonly StaffAccountRow[];
  access: readonly StaffAccessLogRow[];
  actions: readonly AdminActionLogRow[];
  approvals: readonly ApprovalQueueRow[];
  requests: readonly DataRequestRow[];
  now: number;
  sources: { staff: boolean; access: boolean; actions: boolean; approvals: boolean; requests: boolean };
}): GovernanceOverviewSnapshot {
  const access = summarizeAccessLog(input.access, input.now);
  const actions = summarizeAdminActions(input.actions, input.now);
  const pending = input.approvals.filter((row) => row.status === 'pending');
  const requestFacts = input.requests.map((row) => ({ row, facts: getRequestFacts(row, input.now) }));
  const openRequests = requestFacts.filter(({ facts }) => !facts.completed);
  const overdueRequests = openRequests.filter(({ facts }) => facts.overdue).length;
  const controls: GovernanceControlRow[] = [
    { id: 'staff', label: 'Staff identity', support: 'Control-plane account boundary', value: `${input.staff.length} accounts`, connected: input.sources.staff, icon: 'tabler-user-shield', tone: 'primary', href: '/admin/security/staff' },
    { id: 'access', label: 'Sensitive reads', support: 'Customer-data access ledger', value: `${access.reads} reads`, connected: input.sources.access, icon: 'tabler-eye-shield', tone: 'info', href: '/admin/access' },
    { id: 'actions', label: 'Privileged writes', support: 'Reasoned before/after ledger', value: `${actions.total} actions`, connected: input.sources.actions, icon: 'tabler-pencil-check', tone: 'success', href: '/admin/actions' },
    { id: 'approvals', label: 'Decision policy', support: 'Multi-person approval workflow', value: input.sources.approvals ? `${pending.length} pending` : 'Schema required', connected: input.sources.approvals, icon: 'tabler-checkup-list', tone: 'warning', href: '/admin/security/approvals' },
    { id: 'requests', label: 'Data rights', support: 'KVKK request evidence register', value: input.sources.requests ? `${openRequests.length} open` : 'Schema required', connected: input.sources.requests, icon: 'tabler-shield-search', tone: 'danger', href: '/admin/security/data-requests' },
  ];
  const activity: GovernanceActivityRow[] = [
    ...input.access.map((row) => {
      const review = getAccessReviewFacts(row, input.access);
      return { id: `read-${row.id}`, type: 'read' as const, title: review.label, actor: row.staffEmail, subject: `${row.orgName} · ${row.scope}`, createdAt: row.createdAt, icon: 'tabler-eye', tone: review.signal === 'review' ? 'warning' as const : 'info' as const };
    }),
    ...input.actions.map((row) => {
      const descriptor = getActionDescriptor(row.action);
      return { id: `write-${row.id}`, type: 'write' as const, title: descriptor.label, actor: row.staffEmail, subject: row.orgName, createdAt: row.createdAt, icon: descriptor.icon, tone: descriptor.tone };
    }),
    ...input.approvals.map((row) => ({ id: `approval-${row.id}`, type: 'approval' as const, title: row.title, actor: row.requester, subject: row.customer ?? row.domain, createdAt: row.requestedAt, icon: 'tabler-checkup-list', tone: row.status === 'pending' ? 'warning' as const : row.status === 'approved' ? 'success' as const : 'danger' as const })),
    ...input.requests.map((row) => ({ id: `request-${row.id}`, type: 'request' as const, title: row.reference, actor: row.owner ?? 'Unassigned', subject: `${row.customer} · ${row.type}`, createdAt: row.receivedAt, icon: 'tabler-file-description', tone: getRequestFacts(row, input.now).overdue ? 'danger' as const : 'primary' as const })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);

  return {
    staffAccounts: input.staff.length,
    staffWithLogin: input.staff.filter((row) => row.lastLoginAt).length,
    sensitiveReads: access.reads,
    readsToday: access.readsToday,
    reviewSignals: access.reviewSignals,
    adminActions: actions.total,
    actionsToday: actions.today,
    pendingApprovals: pending.length,
    criticalApprovals: pending.filter((row) => row.risk === 'critical').length,
    openRequests: openRequests.length,
    overdueRequests,
    riskQueue: access.reviewSignals + pending.filter((row) => row.risk === 'critical').length + overdueRequests,
    readiness: Math.round((controls.filter((row) => row.connected).length / controls.length) * 100),
    controls,
    activity,
  };
}

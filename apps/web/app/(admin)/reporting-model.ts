export type ReportTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'secondary';
export type ReportCategory = 'executive' | 'revenue' | 'product' | 'customer' | 'security' | 'support';

export interface ReportDefinition {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  icon: string;
  tone: ReportTone;
  sources: string[];
  metrics: string[];
  owner: string;
  freshness: string;
  status: 'ready' | 'partial';
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  reportName: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  nextRunAt: string;
  recipients: string[];
  format: 'CSV' | 'PDF' | 'Email digest';
  owner: string;
  status: 'active' | 'paused' | 'attention';
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | null;
}

export interface KpiDefinition {
  id: string;
  name: string;
  domain: ReportCategory;
  description: string;
  formula: string;
  source: string;
  grain: string;
  owner: string;
  freshness: string;
  guardrail: string;
  status: 'defined' | 'source-gap';
}

export const REPORT_LIBRARY: ReportDefinition[] = [
  { id: 'command-center', name: 'Executive command center', category: 'executive', description: 'Customers, revenue, product adoption and control-plane exceptions in one operating brief.', icon: 'tabler-layout-dashboard', tone: 'primary', sources: ['Organizations', 'Invoices', 'Product events', 'Audit ledgers'], metrics: ['Active seats', 'Outstanding revenue', 'Activation', 'Open risks'], owner: 'Operations', freshness: 'On page load', status: 'ready' },
  { id: 'revenue-collections', name: 'Revenue & collections', category: 'revenue', description: 'Billed, collected, outstanding and overdue balances by customer and billing window.', icon: 'tabler-chart-donut-4', tone: 'success', sources: ['Invoices', 'Entitlements'], metrics: ['Billed', 'Collected', 'Outstanding', 'Overdue'], owner: 'Finance', freshness: 'On page load', status: 'ready' },
  { id: 'product-activation', name: 'Product activation', category: 'product', description: 'Workspace progression from account creation to saved signature, publish and export evidence.', icon: 'tabler-funnel', tone: 'info', sources: ['Organizations', 'Signatures', 'Senders', 'Activity'], metrics: ['Activation rate', 'Publish rate', 'Export evidence'], owner: 'Product', freshness: 'On page load', status: 'ready' },
  { id: 'customer-health', name: 'Customer health', category: 'customer', description: 'Seat pressure, billing state, activity recency and onboarding signals for account follow-up.', icon: 'tabler-heart-rate-monitor', tone: 'warning', sources: ['Organizations', 'Entitlements', 'Invoices', 'Activity'], metrics: ['Health score', 'Seat utilization', 'Inactive days'], owner: 'Customer success', freshness: 'On page load', status: 'ready' },
  { id: 'security-evidence', name: 'Security evidence pack', category: 'security', description: 'Sensitive reads, privileged writes and the actor/customer trail required for governance review.', icon: 'tabler-shield-check', tone: 'danger', sources: ['Staff access log', 'Admin action log'], metrics: ['Sensitive reads', 'Review signals', 'Privileged writes'], owner: 'Security', freshness: 'On page load', status: 'ready' },
  { id: 'support-operations', name: 'Support operations', category: 'support', description: 'Queue pressure, SLA exposure, onboarding depth and case ownership for daily support review.', icon: 'tabler-headset', tone: 'secondary', sources: ['Support cases', 'Onboarding milestones'], metrics: ['Open cases', 'SLA risk', 'Milestone coverage'], owner: 'Support', freshness: 'On page load', status: 'ready' },
];

/**
 * Registry ile eşleşmek ZORUNDA — report-builder-support testi iddia eder.
 * `app/` altı `lib/reports`'u içe aktaramadığı için (import kapısı) bu iki
 * sabit burada yaşar; gerçek kaynak `lib/reports/registry.ts`.
 */
export const RUNNABLE_REPORTS = [
  'command-center',
  'revenue-collections',
  'product-activation',
  'customer-health',
  'security-evidence',
  'support-operations',
] as const;
export const TABLELESS_REPORT_IDS = ['command-center'] as const;

export const KPI_DEFINITIONS: KpiDefinition[] = [
  { id: 'active-seats', name: 'Active seats', domain: 'customer', description: 'Published senders currently counted against customer entitlement.', formula: 'Count of active senders', source: 'Sender records', grain: 'Organization', owner: 'Operations', freshness: 'On page load', guardrail: 'Exclude drafts and inactive senders', status: 'defined' },
  { id: 'seat-utilization', name: 'Seat utilization', domain: 'customer', description: 'How much of a customer entitlement is currently in use.', formula: 'Active seats / entitled seats × 100', source: 'Sender + entitlement records', grain: 'Organization', owner: 'Operations', freshness: 'On page load', guardrail: 'Entitled seats must be greater than zero', status: 'defined' },
  { id: 'billed-revenue', name: 'Billed revenue', domain: 'revenue', description: 'Authoritative non-void invoice value issued in the selected period.', formula: 'Sum(invoice amount) where status ≠ void', source: 'Invoice records', grain: 'Invoice currency + period', owner: 'Finance', freshness: 'On page load', guardrail: 'Never mix currencies in one total', status: 'defined' },
  { id: 'collection-rate', name: 'Collection rate', domain: 'revenue', description: 'Share of billed value represented by paid invoices.', formula: 'Collected amount / billed amount × 100', source: 'Invoice records', grain: 'Invoice currency + period', owner: 'Finance', freshness: 'On page load', guardrail: 'Void invoices excluded from denominator', status: 'defined' },
  { id: 'activation-rate', name: 'Activation rate', domain: 'product', description: 'Eligible workspaces with at least one saved signature.', formula: 'Workspaces with signature / eligible workspaces × 100', source: 'Organization + signature records', grain: 'Workspace cohort', owner: 'Product', freshness: 'On page load', guardrail: 'Cohort denominator must remain fixed', status: 'defined' },
  { id: 'export-evidence', name: 'Export evidence rate', domain: 'product', description: 'Activated workspaces with a recorded export event.', formula: 'Workspaces with export / activated workspaces × 100', source: 'Activity events', grain: 'Workspace cohort', owner: 'Product', freshness: 'On page load', guardrail: 'Manual install outside Mailmyra is not observable', status: 'defined' },
  { id: 'sensitive-read-burst', name: 'Sensitive read review signal', domain: 'security', description: 'Concentrated staff reads for the same customer that merit review.', formula: '≥5 reads by one staff member for one org in 15 minutes', source: 'Staff access log', grain: 'Staff + organization + 15-minute window', owner: 'Security', freshness: 'On page load', guardrail: 'A signal is not proof of misuse', status: 'defined' },
  { id: 'support-sla', name: 'Support SLA compliance', domain: 'support', description: 'Resolved cases completed within the committed response window.', formula: 'Cases within SLA / resolved cases × 100', source: 'Support case system', grain: 'Case + period', owner: 'Support', freshness: 'Source integration pending', guardrail: 'No resolvedAt field in the schema yet — compliance percentage cannot be honestly calculated', status: 'source-gap' },
];

export function summarizeSchedules(rows: readonly ReportSchedule[], now: number) {
  return {
    total: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    attention: rows.filter((row) => row.status === 'attention' || row.lastRunStatus === 'failed').length,
    next24h: rows.filter((row) => row.status === 'active' && Date.parse(row.nextRunAt) >= now && Date.parse(row.nextRunAt) <= now + 24 * 60 * 60 * 1000).length,
  };
}

export function getReportCoverage(rows: readonly ReportDefinition[]) {
  const ready = rows.filter((row) => row.status === 'ready').length;
  return { ready, partial: rows.length - ready, percent: rows.length ? Math.round((ready / rows.length) * 100) : 0 };
}

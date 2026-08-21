'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  formatActionValue,
  getActionChanges,
  getActionDescriptor,
  humanize,
  matchesActionFocus,
  matchesActionPeriod,
  sortAdminActions,
  summarizeAdminActions,
  type ActionFocus,
  type ActionPeriod,
  type ActionSort,
  type AdminActionLogRow,
} from '../action-log-model';
import { AdminEmptyState } from './AdminEmptyState';
import { StaffDialog } from './StaffDialog';

const FOCUS_OPTIONS: ReadonlyArray<{ value: ActionFocus; label: string }> = [
  { value: 'all', label: 'All changes' },
  { value: 'entitlement', label: 'Entitlements' },
  { value: 'billing', label: 'Billing' },
];

export function AdminActionLogView({ rows, now }: { rows: AdminActionLogRow[]; now: number }) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<ActionFocus>('all');
  const [period, setPeriod] = useState<ActionPeriod>('30');
  const [sort, setSort] = useState<ActionSort>('newest');
  const [previewRow, setPreviewRow] = useState<AdminActionLogRow | null>(null);
  const summary = useMemo(() => summarizeAdminActions(rows, now), [now, rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortAdminActions(
      rows.filter((row) => {
        const descriptor = getActionDescriptor(row.action);
        if (!matchesActionFocus(row, focus) || !matchesActionPeriod(row, period, now)) return false;
        return !needle || [
          row.staffEmail,
          row.orgName,
          row.action,
          descriptor.label,
          row.targetId ?? '',
          row.reason,
        ].some((value) => value.toLowerCase().includes(needle));
      }),
      sort,
    );
  }, [focus, now, period, query, rows, sort]);

  const mostCommon = getMostCommon(rows.map((row) => getActionDescriptor(row.action).label));
  const mostChangedCustomer = getMostCommon(rows.map((row) => row.orgName));
  const hasFilters = query.trim() !== '' || focus !== 'all' || period !== '30' || sort !== 'newest';

  return (
    <>
      <section className="card mb-6 mm-action-summary" aria-label="Admin action summary">
        <div className="card-widget-separator-wrapper">
          <div className="card-body card-widget-separator">
            <div className="row gy-4 gy-sm-1">
              <SummaryWidget icon="tabler-history" label="Recorded writes" value={String(summary.total)} support="Loaded immutable window" />
              <SummaryWidget icon="tabler-calendar-check" label="Writes today" value={String(summary.today)} support="Since local midnight" tone="info" />
              <SummaryWidget icon="tabler-user-shield" label="Active staff" value={String(summary.activeStaff)} support="Distinct staff identities" tone="success" />
              <SummaryWidget icon="tabler-building" label="Customers changed" value={String(summary.customersChanged)} support="Distinct root workspaces" tone="warning" last />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-6 mm-action-context" aria-label="Action log context">
        <div className="card-body py-4">
          <div className="row g-4 align-items-center">
            <ContextItem icon="tabler-lock-check" tone="primary" eyebrow="Immutable ledger" title="Staff writes only" support="No edit or delete controls are exposed." />
            <ContextItem icon="tabler-activity" tone="info" eyebrow="Most common action" title={mostCommon || 'No actions yet'} support={mostCommon ? 'Across the loaded audit window' : 'Awaiting the first staff write'} />
            <ContextItem icon="tabler-building" tone="warning" eyebrow="Most changed customer" title={mostChangedCustomer || 'No customer yet'} support={mostChangedCustomer ? 'Highest write count in this window' : 'No customer changes recorded'} />
          </div>
        </div>
      </section>

      <section className="card mm-action-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h5 className="card-title mb-0">Admin action ledger</h5>
                <span className="badge bg-label-secondary">{visible.length} {visible.length === 1 ? 'result' : 'results'}</span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                Every support write carries an actor, customer, reason and before/after snapshot.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {hasFilters && (
                <button type="button" className="btn btn-sm btn-label-secondary" onClick={() => {
                  setQuery(''); setFocus('all'); setPeriod('30'); setSort('newest');
                }}>
                  <i className="icon-base ti tabler-filter-x me-1" aria-hidden="true" />
                  Reset filters
                </button>
              )}
              <button type="button" className="btn btn-sm btn-label-primary" onClick={() => exportRows(visible)} disabled={visible.length === 0}>
                <i className="icon-base ti tabler-download me-1" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-action-focus" role="group" aria-label="Action category">
              {FOCUS_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={`nav-link${focus === option.value ? ' active' : ''}`} aria-pressed={focus === option.value} onClick={() => setFocus(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <label className="form-label" htmlFor="action-search">Search ledger</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text"><i className="icon-base ti tabler-search" aria-hidden="true" /></span>
                <input id="action-search" type="search" className="form-control" placeholder="Staff, customer, action, target or reason" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="action-period">Recorded period</label>
              <select id="action-period" className="form-select" value={period} onChange={(event) => setPeriod(event.target.value as ActionPeriod)}>
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All loaded</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <label className="form-label" htmlFor="action-sort">Sort by</label>
              <select id="action-sort" className="form-select" value={sort} onChange={(event) => setSort(event.target.value as ActionSort)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="customer">Customer name</option>
                <option value="staff">Staff identity</option>
              </select>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState icon="tabler-history-off" text={rows.length === 0 ? 'No staff writes have been recorded yet.' : 'No action matches these filters.'} />
        ) : (
          <>
            <div className="card-datatable table-responsive mm-action-desktop-table">
              <table className="table table-hover border-top mm-action-table">
                <thead><tr><th>Recorded</th><th>Staff</th><th>Customer</th><th>Action</th><th>Reason</th><th className="text-end" aria-label="Actions" /></tr></thead>
                <tbody>{visible.map((row) => <ActionTableRow key={row.id} row={row} onPreview={setPreviewRow} />)}</tbody>
              </table>
            </div>
            <div className="mm-action-responsive-cards p-3 p-sm-4">
              <div className="d-grid gap-3">{visible.map((row) => <ActionMobileCard key={row.id} row={row} onPreview={setPreviewRow} />)}</div>
            </div>
          </>
        )}
      </section>

      {previewRow && <ActionDetailDialog row={previewRow} onClose={() => setPreviewRow(null)} />}
    </>
  );
}

function SummaryWidget({ icon, label, value, support, tone = 'primary', last = false }: { icon: string; label: string; value: string; support: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'; last?: boolean }) {
  return (
    <div className="col-6 col-lg-3">
      <div className={`d-flex justify-content-between align-items-center pb-4 pb-sm-0${last ? '' : ' border-end mm-action-widget'}`}>
        <div className="min-w-0"><h4 className="mb-1 text-truncate">{value}</h4><p className="mb-1">{label}</p><small className="text-body-secondary">{support}</small></div>
        <span className="avatar me-sm-4 flex-shrink-0"><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className={`icon-base ti ${icon} icon-26px`} aria-hidden="true" /></span></span>
      </div>
    </div>
  );
}

function ContextItem({ icon, tone, eyebrow, title, support }: { icon: string; tone: string; eyebrow: string; title: string; support: string }) {
  return (
    <div className="col-12 col-md-4">
      <div className="d-flex align-items-center gap-3 min-w-0">
        <span className="avatar avatar-md flex-shrink-0"><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className={`icon-base ti ${icon}`} aria-hidden="true" /></span></span>
        <div className="min-w-0"><small className="text-uppercase text-body-secondary d-block">{eyebrow}</small><span className="fw-medium text-heading d-block text-truncate">{title}</span><small className="text-body-secondary d-block text-truncate">{support}</small></div>
      </div>
    </div>
  );
}

function ActionTableRow({ row, onPreview }: { row: AdminActionLogRow; onPreview: (row: AdminActionLogRow) => void }) {
  return (
    <tr>
      <td><span className="fw-medium text-heading d-block">{formatDateTime(row.createdAt)}</span><small className="text-body-secondary">{relativeTime(row.createdAt)}</small></td>
      <td><StaffIdentity email={row.staffEmail} /></td>
      <td><CustomerIdentity row={row} /></td>
      <td><ActionBadge action={row.action} /></td>
      <td><span className="text-heading d-block text-truncate mm-action-reason" title={row.reason}>{row.reason}</span><small className="text-body-secondary">Reason required</small></td>
      <td className="text-end"><ActionButtons row={row} onPreview={onPreview} /></td>
    </tr>
  );
}

function ActionMobileCard({ row, onPreview }: { row: AdminActionLogRow; onPreview: (row: AdminActionLogRow) => void }) {
  return (
    <article className="card border-0 shadow-sm mm-action-mobile-card">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4 mm-action-mobile-head"><CustomerIdentity row={row} /><ActionBadge action={row.action} /></div>
        <p className="text-heading mb-4">{row.reason}</p>
        <div className="row g-3 mb-4">
          <PreviewDatum className="col-12 col-sm-6" label="Changed by" value={row.staffEmail} />
          <PreviewDatum className="col-12 col-sm-6" label="Recorded" value={formatDateTime(row.createdAt)} />
        </div>
        <div className="d-flex gap-2"><button type="button" className="btn btn-label-primary flex-grow-1" onClick={() => onPreview(row)}><i className="icon-base ti tabler-eye me-2" aria-hidden="true" />View change</button><Link href={`/admin/orgs/${row.orgId}`} className="btn btn-icon btn-label-secondary" aria-label={`Open ${row.orgName}`}><i className="icon-base ti tabler-building" aria-hidden="true" /></Link></div>
      </div>
    </article>
  );
}

function ActionButtons({ row, onPreview }: { row: AdminActionLogRow; onPreview: (row: AdminActionLogRow) => void }) {
  return <div className="d-inline-flex align-items-center mm-action-action-cluster"><button type="button" className="btn btn-icon btn-label-primary rounded btn-sm" aria-label={`View change for ${row.orgName}`} onClick={() => onPreview(row)}><i className="icon-base ti tabler-eye" aria-hidden="true" /></button><Link href={`/admin/orgs/${row.orgId}`} className="btn btn-icon btn-label-secondary rounded btn-sm" aria-label={`Open ${row.orgName}`}><i className="icon-base ti tabler-building" aria-hidden="true" /></Link></div>;
}

function ActionDetailDialog({ row, onClose }: { row: AdminActionLogRow; onClose: () => void }) {
  const descriptor = getActionDescriptor(row.action);
  const changes = getActionChanges(row);
  return (
    <StaffDialog title={descriptor.label} subtitle="Immutable staff write with the stored before and after snapshots." labelledBy={`Admin action ${row.id}`} busy={false} onClose={onClose} wide>
      <div className="mm-action-detail">
        <div className="row g-4 mb-6">
          <PreviewDatum className="col-6 col-lg-3" label="Recorded" value={formatDateTime(row.createdAt)} />
          <PreviewDatum className="col-6 col-lg-3" label="Staff" value={row.staffEmail} />
          <PreviewDatum className="col-6 col-lg-3" label="Customer" value={row.orgName} />
          <PreviewDatum className="col-6 col-lg-3" label="Target ID" value={row.targetId ?? 'Organization'} />
        </div>
        <div className="alert alert-primary d-flex align-items-start gap-3 mb-6" role="note"><i className="icon-base ti tabler-message-circle-check icon-24px flex-shrink-0" aria-hidden="true" /><div><h6 className="alert-heading mb-1">Recorded reason</h6><p className="mb-0">{row.reason}</p></div></div>
        <div className="d-flex align-items-center justify-content-between gap-3 mb-3"><h6 className="mb-0">Changed fields</h6><span className="badge bg-label-secondary">{changes.length} differences</span></div>
        {changes.length === 0 ? <p className="text-body-secondary">The stored snapshots contain no top-level field difference.</p> : (
          <div className="d-grid gap-3 mb-6">
            {changes.map((change) => <ChangeRow key={change.field} field={change.field} before={change.before} after={change.after} />)}
          </div>
        )}
        <div className="row g-4 mm-action-request-meta rounded p-4">
          <PreviewDatum className="col-12 col-md-4" label="IP address" value={row.ip ?? 'Not recorded'} />
          <PreviewDatum className="col-12 col-md-4" label="Client" value={getClientLabel(row.userAgent)} />
          <PreviewDatum className="col-12 col-md-4" label="Action key" value={row.action} />
        </div>
        <details className="mt-5"><summary className="text-primary fw-medium">Show raw snapshots</summary><div className="row g-3 mt-1"><RawSnapshot title="Before" value={row.before} /><RawSnapshot title="After" value={row.after} /></div></details>
        <div className="d-flex flex-wrap justify-content-center gap-3 mt-6"><button type="button" className="btn btn-label-secondary" onClick={onClose}>Close</button><Link href={`/admin/orgs/${row.orgId}`} className="btn btn-primary">Open customer detail<i className="icon-base ti tabler-external-link ms-2" aria-hidden="true" /></Link></div>
      </div>
    </StaffDialog>
  );
}

function ChangeRow({ field, before, after }: { field: string; before: unknown; after: unknown }) {
  return <div className="row g-3 align-items-stretch mm-action-change-row"><div className="col-12 col-lg-3"><div className="h-100 d-flex align-items-center"><div><small className="text-body-secondary d-block">Field</small><span className="fw-semibold text-heading">{humanize(field)}</span></div></div></div><div className="col-6 col-lg-4"><div className="h-100 rounded bg-body-secondary p-3"><small className="text-body-secondary d-block mb-1">Previous</small><span className="text-heading text-break">{formatActionValue(before)}</span></div></div><div className="col-6 col-lg-5"><div className="h-100 rounded bg-label-primary p-3"><small className="text-primary d-block mb-1">New value</small><span className="text-heading fw-medium text-break">{formatActionValue(after)}</span></div></div></div>;
}

function StaffIdentity({ email }: { email: string }) {
  return <div className="d-flex align-items-center gap-3 min-w-0"><span className="avatar avatar-sm flex-shrink-0"><span className="avatar-initial rounded-circle bg-label-primary text-primary">{getInitials(email.split('@')[0] ?? email)}</span></span><div className="min-w-0"><span className="fw-medium text-heading d-block text-truncate">{email.split('@')[0]}</span><small className="text-body-secondary d-block text-truncate">{email}</small></div></div>;
}

function CustomerIdentity({ row }: { row: AdminActionLogRow }) {
  return <div className="d-flex align-items-center gap-3 min-w-0"><span className="avatar avatar-sm flex-shrink-0"><span className="avatar-initial rounded-circle bg-label-info text-info">{getInitials(row.orgName)}</span></span><div className="min-w-0"><Link href={`/admin/orgs/${row.orgId}`} className="fw-medium text-heading d-block text-truncate">{row.orgName}</Link><small className="text-body-secondary d-block text-truncate">Customer workspace</small></div></div>;
}

function ActionBadge({ action }: { action: string }) {
  const descriptor = getActionDescriptor(action);
  return <span className={`badge bg-label-${descriptor.tone} d-inline-flex align-items-center gap-1`}><i className={`icon-base ti ${descriptor.icon}`} aria-hidden="true" />{descriptor.label}</span>;
}

function PreviewDatum({ label, value, className = 'col-12 col-sm-4' }: { label: string; value: string; className?: string }) {
  return <div className={className}><small className="text-body-secondary d-block mb-1">{label}</small><span className="text-heading fw-medium d-block text-break">{value}</span></div>;
}

function RawSnapshot({ title, value }: { title: string; value: unknown }) {
  return <div className="col-12 col-md-6"><small className="text-body-secondary d-block mb-2">{title}</small><pre className="bg-body-secondary rounded p-3 mb-0 small text-wrap">{JSON.stringify(value, null, 2)}</pre></div>;
}

function getMostCommon(values: readonly string[]): string | null {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function getInitials(value: string): string {
  const parts = value.split(/[^a-z0-9&]+/i).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function relativeTime(value: string): string {
  const delta = Date.now() - Date.parse(value);
  if (!Number.isFinite(delta) || delta < 0) return 'Recently';
  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getClientLabel(userAgent: string | null): string {
  if (!userAgent) return 'Not recorded';
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/Chrome\//i.test(userAgent)) return 'Google Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  return 'Other client';
}

function exportRows(rows: readonly AdminActionLogRow[]) {
  const columns = ['Event ID', 'Recorded', 'Staff', 'Customer', 'Action', 'Target ID', 'Changed fields', 'Reason', 'IP', 'Client'];
  const body = rows.map((row) => [row.id, row.createdAt, row.staffEmail, row.orgName, row.action, row.targetId ?? '', getActionChanges(row).map((item) => item.field).join('; '), row.reason, row.ip ?? '', getClientLabel(row.userAgent)]);
  const csv = [columns, ...body].map((items) => items.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `mailmyra-admin-actions-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

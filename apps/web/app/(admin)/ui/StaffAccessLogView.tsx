'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  getAccessReviewFacts,
  getAccessScopeIcon,
  getAccessScopeLabel,
  getClientLabel,
  matchesAccessPeriod,
  sortAccessRows,
  summarizeAccessLog,
  type AccessPeriod,
  type AccessSignal,
  type AccessSort,
  type StaffAccessLogRow,
} from '../access-log-model';
import { AdminEmptyState } from './AdminEmptyState';
import { StaffDialog } from './StaffDialog';

export function StaffAccessLogView({
  rows,
  now,
}: {
  rows: StaffAccessLogRow[];
  now: number;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [orgId, setOrgId] = useState('all');
  const [staff, setStaff] = useState('all');
  const [period, setPeriod] = useState<AccessPeriod>('30');
  const [signal, setSignal] = useState<AccessSignal>('all');
  const [sort, setSort] = useState<AccessSort>('newest');
  const [previewRow, setPreviewRow] = useState<StaffAccessLogRow | null>(null);

  const summary = useMemo(() => summarizeAccessLog(rows, now), [now, rows]);
  const scopes = useMemo(() => [...new Set(rows.map((row) => row.scope))].sort(), [rows]);
  const staffMembers = useMemo(
    () => [...new Set(rows.map((row) => row.staffEmail))].sort(),
    [rows],
  );
  const organizations = useMemo(
    () => [...new Map(rows.map((row) => [row.orgId, row.orgName])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const review = getAccessReviewFacts(row, rows);
      if (
        needle &&
        !row.staffEmail.toLowerCase().includes(needle) &&
        !row.orgName.toLowerCase().includes(needle) &&
        !row.targetId?.toLowerCase().includes(needle) &&
        !row.ip?.toLowerCase().includes(needle)
      ) return false;
      if (scope !== 'all' && row.scope !== scope) return false;
      if (orgId !== 'all' && row.orgId !== orgId) return false;
      if (staff !== 'all' && row.staffEmail !== staff) return false;
      if (signal !== 'all' && review.signal !== signal) return false;
      return matchesAccessPeriod(row, period, now);
    });
    return sortAccessRows(filtered, sort);
  }, [now, orgId, period, query, rows, scope, signal, sort, staff]);

  const hasFilters = query.trim() !== '' || scope !== 'all' || orgId !== 'all' ||
    staff !== 'all' || period !== '30' || signal !== 'all' || sort !== 'newest';
  const scopeCounts = useMemo(
    () => scopes.map((item) => ({
      scope: item,
      count: rows.filter((row) => row.scope === item).length,
    })).sort((a, b) => b.count - a.count),
    [rows, scopes],
  );
  const topScope = scopeCounts[0];
  const topCustomer = useMemo(() => {
    const counts = organizations.map(([id, name]) => ({
      id,
      name,
      count: rows.filter((row) => row.orgId === id).length,
    }));
    return counts.sort((a, b) => b.count - a.count)[0];
  }, [organizations, rows]);

  const resetFilters = () => {
    setQuery('');
    setScope('all');
    setOrgId('all');
    setStaff('all');
    setPeriod('30');
    setSignal('all');
    setSort('newest');
  };

  const exportCsv = () => {
    const header = ['Event ID', 'Timestamp UTC', 'Staff', 'Customer', 'Scope', 'Target', 'IP', 'Client', 'Review signal'];
    const lines = visible.map((row) => {
      const review = getAccessReviewFacts(row, rows);
      return [
        row.id,
        row.createdAt,
        row.staffEmail,
        row.orgName,
        getAccessScopeLabel(row.scope),
        row.targetId ?? '',
        row.ip ?? '',
        getClientLabel(row.userAgent),
        review.label,
      ].map(csvCell).join(',');
    });
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mailmyra-staff-access-${new Date(now).toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="card mb-6 mm-access-summary" aria-label="Access log summary">
        <div className="card-widget-separator-wrapper">
          <div className="card-body card-widget-separator">
            <div className="row gy-4 gy-sm-1">
              <SummaryWidget icon="tabler-eye" label="Sensitive reads" value={summary.reads} support="Loaded audit window" />
              <SummaryWidget icon="tabler-calendar-event" label="Reads today" value={summary.readsToday} support="Since local midnight" tone="info" />
              <SummaryWidget icon="tabler-user-shield" label="Active staff" value={summary.activeStaff} support="Distinct staff identities" tone="success" />
              <SummaryWidget icon="tabler-building" label="Customers viewed" value={summary.customersAccessed} support={`${summary.reviewSignals} review ${summary.reviewSignals === 1 ? 'signal' : 'signals'}`} tone={summary.reviewSignals ? 'warning' : 'secondary'} last />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-6 mm-access-context" aria-label="Access context">
        <div className="card-body py-4">
          <div className="row g-4 align-items-center">
            <ContextItem
              icon="tabler-shield-lock"
              tone="primary"
              label="Immutable ledger"
              value="Read-only audit trail"
              support="No edit or delete controls are exposed."
            />
            <ContextItem
              icon={getAccessScopeIcon(topScope?.scope ?? '')}
              tone="info"
              label="Most read scope"
              value={topScope ? getAccessScopeLabel(topScope.scope) : 'No reads yet'}
              support={topScope ? `${topScope.count} events in the loaded window` : 'Waiting for the first event'}
            />
            <ContextItem
              icon="tabler-building-skyscraper"
              tone="warning"
              label="Most viewed customer"
              value={topCustomer?.name ?? 'No customer yet'}
              support={topCustomer ? `${topCustomer.count} sensitive reads` : 'Waiting for the first event'}
            />
          </div>
        </div>
      </section>

      <section className="card mm-access-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h5 className="card-title mb-0">Sensitive read ledger</h5>
                <span className="badge bg-label-secondary">{visible.length} results</span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                Review who opened customer data, what they viewed and when it happened.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {hasFilters && (
                <button type="button" className="btn btn-sm btn-label-secondary" onClick={resetFilters}>
                  <i className="icon-base ti tabler-filter-x me-1" aria-hidden="true" />
                  Reset
                </button>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={exportCsv} disabled={visible.length === 0}>
                <i className="icon-base ti tabler-file-download me-2" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-access-focus" role="group" aria-label="Review focus">
              <button type="button" className={`nav-link${signal === 'all' ? ' active' : ''}`} onClick={() => setSignal('all')}>All reads</button>
              <button type="button" className={`nav-link${signal === 'review' ? ' active' : ''}`} onClick={() => setSignal('review')}>
                Review signals
                {summary.reviewSignals > 0 && <span className="badge rounded-pill bg-warning ms-2">{summary.reviewSignals}</span>}
              </button>
              <button type="button" className={`nav-link${signal === 'routine' ? ' active' : ''}`} onClick={() => setSignal('routine')}>Routine reads</button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <label className="form-label" htmlFor="access-search">Search audit trail</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text"><i className="icon-base ti tabler-search" aria-hidden="true" /></span>
                <input id="access-search" type="search" className="form-control" placeholder="Staff, customer, target or IP" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            <FilterSelect id="access-period" label="Period" value={period} onChange={(value) => setPeriod(value as AccessPeriod)} options={[
              ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'Loaded history'],
            ]} />
            <FilterSelect id="access-scope" label="Scope" value={scope} onChange={setScope} options={[
              ['all', 'All scopes'], ...scopes.map((item) => [item, getAccessScopeLabel(item)] as [string, string]),
            ]} />
            <FilterSelect id="access-customer" label="Customer" value={orgId} onChange={setOrgId} options={[
              ['all', 'All customers'], ...organizations,
            ]} />
            <FilterSelect id="access-staff" label="Staff" value={staff} onChange={setStaff} options={[
              ['all', 'All staff'], ...staffMembers.map((item) => [item, item] as [string, string]),
            ]} />
            <FilterSelect id="access-sort" label="Sort by" value={sort} onChange={(value) => setSort(value as AccessSort)} options={[
              ['newest', 'Newest first'], ['oldest', 'Oldest first'], ['customer', 'Customer'], ['staff', 'Staff member'],
            ]} />
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState icon="tabler-shield-off" text={rows.length === 0 ? 'No sensitive reads have been recorded yet.' : 'No access event matches these filters.'} />
        ) : (
          <>
            <div className="table-responsive mm-access-desktop-table">
              <table className="table table-hover mm-access-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Staff member</th>
                    <th>Customer</th>
                    <th>Scope</th>
                    <th>Target</th>
                    <th>Review signal</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => <AccessTableRow key={row.id} row={row} rows={rows} now={now} onPreview={setPreviewRow} />)}
                </tbody>
              </table>
            </div>
            <div className="mm-access-responsive-cards p-4">
              <div className="row g-4">
                {visible.map((row) => <AccessMobileCard key={row.id} row={row} rows={rows} now={now} onPreview={setPreviewRow} />)}
              </div>
            </div>
          </>
        )}

        <div className="card-footer d-flex flex-wrap justify-content-between gap-2 text-body-secondary small">
          <span>Showing {visible.length} of {rows.length} loaded events</span>
          <span><i className="icon-base ti tabler-lock me-1" aria-hidden="true" />Append-only audit data</span>
        </div>
      </section>

      {previewRow && <AccessDetailDialog row={previewRow} rows={rows} onClose={() => setPreviewRow(null)} />}
    </>
  );
}

function SummaryWidget({ icon, label, value, support, tone = 'primary', last = false }: {
  icon: string;
  label: string;
  value: number;
  support: string;
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  last?: boolean;
}) {
  return (
    <div className="col-6 col-lg-3">
      <div className={`d-flex justify-content-between align-items-center pb-4 pb-sm-0${last ? '' : ' border-end mm-access-widget'}`}>
        <div className="min-w-0">
          <h4 className="mb-1 text-truncate">{value.toLocaleString('en-US')}</h4>
          <p className="mb-1">{label}</p>
          <small className="text-body-secondary">{support}</small>
        </div>
        <span className="avatar me-sm-4 flex-shrink-0">
          <span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}>
            <i className={`icon-base ti ${icon} icon-26px`} aria-hidden="true" />
          </span>
        </span>
      </div>
    </div>
  );
}

function ContextItem({ icon, tone, label, value, support }: { icon: string; tone: 'primary' | 'info' | 'warning'; label: string; value: string; support: string }) {
  return (
    <div className="col-12 col-md-4">
      <div className="d-flex align-items-center gap-3">
        <span className="avatar avatar-md flex-shrink-0">
          <span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}>
            <i className={`icon-base ti ${icon}`} aria-hidden="true" />
          </span>
        </span>
        <div className="min-w-0">
          <small className="text-uppercase text-body-secondary">{label}</small>
          <div className="fw-medium text-heading text-truncate">{value}</div>
          <small className="text-body-secondary">{support}</small>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>;
}) {
  return (
    <div className="col-12 col-sm-6 col-xl">
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function AccessTableRow({ row, rows, now, onPreview }: {
  row: StaffAccessLogRow; rows: StaffAccessLogRow[]; now: number; onPreview: (row: StaffAccessLogRow) => void;
}) {
  const review = getAccessReviewFacts(row, rows);
  return (
    <tr>
      <td><TimeCell value={row.createdAt} now={now} /></td>
      <td><StaffIdentity email={row.staffEmail} /></td>
      <td>
        <Link href={`/admin/orgs/${row.orgId}`} className="fw-medium text-heading">{row.orgName}</Link>
        <small className="d-block text-body-secondary">{getClientLabel(row.userAgent)}</small>
      </td>
      <td><ScopeBadge scope={row.scope} /></td>
      <td><code className="small text-body-secondary">{shortTarget(row.targetId)}</code></td>
      <td><ReviewBadge review={review} /></td>
      <td className="text-end">
        <div className="d-inline-flex mm-access-action-cluster">
          <button type="button" className="btn btn-sm btn-icon btn-label-primary" aria-label={`View access event for ${row.orgName}`} title="View event" onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
          <Link href={`/admin/orgs/${row.orgId}`} className="btn btn-sm btn-icon btn-label-secondary" aria-label={`Open ${row.orgName}`} title="Open customer">
            <i className="icon-base ti tabler-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function AccessMobileCard({ row, rows, now, onPreview }: {
  row: StaffAccessLogRow; rows: StaffAccessLogRow[]; now: number; onPreview: (row: StaffAccessLogRow) => void;
}) {
  const review = getAccessReviewFacts(row, rows);
  return (
    <div className="col-12 col-md-6">
      <article className="border rounded p-4 h-100 mm-access-mobile-card">
        <div className="d-flex justify-content-between gap-3 mb-4">
          <StaffIdentity email={row.staffEmail} />
          <button type="button" className="btn btn-sm btn-icon btn-label-primary" aria-label="View access event" onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
        </div>
        <Link href={`/admin/orgs/${row.orgId}`} className="h6 d-block mb-1">{row.orgName}</Link>
        <TimeCell value={row.createdAt} now={now} />
        <div className="d-flex flex-wrap gap-2 mt-4 mb-3"><ScopeBadge scope={row.scope} /><ReviewBadge review={review} /></div>
        <div className="d-flex justify-content-between gap-3 pt-3 border-top small">
          <span className="text-body-secondary">Target</span>
          <code className="text-body-secondary text-end">{shortTarget(row.targetId)}</code>
        </div>
      </article>
    </div>
  );
}

function AccessDetailDialog({ row, rows, onClose }: { row: StaffAccessLogRow; rows: StaffAccessLogRow[]; onClose: () => void }) {
  const review = getAccessReviewFacts(row, rows);
  return (
    <StaffDialog title="Sensitive read event" subtitle="Immutable staff access record" labelledBy="Sensitive read event details" busy={false} onClose={onClose} wide>
      <div className="alert alert-outline-primary d-flex align-items-start gap-3 mb-5" role="note">
        <i className="icon-base ti tabler-shield-lock mt-1" aria-hidden="true" />
        <div><strong>Read-only evidence.</strong><div className="small">This record cannot be edited or deleted from the control plane.</div></div>
      </div>
      <div className="row g-4">
        <DetailItem label="Event ID" value={row.id} mono />
        <DetailItem label="Timestamp (UTC)" value={formatUtc(row.createdAt)} />
        <DetailItem label="Staff member" value={row.staffEmail} />
        <DetailItem label="Customer" value={row.orgName} />
        <DetailItem label="Scope" value={getAccessScopeLabel(row.scope)} />
        <DetailItem label="Target ID" value={row.targetId ?? 'Not a single-record read'} mono />
        <DetailItem label="IP address" value={row.ip ?? 'Not recorded'} mono />
        <DetailItem label="Client" value={getClientLabel(row.userAgent)} />
      </div>
      <div className={`alert ${review.signal === 'review' ? 'alert-warning' : 'alert-secondary'} mt-5 mb-0`}>
        <div className="d-flex gap-3">
          <i className={`icon-base ti ${review.signal === 'review' ? 'tabler-alert-triangle' : 'tabler-circle-check'} mt-1`} aria-hidden="true" />
          <div><strong>{review.label}</strong><div className="small mt-1">{review.detail}</div><div className="small mt-2">A review signal is a workload heuristic, not a confirmed security incident.</div></div>
        </div>
      </div>
      {row.userAgent && (
        <div className="mt-5">
          <label className="form-label">Raw user agent</label>
          <div className="bg-body-secondary rounded p-3 small text-break font-monospace">{row.userAgent}</div>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-6">
        <Link href={`/admin/orgs/${row.orgId}`} className="btn btn-label-primary">Open customer</Link>
        <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </StaffDialog>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="col-12 col-md-6"><small className="text-uppercase text-body-secondary">{label}</small><div className={`mt-1 text-break${mono ? ' font-monospace small' : ' fw-medium text-heading'}`}>{value}</div></div>;
}

function StaffIdentity({ email }: { email: string }) {
  return (
    <div className="d-flex align-items-center gap-3 min-w-0">
      <span className="avatar avatar-sm flex-shrink-0">
        <span className="avatar-initial rounded-circle bg-label-primary text-primary">{initials(email)}</span>
      </span>
      <div className="min-w-0"><span className="fw-medium text-heading d-block text-truncate">{email.split('@')[0]}</span><small className="text-body-secondary d-block text-truncate">{email}</small></div>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  return <span className="badge bg-label-info"><i className={`icon-base ti ${getAccessScopeIcon(scope)} me-1`} aria-hidden="true" />{getAccessScopeLabel(scope)}</span>;
}

function ReviewBadge({ review }: { review: ReturnType<typeof getAccessReviewFacts> }) {
  return <span className={`badge bg-label-${review.signal === 'review' ? 'warning' : 'secondary'}`} title={review.detail}><i className={`icon-base ti ${review.signal === 'review' ? 'tabler-alert-triangle' : 'tabler-circle-check'} me-1`} aria-hidden="true" />{review.label}</span>;
}

function TimeCell({ value, now }: { value: string; now: number }) {
  return <div><span className="fw-medium text-heading d-block">{formatRelative(value, now)}</span><small className="text-body-secondary">{formatUtc(value)}</small></div>;
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function formatRelative(value: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function shortTarget(value: string | null): string {
  if (!value) return 'Whole scope';
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function initials(email: string): string {
  const parts = (email.split('@')[0] ?? '').split(/[._-]/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ST';
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  describeTrialWindow,
  getTrialFacts,
  getTrialTimeline,
  matchesTrialFocus,
  sortTrialRows,
  summarizeTrials,
  type TrialEntitlementRow,
  type TrialFocus,
  type TrialSort,
} from '../trials-model';
import { useDropdown } from '../../(app)/navbar/useDropdown';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminStatusBadge } from './AdminStatusBadge';
import { StaffDialog } from './StaffDialog';

type StateFilter = '' | 'trial' | 'active' | 'past_due' | 'cancelled';

const FOCUS_OPTIONS: ReadonlyArray<{ value: TrialFocus; label: string }> = [
  { value: 'all', label: 'All customers' },
  { value: 'active', label: 'Active trials' },
  { value: 'ending', label: 'Ending soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'over', label: 'Over seats' },
];

export function TrialsEntitlementsView({
  rows,
  now,
}: {
  rows: TrialEntitlementRow[];
  now: number;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<StateFilter>('');
  const [focus, setFocus] = useState<TrialFocus>('all');
  const [sort, setSort] = useState<TrialSort>('attention');
  const [previewRow, setPreviewRow] = useState<TrialEntitlementRow | null>(null);
  const summary = useMemo(() => summarizeTrials(rows, now), [rows, now]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (state && row.entitlementState !== state) return false;
      return matchesTrialFocus(row, focus, now);
    });
    return sortTrialRows(filtered, sort, now);
  }, [focus, now, query, rows, sort, state]);

  const hasFilters = query.trim() !== '' || state !== '' || focus !== 'all' || sort !== 'attention';

  return (
    <>
      <div className="row g-6 mb-6" aria-label="Trial and entitlement summary">
        <MetricCard
          icon="tabler-hourglass-high"
          tone="info"
          label="Active trials"
          value={summary.activeTrials}
          support={
            summary.missingEndDate > 0
              ? `${summary.missingEndDate} missing an end date`
              : 'Current trial workspaces'
          }
        />
        <MetricCard
          icon="tabler-calendar-time"
          tone="warning"
          label="Ending in 7 days"
          value={summary.endingSoon}
          support="Follow-up window"
        />
        <MetricCard
          icon="tabler-alert-triangle"
          tone="danger"
          label="Expired trials"
          value={summary.expired}
          support="Still marked as trial"
        />
        <MetricCard
          icon="tabler-user-exclamation"
          tone="primary"
          label="Over entitlement"
          value={summary.overEntitlement}
          support="Active seats exceed allowance"
        />
      </div>

      {summary.missingEndDate > 0 && (
        <div className="alert alert-warning d-flex align-items-start gap-3 mb-6" role="status">
          <i className="icon-base ti tabler-calendar-question icon-24px mt-1" aria-hidden="true" />
          <div>
            <h6 className="alert-heading mb-1">Trial dates need attention</h6>
            <p className="mb-0">
              {summary.missingEndDate} trial workspace{summary.missingEndDate === 1 ? ' has' : 's have'} no end date. Open the customer record before changing entitlement data.
            </p>
          </div>
        </div>
      )}

      <div className="card mm-trials-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0">Trial control desk</h5>
                <span className="badge bg-label-secondary">
                  {visible.length} {visible.length === 1 ? 'result' : 'results'}
                </span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                Root billing organizations only. Entitlement changes remain in customer detail.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                className="btn btn-sm btn-label-secondary"
                onClick={() => {
                  setQuery('');
                  setState('');
                  setFocus('all');
                  setSort('attention');
                }}
              >
                <i className="icon-base ti tabler-filter-x me-1" aria-hidden="true" />
                Reset filters
              </button>
            )}
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-trials-focus" role="group" aria-label="Operational focus">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`nav-link${focus === option.value ? ' active' : ''}`}
                  aria-pressed={focus === option.value}
                  onClick={() => setFocus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <label className="form-label" htmlFor="trial-search">Search organization</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="icon-base ti tabler-search" aria-hidden="true" />
                </span>
                <input
                  id="trial-search"
                  type="search"
                  className="form-control"
                  placeholder="Organization name"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="trial-state">Plan state</label>
              <select
                id="trial-state"
                className="form-select"
                value={state}
                onChange={(event) => setState(event.target.value as StateFilter)}
              >
                <option value="">All states</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <label className="form-label" htmlFor="trial-sort">Sort by</label>
              <select
                id="trial-sort"
                className="form-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as TrialSort)}
              >
                <option value="attention">Attention first</option>
                <option value="trial_end">Trial end date</option>
                <option value="seat_usage">Seat utilization</option>
                <option value="recent_activity">Recent activity</option>
              </select>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState
            icon="tabler-filter-off"
            text={rows.length === 0 ? 'No customer entitlement records yet.' : 'No customer matches these filters.'}
          />
        ) : (
          <>
            <div className="card-datatable table-responsive d-none d-lg-block">
              <table className="table table-hover border-top mm-trials-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Plan state</th>
                    <th>Trial window</th>
                    <th style={{ minWidth: 170 }}>Seat utilization</th>
                    <th>Members</th>
                    <th>Last activity</th>
                    <th className="text-end" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <TrialTableRow key={row.id} row={row} now={now} onPreview={setPreviewRow} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-lg-none p-3 p-sm-4">
              <div className="d-grid gap-3">
                {visible.map((row) => (
                  <TrialMobileCard key={row.id} row={row} now={now} onPreview={setPreviewRow} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {previewRow && (
        <TrialPreviewDialog row={previewRow} now={now} onClose={() => setPreviewRow(null)} />
      )}
    </>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  support,
}: {
  icon: string;
  tone: 'primary' | 'info' | 'warning' | 'danger';
  label: string;
  value: number;
  support: string;
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className={`card h-100 card-border-shadow-${tone} mm-trial-metric`}>
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div>
              <span className="text-body-secondary d-block mb-2">{label}</span>
              <h3 className="mb-1">{value}</h3>
              <small className="text-body-secondary">{support}</small>
            </div>
            <span className="avatar avatar-md">
              <span className={`avatar-initial rounded bg-label-${tone}`}>
                <i className={`icon-base ti ${icon} icon-24px`} aria-hidden="true" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrialTableRow({
  row,
  now,
  onPreview,
}: {
  row: TrialEntitlementRow;
  now: number;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const facts = getTrialFacts(row, now);
  const progressWidth = Math.min(100, facts.utilization);

  return (
    <tr>
      <td><OrganizationIdentity row={row} /></td>
      <td><AdminStatusBadge value={row.entitlementState} /></td>
      <td><TrialTimelineCell row={row} now={now} /></td>
      <td>
        <div className="d-flex align-items-center justify-content-between gap-3 mb-1">
          <small className={facts.isOverEntitlement ? 'text-danger fw-medium' : 'text-heading'}>
            {row.activeSeats}/{row.entitledSeats} active
          </small>
          <small className="text-body-secondary">{facts.utilization}%</small>
        </div>
        <div className="progress" style={{ height: 6 }}>
          <div
            className={`progress-bar${facts.isOverEntitlement ? ' bg-danger' : ''}`}
            style={{ width: `${progressWidth}%` }}
            role="progressbar"
            aria-label={`${row.name} seat utilization`}
            aria-valuenow={Math.min(100, facts.utilization)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </td>
      <td>{row.memberCount}</td>
      <td className="text-body-secondary">{row.lastActivityAt?.slice(0, 10) ?? 'No activity'}</td>
      <td className="text-end">
        <div className="d-inline-flex align-items-center mm-trials-action-cluster">
          <button
            type="button"
            className="btn btn-icon btn-label-primary rounded btn-sm"
            aria-label={`Preview ${row.name}`}
            title={`Preview ${row.name}`}
            onClick={() => onPreview(row)}
          >
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
          <TrialRowActions row={row} onPreview={onPreview} />
        </div>
      </td>
    </tr>
  );
}

function TrialMobileCard({
  row,
  now,
  onPreview,
}: {
  row: TrialEntitlementRow;
  now: number;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const facts = getTrialFacts(row, now);

  return (
    <article className="card border-0 shadow-sm mm-trial-mobile-card">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <OrganizationIdentity row={row} />
          <AdminStatusBadge value={row.entitlementState} />
        </div>
        <div className="mb-4"><TrialTimelineCell row={row} now={now} /></div>
        <div className="d-flex justify-content-between gap-3 mb-1">
          <small className="text-heading">Seat utilization</small>
          <small className={facts.isOverEntitlement ? 'text-danger fw-medium' : 'text-body-secondary'}>
            {row.activeSeats}/{row.entitledSeats} · {facts.utilization}%
          </small>
        </div>
        <div className="progress mb-4" style={{ height: 6 }}>
          <div
            className={`progress-bar${facts.isOverEntitlement ? ' bg-danger' : ''}`}
            style={{ width: `${Math.min(100, facts.utilization)}%` }}
          />
        </div>
        <div className="row g-3 mb-4">
          <div className="col-6">
            <small className="text-body-secondary d-block">Members</small>
            <span className="text-heading fw-medium">{row.memberCount}</span>
          </div>
          <div className="col-6">
            <small className="text-body-secondary d-block">Last activity</small>
            <span className="text-heading fw-medium">{row.lastActivityAt?.slice(0, 10) ?? 'None'}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-label-primary flex-grow-1" onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
            Quick preview
          </button>
          <TrialRowActions row={row} onPreview={onPreview} />
        </div>
      </div>
    </article>
  );
}

function TrialTimelineCell({ row, now }: { row: TrialEntitlementRow; now: number }) {
  const window = describeTrialWindow(row, now);
  const timeline = getTrialTimeline(row, now);

  if (!timeline) {
    return (
      <div className="mm-trial-timeline">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <span className={`badge bg-label-${window.tone}`}>{window.label}</span>
          {window.date && <small className="text-body-secondary">{window.date}</small>}
        </div>
        {row.entitlementState === 'trial' && (
          <small className="text-body-secondary d-block mt-2">Add a valid end date to track progress.</small>
        )}
      </div>
    );
  }

  return (
    <div className="mm-trial-timeline">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
        <span className={`text-${timeline.tone} fw-medium`}>{window.label}</span>
        {window.date && <small className="text-body-secondary">{window.date}</small>}
      </div>
      <div
        className="progress mm-trial-progress"
        role="progressbar"
        aria-label={`${row.name} trial timeline`}
        aria-valuenow={timeline.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`progress-bar bg-${timeline.tone}`} style={{ width: `${timeline.percent}%` }} />
      </div>
      <div className="d-flex align-items-center justify-content-between gap-3 mt-2">
        <small className="text-body-secondary">
          Day {timeline.elapsedDays} of {timeline.totalDays}
        </small>
        <small className={`text-${timeline.tone}`}>
          {timeline.remainingDays > 0 ? `${timeline.remainingDays}d left` : 'Complete'}
        </small>
      </div>
    </div>
  );
}

function TrialRowActions({
  row,
  onPreview,
}: {
  row: TrialEntitlementRow;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="btn btn-icon btn-label-secondary rounded btn-sm dropdown-toggle hide-arrow"
        aria-label={`Actions for ${row.name}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-dots-vertical" aria-hidden="true" />
      </button>
      <ul
        className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}
        style={open ? { position: 'absolute', right: 0 } : undefined}
      >
        <li>
          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              setOpen(false);
              onPreview(row);
            }}
          >
            <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
            Quick preview
          </button>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <Link href={`/admin/orgs/${row.id}`} className="dropdown-item" onClick={() => setOpen(false)}>
            <i className="icon-base ti tabler-building me-2" aria-hidden="true" />
            Open customer detail
          </Link>
        </li>
      </ul>
    </div>
  );
}

function TrialPreviewDialog({
  row,
  now,
  onClose,
}: {
  row: TrialEntitlementRow;
  now: number;
  onClose: () => void;
}) {
  const facts = getTrialFacts(row, now);
  const timeline = getTrialTimeline(row, now);
  const window = describeTrialWindow(row, now);

  return (
    <StaffDialog
      title="Customer entitlement preview"
      subtitle="A read-only operational snapshot. Changes remain in the audited customer detail page."
      labelledBy={`Entitlement preview for ${row.name}`}
      busy={false}
      onClose={onClose}
      wide
    >
      <div className="mm-trial-preview">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-6">
          <OrganizationIdentity row={row} />
          <AdminStatusBadge value={row.entitlementState} />
        </div>

        <div className="row g-5">
          <div className="col-md-7">
            <section className="mm-trial-preview-panel rounded p-5 h-100" aria-labelledby="trial-preview-timeline">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                <div>
                  <small className="text-uppercase text-body-secondary d-block mb-1">Trial timeline</small>
                  <h5 id="trial-preview-timeline" className="mb-0">{window.label}</h5>
                </div>
                <span className="avatar avatar-sm">
                  <span className={`avatar-initial rounded bg-label-${window.tone}`}>
                    <i className="icon-base ti tabler-calendar-time" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <TrialTimelineCell row={row} now={now} />
              <div className="row g-3 mt-4">
                <PreviewDatum className="col-12 col-sm-4" label="Started" value={row.createdAt.slice(0, 10)} />
                <PreviewDatum className="col-12 col-sm-4" label="Ends" value={window.date ?? 'Not set'} />
                <PreviewDatum className="col-12 col-sm-4" label="Duration" value={timeline ? `${timeline.totalDays} days` : 'Unavailable'} />
              </div>
            </section>
          </div>

          <div className="col-md-5">
            <section className="mm-trial-preview-panel rounded p-5 h-100" aria-labelledby="trial-preview-seats">
              <small className="text-uppercase text-body-secondary d-block mb-1">Entitlement</small>
              <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
                <h5 id="trial-preview-seats" className="mb-0">Seat utilization</h5>
                <strong className={facts.isOverEntitlement ? 'text-danger' : 'text-heading'}>
                  {facts.utilization}%
                </strong>
              </div>
              <div
                className="progress mb-3"
                style={{ height: 8 }}
                role="progressbar"
                aria-label={`${row.name} entitlement utilization`}
                aria-valuenow={Math.min(100, facts.utilization)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`progress-bar${facts.isOverEntitlement ? ' bg-danger' : ''}`}
                  style={{ width: `${Math.min(100, facts.utilization)}%` }}
                />
              </div>
              <p className="text-body-secondary mb-4">
                {row.activeSeats} active of {row.entitledSeats} entitled seats
              </p>
              {facts.isOverEntitlement && (
                <div className="alert alert-danger py-2 px-3 mb-0" role="status">
                  <small>{row.activeSeats - row.entitledSeats} active seat{row.activeSeats - row.entitledSeats === 1 ? '' : 's'} over allowance.</small>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="row g-0 mt-5 mm-trial-preview-strip">
          <PreviewDatum label="Members" value={String(row.memberCount)} />
          <PreviewDatum label="Child workspaces" value={String(row.childCount)} />
          <PreviewDatum label="Last activity" value={row.lastActivityAt?.slice(0, 10) ?? 'No activity'} />
          <PreviewDatum label="Billing scope" value={row.childCount > 0 ? 'Root organization' : 'Single workspace'} />
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3 mt-6">
          <button type="button" className="btn btn-label-secondary" onClick={onClose}>Close</button>
          <Link href={`/admin/orgs/${row.id}`} className="btn btn-primary">
            Open customer detail
            <i className="icon-base ti tabler-external-link ms-2" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </StaffDialog>
  );
}

function PreviewDatum({
  label,
  value,
  className = 'col-6 col-lg-3',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`${className} mm-trial-preview-datum`}>
      <small className="text-body-secondary d-block mb-1">{label}</small>
      <span className="text-heading fw-medium d-block">{value}</span>
    </div>
  );
}

function OrganizationIdentity({ row }: { row: TrialEntitlementRow }) {
  return (
    <div className="d-flex align-items-center gap-3 min-w-0">
      <span className="avatar avatar-sm flex-shrink-0">
        <span className="avatar-initial rounded-circle bg-label-primary">
          {row.name.slice(0, 2).toUpperCase()}
        </span>
      </span>
      <div className="min-w-0">
        <Link href={`/admin/orgs/${row.id}`} className="fw-medium text-heading d-block text-truncate">
          {row.name}
        </Link>
        <small className="text-body-secondary d-block text-truncate">
          {row.childCount > 0 ? `Agency root · ${row.childCount} workspaces` : `Created ${row.createdAt.slice(0, 10)}`}
        </small>
      </div>
    </div>
  );
}

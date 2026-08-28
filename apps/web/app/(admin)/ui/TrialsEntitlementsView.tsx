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
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCustomers } from '../../../lib/i18n/dict/admin-customers';
import { common } from '../../../lib/i18n/dict/common';
import type { Lang } from '../../../lib/i18n/types';

type StateFilter = '' | 'trial' | 'active' | 'past_due' | 'cancelled';

const FOCUS_VALUES: readonly TrialFocus[] = ['all', 'active', 'ending', 'expired', 'over'];

export function TrialsEntitlementsView({
  rows,
  now,
}: {
  rows: TrialEntitlementRow[];
  now: number;
}) {
  const lang = useLang();
  const t = adminCustomers[lang].trials;
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
      <div className="row g-6 mb-6" aria-label={t.summaryAria}>
        <MetricCard
          icon="tabler-hourglass-high"
          tone="info"
          label={t.metrics.activeTrials.label}
          value={summary.activeTrials}
          support={
            summary.missingEndDate > 0
              ? t.metrics.activeTrials.missingEndDate(summary.missingEndDate)
              : t.metrics.activeTrials.defaultSupport
          }
        />
        <MetricCard
          icon="tabler-calendar-time"
          tone="warning"
          label={t.metrics.endingSoon.label}
          value={summary.endingSoon}
          support={t.metrics.endingSoon.support}
        />
        <MetricCard
          icon="tabler-alert-triangle"
          tone="danger"
          label={t.metrics.expired.label}
          value={summary.expired}
          support={t.metrics.expired.support}
        />
        <MetricCard
          icon="tabler-user-exclamation"
          tone="primary"
          label={t.metrics.overEntitlement.label}
          value={summary.overEntitlement}
          support={t.metrics.overEntitlement.support}
        />
      </div>

      {summary.missingEndDate > 0 && (
        <div className="alert alert-warning d-flex align-items-start gap-3 mb-6" role="status">
          <i className="icon-base ti tabler-calendar-question icon-24px mt-1" aria-hidden="true" />
          <div>
            <h6 className="alert-heading mb-1">{t.missingEndDateAlert.title}</h6>
            <p className="mb-0">
              {t.missingEndDateAlert.body(summary.missingEndDate)}
            </p>
          </div>
        </div>
      )}

      <div className="card mm-trials-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0">{t.controlDesk.title}</h5>
                <span className="badge bg-label-secondary">
                  {t.controlDesk.results(visible.length)}
                </span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {t.controlDesk.subtitle}
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
                {t.controlDesk.resetFilters}
              </button>
            )}
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-trials-focus" role="group" aria-label={t.focusGroupAria}>
              {FOCUS_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`nav-link${focus === value ? ' active' : ''}`}
                  aria-pressed={focus === value}
                  onClick={() => setFocus(value)}
                >
                  {t.focus[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <label className="form-label" htmlFor="trial-search">{t.filters.searchLabel}</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="icon-base ti tabler-search" aria-hidden="true" />
                </span>
                <input
                  id="trial-search"
                  type="search"
                  className="form-control"
                  placeholder={t.filters.searchPlaceholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="trial-state">{t.filters.stateLabel}</label>
              <select
                id="trial-state"
                className="form-select"
                value={state}
                onChange={(event) => setState(event.target.value as StateFilter)}
              >
                <option value="">{t.filters.stateAll}</option>
                <option value="trial">{t.filters.stateOptions.trial}</option>
                <option value="active">{t.filters.stateOptions.active}</option>
                <option value="past_due">{t.filters.stateOptions.past_due}</option>
                <option value="cancelled">{t.filters.stateOptions.cancelled}</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <label className="form-label" htmlFor="trial-sort">{t.filters.sortLabel}</label>
              <select
                id="trial-sort"
                className="form-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as TrialSort)}
              >
                <option value="attention">{t.filters.sortOptions.attention}</option>
                <option value="trial_end">{t.filters.sortOptions.trial_end}</option>
                <option value="seat_usage">{t.filters.sortOptions.seat_usage}</option>
                <option value="recent_activity">{t.filters.sortOptions.recent_activity}</option>
              </select>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState
            icon="tabler-filter-off"
            text={rows.length === 0 ? t.empty.noRecords : t.empty.noMatches}
          />
        ) : (
          <>
            <div className="card-datatable table-responsive d-none d-lg-block">
              <table className="table table-hover border-top mm-trials-table">
                <thead>
                  <tr>
                    <th>{t.table.organization}</th>
                    <th>{t.table.planState}</th>
                    <th>{t.table.trialWindow}</th>
                    <th style={{ minWidth: 170 }}>{t.table.seatUtilization}</th>
                    <th>{t.table.members}</th>
                    <th>{t.table.lastActivity}</th>
                    <th className="text-end" aria-label={t.table.actionsAria} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <TrialTableRow key={row.id} row={row} now={now} lang={lang} onPreview={setPreviewRow} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-lg-none p-3 p-sm-4">
              <div className="d-grid gap-3">
                {visible.map((row) => (
                  <TrialMobileCard key={row.id} row={row} now={now} lang={lang} onPreview={setPreviewRow} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {previewRow && (
        <TrialPreviewDialog row={previewRow} now={now} lang={lang} onClose={() => setPreviewRow(null)} />
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
  lang,
  onPreview,
}: {
  row: TrialEntitlementRow;
  now: number;
  lang: Lang;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const t = adminCustomers[lang].trials;
  const facts = getTrialFacts(row, now);
  const progressWidth = Math.min(100, facts.utilization);

  return (
    <tr>
      <td><OrganizationIdentity row={row} lang={lang} /></td>
      <td><AdminStatusBadge value={row.entitlementState} /></td>
      <td><TrialTimelineCell row={row} now={now} lang={lang} /></td>
      <td>
        <div className="d-flex align-items-center justify-content-between gap-3 mb-1">
          <small className={facts.isOverEntitlement ? 'text-danger fw-medium' : 'text-heading'}>
            {t.row.activeOf(row.activeSeats, row.entitledSeats)}
          </small>
          <small className="text-body-secondary">{facts.utilization}%</small>
        </div>
        <div className="progress" style={{ height: 6 }}>
          <div
            className={`progress-bar${facts.isOverEntitlement ? ' bg-danger' : ''}`}
            style={{ width: `${progressWidth}%` }}
            role="progressbar"
            aria-label={t.row.seatUtilizationAria(row.name)}
            aria-valuenow={Math.min(100, facts.utilization)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </td>
      <td>{row.memberCount}</td>
      <td className="text-body-secondary">{row.lastActivityAt?.slice(0, 10) ?? t.row.noActivity}</td>
      <td className="text-end">
        <div className="d-inline-flex align-items-center mm-trials-action-cluster">
          <button
            type="button"
            className="btn btn-icon btn-label-primary rounded btn-sm"
            aria-label={t.row.previewAria(row.name)}
            title={t.row.previewAria(row.name)}
            onClick={() => onPreview(row)}
          >
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
          <TrialRowActions row={row} lang={lang} onPreview={onPreview} />
        </div>
      </td>
    </tr>
  );
}

function TrialMobileCard({
  row,
  now,
  lang,
  onPreview,
}: {
  row: TrialEntitlementRow;
  now: number;
  lang: Lang;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const t = adminCustomers[lang].trials;
  const facts = getTrialFacts(row, now);

  return (
    <article className="card border-0 shadow-sm mm-trial-mobile-card">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <OrganizationIdentity row={row} lang={lang} />
          <AdminStatusBadge value={row.entitlementState} />
        </div>
        <div className="mb-4"><TrialTimelineCell row={row} now={now} lang={lang} /></div>
        <div className="d-flex justify-content-between gap-3 mb-1">
          <small className="text-heading">{t.table.seatUtilization}</small>
          <small className={facts.isOverEntitlement ? 'text-danger fw-medium' : 'text-body-secondary'}>
            {t.mobile.seatUtilization(row.activeSeats, row.entitledSeats, facts.utilization)}
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
            <small className="text-body-secondary d-block">{t.table.members}</small>
            <span className="text-heading fw-medium">{row.memberCount}</span>
          </div>
          <div className="col-6">
            <small className="text-body-secondary d-block">{t.table.lastActivity}</small>
            <span className="text-heading fw-medium">{row.lastActivityAt?.slice(0, 10) ?? t.mobile.none}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-label-primary flex-grow-1" onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
            {t.row.quickPreview}
          </button>
          <TrialRowActions row={row} lang={lang} onPreview={onPreview} />
        </div>
      </div>
    </article>
  );
}

function TrialTimelineCell({ row, now, lang }: { row: TrialEntitlementRow; now: number; lang: Lang }) {
  const t = adminCustomers[lang].trials;
  const window = describeTrialWindow(row, now, lang);
  const timeline = getTrialTimeline(row, now);

  if (!timeline) {
    return (
      <div className="mm-trial-timeline">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <span className={`badge bg-label-${window.tone}`}>{window.label}</span>
          {window.date && <small className="text-body-secondary">{window.date}</small>}
        </div>
        {row.entitlementState === 'trial' && (
          <small className="text-body-secondary d-block mt-2">{t.timeline.addEndDateHint}</small>
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
        aria-label={t.timeline.timelineAria(row.name)}
        aria-valuenow={timeline.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`progress-bar bg-${timeline.tone}`} style={{ width: `${timeline.percent}%` }} />
      </div>
      <div className="d-flex align-items-center justify-content-between gap-3 mt-2">
        <small className="text-body-secondary">
          {t.timeline.dayOf(timeline.elapsedDays, timeline.totalDays)}
        </small>
        <small className={`text-${timeline.tone}`}>
          {timeline.remainingDays > 0 ? t.timeline.daysLeft(timeline.remainingDays) : t.timeline.complete}
        </small>
      </div>
    </div>
  );
}

function TrialRowActions({
  row,
  lang,
  onPreview,
}: {
  row: TrialEntitlementRow;
  lang: Lang;
  onPreview: (row: TrialEntitlementRow) => void;
}) {
  const t = adminCustomers[lang].trials;
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="btn btn-icon btn-label-secondary rounded btn-sm dropdown-toggle hide-arrow"
        aria-label={t.row.actionsForAria(row.name)}
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
            {t.row.quickPreview}
          </button>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <Link href={`/admin/orgs/${row.id}`} className="dropdown-item" onClick={() => setOpen(false)}>
            <i className="icon-base ti tabler-building me-2" aria-hidden="true" />
            {t.row.openCustomerDetail}
          </Link>
        </li>
      </ul>
    </div>
  );
}

function TrialPreviewDialog({
  row,
  now,
  lang,
  onClose,
}: {
  row: TrialEntitlementRow;
  now: number;
  lang: Lang;
  onClose: () => void;
}) {
  const t = adminCustomers[lang].trials;
  const facts = getTrialFacts(row, now);
  const timeline = getTrialTimeline(row, now);
  const window = describeTrialWindow(row, now, lang);

  return (
    <StaffDialog
      title={t.preview.title}
      subtitle={t.preview.subtitle}
      labelledBy={t.preview.labelledBy(row.name)}
      busy={false}
      onClose={onClose}
      wide
    >
      <div className="mm-trial-preview">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-6">
          <OrganizationIdentity row={row} lang={lang} />
          <AdminStatusBadge value={row.entitlementState} />
        </div>

        <div className="row g-5">
          <div className="col-md-7">
            <section className="mm-trial-preview-panel rounded p-5 h-100" aria-labelledby="trial-preview-timeline">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                <div>
                  <small className="text-uppercase text-body-secondary d-block mb-1">{t.preview.trialTimeline}</small>
                  <h5 id="trial-preview-timeline" className="mb-0">{window.label}</h5>
                </div>
                <span className="avatar avatar-sm">
                  <span className={`avatar-initial rounded bg-label-${window.tone}`}>
                    <i className="icon-base ti tabler-calendar-time" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <TrialTimelineCell row={row} now={now} lang={lang} />
              <div className="row g-3 mt-4">
                <PreviewDatum className="col-12 col-sm-4" label={t.preview.started} value={row.createdAt.slice(0, 10)} />
                <PreviewDatum className="col-12 col-sm-4" label={t.preview.ends} value={window.date ?? t.preview.notSet} />
                <PreviewDatum className="col-12 col-sm-4" label={t.preview.duration} value={timeline ? t.preview.durationDays(timeline.totalDays) : t.preview.unavailable} />
              </div>
            </section>
          </div>

          <div className="col-md-5">
            <section className="mm-trial-preview-panel rounded p-5 h-100" aria-labelledby="trial-preview-seats">
              <small className="text-uppercase text-body-secondary d-block mb-1">{t.preview.entitlement}</small>
              <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
                <h5 id="trial-preview-seats" className="mb-0">{t.preview.seatUtilization}</h5>
                <strong className={facts.isOverEntitlement ? 'text-danger' : 'text-heading'}>
                  {facts.utilization}%
                </strong>
              </div>
              <div
                className="progress mb-3"
                style={{ height: 8 }}
                role="progressbar"
                aria-label={t.row.seatUtilizationAria(row.name)}
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
                {t.preview.activeOfEntitled(row.activeSeats, row.entitledSeats)}
              </p>
              {facts.isOverEntitlement && (
                <div className="alert alert-danger py-2 px-3 mb-0" role="status">
                  <small>{t.preview.overAllowance(row.activeSeats - row.entitledSeats)}</small>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="row g-0 mt-5 mm-trial-preview-strip">
          <PreviewDatum label={t.preview.members} value={String(row.memberCount)} />
          <PreviewDatum label={t.preview.childWorkspaces} value={String(row.childCount)} />
          <PreviewDatum label={t.preview.lastActivity} value={row.lastActivityAt?.slice(0, 10) ?? t.row.noActivity} />
          <PreviewDatum label={t.preview.billingScope} value={row.childCount > 0 ? t.preview.billingScopeRoot : t.preview.billingScopeSingle} />
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3 mt-6">
          <button type="button" className="btn btn-label-secondary" onClick={onClose}>{common[lang].close}</button>
          <Link href={`/admin/orgs/${row.id}`} className="btn btn-primary">
            {t.preview.openCustomerDetail}
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

function OrganizationIdentity({ row, lang }: { row: TrialEntitlementRow; lang: Lang }) {
  const t = adminCustomers[lang].trials;
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
          {row.childCount > 0 ? t.identity.agencyRoot(row.childCount) : t.identity.created(row.createdAt.slice(0, 10))}
        </small>
      </div>
    </div>
  );
}

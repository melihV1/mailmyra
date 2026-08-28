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
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminSecurity } from '../../../lib/i18n/dict/admin-security';
import type { Lang } from '../../../lib/i18n/types';
import { AdminEmptyState } from './AdminEmptyState';
import { StaffDialog } from './StaffDialog';

export function StaffAccessLogView({
  rows,
  now,
}: {
  rows: StaffAccessLogRow[];
  now: number;
}) {
  const lang = useLang();
  const t = adminSecurity[lang].accessLog;
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
    const header = [
      t.csvHeaders.eventId,
      t.csvHeaders.timestampUtc,
      t.csvHeaders.staff,
      t.csvHeaders.customer,
      t.csvHeaders.scope,
      t.csvHeaders.target,
      t.csvHeaders.ip,
      t.csvHeaders.client,
      t.csvHeaders.reviewSignal,
    ];
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
      <section className="card mb-6 mm-access-summary" aria-label={t.summaryAria}>
        <div className="card-widget-separator-wrapper">
          <div className="card-body card-widget-separator">
            <div className="row gy-4 gy-sm-1">
              <SummaryWidget icon="tabler-eye" label={t.summary.sensitiveReads.label} value={summary.reads} support={t.summary.sensitiveReads.support} lang={lang} />
              <SummaryWidget icon="tabler-calendar-event" label={t.summary.readsToday.label} value={summary.readsToday} support={t.summary.readsToday.support} tone="info" lang={lang} />
              <SummaryWidget icon="tabler-user-shield" label={t.summary.activeStaff.label} value={summary.activeStaff} support={t.summary.activeStaff.support} tone="success" lang={lang} />
              <SummaryWidget icon="tabler-building" label={t.summary.customersViewed.label} value={summary.customersAccessed} support={t.summary.customersViewed.support(summary.reviewSignals)} tone={summary.reviewSignals ? 'warning' : 'secondary'} last lang={lang} />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-6 mm-access-context" aria-label={t.contextAria}>
        <div className="card-body py-4">
          <div className="row g-4 align-items-center">
            <ContextItem
              icon="tabler-shield-lock"
              tone="primary"
              label={t.context.immutableLedger.label}
              value={t.context.immutableLedger.value}
              support={adminSecurity[lang].shared.readOnlyLedgerNote}
            />
            <ContextItem
              icon={getAccessScopeIcon(topScope?.scope ?? '')}
              tone="info"
              label={t.context.mostReadScope.label}
              value={topScope ? getAccessScopeLabel(topScope.scope) : t.context.mostReadScope.emptyValue}
              support={topScope ? t.context.mostReadScope.support(topScope.count) : t.context.mostReadScope.emptySupport}
            />
            <ContextItem
              icon="tabler-building-skyscraper"
              tone="warning"
              label={t.context.mostViewedCustomer.label}
              value={topCustomer?.name ?? t.context.mostViewedCustomer.emptyValue}
              support={topCustomer ? t.context.mostViewedCustomer.support(topCustomer.count) : t.context.mostViewedCustomer.emptySupport}
            />
          </div>
        </div>
      </section>

      <section className="card mm-access-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h5 className="card-title mb-0">{t.ledger.title}</h5>
                <span className="badge bg-label-secondary">{t.ledger.resultsBadge(visible.length)}</span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {t.ledger.subtitle}
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {hasFilters && (
                <button type="button" className="btn btn-sm btn-label-secondary" onClick={resetFilters}>
                  <i className="icon-base ti tabler-filter-x me-1" aria-hidden="true" />
                  {t.ledger.reset}
                </button>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={exportCsv} disabled={visible.length === 0}>
                <i className="icon-base ti tabler-file-download me-2" aria-hidden="true" />
                {t.ledger.exportCsv}
              </button>
            </div>
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-access-focus" role="group" aria-label={t.ledger.focusAria}>
              <button type="button" className={`nav-link${signal === 'all' ? ' active' : ''}`} onClick={() => setSignal('all')}>{t.ledger.allReads}</button>
              <button type="button" className={`nav-link${signal === 'review' ? ' active' : ''}`} onClick={() => setSignal('review')}>
                {t.ledger.reviewSignals}
                {summary.reviewSignals > 0 && <span className="badge rounded-pill bg-warning ms-2">{summary.reviewSignals}</span>}
              </button>
              <button type="button" className={`nav-link${signal === 'routine' ? ' active' : ''}`} onClick={() => setSignal('routine')}>{t.ledger.routineReads}</button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <label className="form-label" htmlFor="access-search">{t.ledger.searchLabel}</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text"><i className="icon-base ti tabler-search" aria-hidden="true" /></span>
                <input id="access-search" type="search" className="form-control" placeholder={t.ledger.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            <FilterSelect id="access-period" label={t.ledger.periodLabel} value={period} onChange={(value) => setPeriod(value as AccessPeriod)} options={[
              ['today', t.ledger.periodOptions.today], ['7', t.ledger.periodOptions.d7], ['30', t.ledger.periodOptions.d30], ['all', t.ledger.periodOptions.all],
            ]} />
            <FilterSelect id="access-scope" label={t.ledger.scopeLabel} value={scope} onChange={setScope} options={[
              ['all', t.ledger.allScopes], ...scopes.map((item) => [item, getAccessScopeLabel(item)] as [string, string]),
            ]} />
            <FilterSelect id="access-customer" label={t.ledger.customerLabel} value={orgId} onChange={setOrgId} options={[
              ['all', t.ledger.allCustomers], ...organizations,
            ]} />
            <FilterSelect id="access-staff" label={t.ledger.staffLabel} value={staff} onChange={setStaff} options={[
              ['all', t.ledger.allStaff], ...staffMembers.map((item) => [item, item] as [string, string]),
            ]} />
            <FilterSelect id="access-sort" label={t.ledger.sortLabel} value={sort} onChange={(value) => setSort(value as AccessSort)} options={[
              ['newest', t.ledger.sortOptions.newest], ['oldest', t.ledger.sortOptions.oldest], ['customer', t.ledger.sortOptions.customer], ['staff', t.ledger.sortOptions.staff],
            ]} />
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState icon="tabler-shield-off" text={rows.length === 0 ? t.ledger.emptyNoRows : t.ledger.emptyNoMatch} />
        ) : (
          <>
            <div className="table-responsive mm-access-desktop-table">
              <table className="table table-hover mm-access-table">
                <thead>
                  <tr>
                    <th>{t.ledger.tableHeaders.when}</th>
                    <th>{t.ledger.tableHeaders.staffMember}</th>
                    <th>{t.ledger.tableHeaders.customer}</th>
                    <th>{t.ledger.tableHeaders.scope}</th>
                    <th>{t.ledger.tableHeaders.target}</th>
                    <th>{t.ledger.tableHeaders.reviewSignal}</th>
                    <th className="text-end">{t.ledger.tableHeaders.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => <AccessTableRow key={row.id} row={row} rows={rows} now={now} onPreview={setPreviewRow} lang={lang} />)}
                </tbody>
              </table>
            </div>
            <div className="mm-access-responsive-cards p-4">
              <div className="row g-4">
                {visible.map((row) => <AccessMobileCard key={row.id} row={row} rows={rows} now={now} onPreview={setPreviewRow} lang={lang} />)}
              </div>
            </div>
          </>
        )}

        <div className="card-footer d-flex flex-wrap justify-content-between gap-2 text-body-secondary small">
          <span>{t.ledger.footerShowing(visible.length, rows.length)}</span>
          <span><i className="icon-base ti tabler-lock me-1" aria-hidden="true" />{t.ledger.footerAppendOnly}</span>
        </div>
      </section>

      {previewRow && <AccessDetailDialog row={previewRow} rows={rows} onClose={() => setPreviewRow(null)} lang={lang} />}
    </>
  );
}

function SummaryWidget({ icon, label, value, support, tone = 'primary', last = false, lang = 'en' }: {
  icon: string;
  label: string;
  value: number;
  support: string;
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  last?: boolean;
  lang?: Lang;
}) {
  return (
    <div className="col-6 col-lg-3">
      <div className={`d-flex justify-content-between align-items-center pb-4 pb-sm-0${last ? '' : ' border-end mm-access-widget'}`}>
        <div className="min-w-0">
          <h4 className="mb-1 text-truncate">{value.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</h4>
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

function AccessTableRow({ row, rows, now, onPreview, lang }: {
  row: StaffAccessLogRow; rows: StaffAccessLogRow[]; now: number; onPreview: (row: StaffAccessLogRow) => void; lang: Lang;
}) {
  const t = adminSecurity[lang].accessLog;
  const review = getAccessReviewFacts(row, rows);
  return (
    <tr>
      <td><TimeCell value={row.createdAt} now={now} lang={lang} /></td>
      <td><StaffIdentity email={row.staffEmail} /></td>
      <td>
        <Link href={`/admin/orgs/${row.orgId}`} className="fw-medium text-heading">{row.orgName}</Link>
        <small className="d-block text-body-secondary">{getClientLabel(row.userAgent)}</small>
      </td>
      <td><ScopeBadge scope={row.scope} /></td>
      <td><code className="small text-body-secondary">{shortTarget(row.targetId, lang)}</code></td>
      <td><ReviewBadge review={review} /></td>
      <td className="text-end">
        <div className="d-inline-flex mm-access-action-cluster">
          <button type="button" className="btn btn-sm btn-icon btn-label-primary" aria-label={t.ledger.viewEventFor(row.orgName)} title={t.ledger.viewEvent} onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
          <Link href={`/admin/orgs/${row.orgId}`} className="btn btn-sm btn-icon btn-label-secondary" aria-label={t.ledger.openFor(row.orgName)} title={t.ledger.openCustomer}>
            <i className="icon-base ti tabler-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function AccessMobileCard({ row, rows, now, onPreview, lang }: {
  row: StaffAccessLogRow; rows: StaffAccessLogRow[]; now: number; onPreview: (row: StaffAccessLogRow) => void; lang: Lang;
}) {
  const t = adminSecurity[lang].accessLog;
  const review = getAccessReviewFacts(row, rows);
  return (
    <div className="col-12 col-md-6">
      <article className="border rounded p-4 h-100 mm-access-mobile-card">
        <div className="d-flex justify-content-between gap-3 mb-4">
          <StaffIdentity email={row.staffEmail} />
          <button type="button" className="btn btn-sm btn-icon btn-label-primary" aria-label={t.ledger.viewEventAria} onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye" aria-hidden="true" />
          </button>
        </div>
        <Link href={`/admin/orgs/${row.orgId}`} className="h6 d-block mb-1">{row.orgName}</Link>
        <TimeCell value={row.createdAt} now={now} lang={lang} />
        <div className="d-flex flex-wrap gap-2 mt-4 mb-3"><ScopeBadge scope={row.scope} /><ReviewBadge review={review} /></div>
        <div className="d-flex justify-content-between gap-3 pt-3 border-top small">
          <span className="text-body-secondary">{t.ledger.target}</span>
          <code className="text-body-secondary text-end">{shortTarget(row.targetId, lang)}</code>
        </div>
      </article>
    </div>
  );
}

function AccessDetailDialog({ row, rows, onClose, lang }: { row: StaffAccessLogRow; rows: StaffAccessLogRow[]; onClose: () => void; lang: Lang }) {
  const t = adminSecurity[lang].accessLog;
  const review = getAccessReviewFacts(row, rows);
  return (
    <StaffDialog title={t.detail.title} subtitle={t.detail.subtitle} labelledBy={t.detail.labelledBy} busy={false} onClose={onClose} wide>
      <div className="alert alert-outline-primary d-flex align-items-start gap-3 mb-5" role="note">
        <i className="icon-base ti tabler-shield-lock mt-1" aria-hidden="true" />
        <div><strong>{t.detail.readOnlyHeading}</strong><div className="small">{t.detail.readOnlyBody}</div></div>
      </div>
      <div className="row g-4">
        <DetailItem label={t.detail.fields.eventId} value={row.id} mono />
        <DetailItem label={t.detail.fields.timestampUtc} value={formatUtc(row.createdAt, lang)} />
        <DetailItem label={t.detail.fields.staffMember} value={row.staffEmail} />
        <DetailItem label={t.detail.fields.customer} value={row.orgName} />
        <DetailItem label={t.detail.fields.scope} value={getAccessScopeLabel(row.scope)} />
        <DetailItem label={t.detail.fields.targetId} value={row.targetId ?? t.detail.notSingleRecordRead} mono />
        <DetailItem label={t.detail.fields.ipAddress} value={row.ip ?? adminCommon[lang].notRecorded} mono />
        <DetailItem label={t.detail.fields.client} value={getClientLabel(row.userAgent)} />
      </div>
      <div className={`alert ${review.signal === 'review' ? 'alert-warning' : 'alert-secondary'} mt-5 mb-0`}>
        <div className="d-flex gap-3">
          <i className={`icon-base ti ${review.signal === 'review' ? 'tabler-alert-triangle' : 'tabler-circle-check'} mt-1`} aria-hidden="true" />
          <div><strong>{review.label}</strong><div className="small mt-1">{review.detail}</div><div className="small mt-2">{t.detail.reviewSignalNote}</div></div>
        </div>
      </div>
      {row.userAgent && (
        <div className="mt-5">
          <label className="form-label">{t.detail.rawUserAgent}</label>
          <div className="bg-body-secondary rounded p-3 small text-break font-monospace">{row.userAgent}</div>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-6">
        <Link href={`/admin/orgs/${row.orgId}`} className="btn btn-label-primary">{t.detail.openCustomer}</Link>
        <button type="button" className="btn btn-primary" onClick={onClose}>{t.detail.close}</button>
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

function TimeCell({ value, now, lang }: { value: string; now: number; lang: Lang }) {
  return <div><span className="fw-medium text-heading d-block">{formatRelative(value, now, lang)}</span><small className="text-body-secondary">{formatUtc(value, lang)}</small></div>;
}

// StaffAccessLogView'a özgü UTC damgası ('en'/'tr' + sabit timeZone: 'UTC') — option
// seti OperationsShared.formatDateTime'dan farklı olduğu için ayrı tutuldu (Task 2, davranış önce).
function formatUtc(value: string, lang: Lang = 'en'): string {
  const locale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function formatRelative(value: string, now: number, lang: Lang = 'en'): string {
  const t = adminSecurity[lang].accessLog.time;
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  return days === 1 ? t.yesterday : t.daysAgo(days);
}

function shortTarget(value: string | null, lang: Lang = 'en'): string {
  if (!value) return adminSecurity[lang].accessLog.wholeScope;
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

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  getInvoiceFacts,
  getInvoiceTimeline,
  matchesInvoiceFocus,
  sortInvoiceRows,
  summarizeInvoices,
  type InvoiceFocus,
  type InvoiceSort,
  type InvoiceWorkbenchRow,
} from '../invoice-workbench-model';
import { InvoiceRowActions } from '../admin/orgs/[id]/InvoiceRowActions';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminStatusBadge } from './AdminStatusBadge';
import { StaffDialog } from './StaffDialog';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminRevenue, type AdminRevenueDict } from '../../../lib/i18n/dict/admin-revenue';
import { common } from '../../../lib/i18n/dict/common';
import type { Lang } from '../../../lib/i18n/types';

type DateScope = 'all' | '30' | '90' | 'year';

export function InvoiceWorkbenchView({
  rows,
  now,
  mutationsEnabled = true,
}: {
  rows: InvoiceWorkbenchRow[];
  now: number;
  mutationsEnabled?: boolean;
}) {
  const lang = useLang();
  const t = adminRevenue[lang].invoiceWorkbench;
  const currencies = useMemo(
    () => [...new Set(rows.map((row) => row.currency))].sort(),
    [rows],
  );
  const [currency, setCurrency] = useState(rows[0]?.currency ?? currencies[0] ?? 'USD');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<InvoiceFocus>('all');
  const [dateScope, setDateScope] = useState<DateScope>('all');
  const [sort, setSort] = useState<InvoiceSort>('attention');
  const [previewRow, setPreviewRow] = useState<InvoiceWorkbenchRow | null>(null);

  const focusOptions: ReadonlyArray<{ value: InvoiceFocus; label: string }> = [
    { value: 'all', label: t.focusOptions.all },
    { value: 'due', label: t.focusOptions.due },
    { value: 'overdue', label: t.focusOptions.overdue },
    { value: 'paid', label: t.focusOptions.paid },
    { value: 'void', label: t.focusOptions.void },
  ];

  const currencyRows = useMemo(
    () => rows.filter((row) => row.currency === currency),
    [currency, rows],
  );
  const summary = useMemo(
    () => summarizeInvoices(currencyRows, now),
    [currencyRows, now],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const oldest = getOldestDate(dateScope, now);
    const filtered = currencyRows.filter((row) => {
      if (
        needle &&
        !row.number.toLowerCase().includes(needle) &&
        !row.orgName.toLowerCase().includes(needle) &&
        !row.paymentReference?.toLowerCase().includes(needle)
      ) return false;
      if (!matchesInvoiceFocus(row, focus, now)) return false;
      if (oldest !== null && Date.parse(row.issuedAt) < oldest) return false;
      return true;
    });
    return sortInvoiceRows(filtered, sort, now);
  }, [currencyRows, dateScope, focus, now, query, sort]);

  const hasFilters = query.trim() !== '' || focus !== 'all' || dateScope !== 'all' || sort !== 'attention';
  const collectionRate = summary.billedCents > 0
    ? Math.round((summary.collectedCents / summary.billedCents) * 100)
    : 0;

  return (
    <>
      <section className="card mb-6 mm-invoice-summary" aria-label={t.header.summaryAria}>
        <div className="card-widget-separator-wrapper">
          <div className="card-body card-widget-separator">
            <div className="row gy-4 gy-sm-1">
              <SummaryWidget
                icon="tabler-file-invoice"
                label={t.summary.billed.label}
                value={formatMoney(summary.billedCents, currency)}
                support={t.summary.billed.support(summary.invoiceCount)}
              />
              <SummaryWidget
                icon="tabler-circle-check"
                label={t.summary.collected.label}
                value={formatMoney(summary.collectedCents, currency)}
                support={t.summary.collected.support(collectionRate)}
                tone="success"
              />
              <SummaryWidget
                icon="tabler-clock-dollar"
                label={t.summary.outstanding.label}
                value={formatMoney(summary.outstandingCents, currency)}
                support={t.summary.outstanding.support(summary.customerCount)}
                tone="warning"
              />
              <SummaryWidget
                icon="tabler-alert-circle"
                label={t.summary.overdue.label}
                value={formatMoney(summary.overdueCents, currency)}
                support={t.summary.overdue.support(summary.overdueCount)}
                tone="danger"
                last
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mm-invoice-workbench">
        <div className="card-header border-bottom">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-5">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h5 className="card-title mb-0">{t.header.title}</h5>
                <span className="badge bg-label-secondary">
                  {t.header.results(visible.length)}
                </span>
              </div>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {t.header.subtitle}
              </p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              {currencies.length > 1 && (
                <div className="btn-group btn-group-sm" role="group" aria-label={adminRevenue[lang].currencyControl.ariaLabel}>
                  {currencies.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`btn ${currency === item ? 'btn-primary' : 'btn-label-secondary'}`}
                      aria-pressed={currency === item}
                      onClick={() => setCurrency(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
              {hasFilters && (
                <button
                  type="button"
                  className="btn btn-sm btn-label-secondary"
                  onClick={() => {
                    setQuery('');
                    setFocus('all');
                    setDateScope('all');
                    setSort('attention');
                  }}
                >
                  <i className="icon-base ti tabler-filter-x me-1" aria-hidden="true" />
                  {t.header.resetFilters}
                </button>
              )}
            </div>
          </div>

          <div className="nav-align-top mb-5">
            <div className="nav nav-pills mm-invoice-focus" role="group" aria-label={t.header.focusAria}>
              {focusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`nav-link${focus === option.value ? ' active' : ''}`}
                  aria-pressed={focus === option.value}
                  onClick={() => setFocus(option.value)}
                >
                  {option.label}
                  {option.value === 'overdue' && summary.overdueCount > 0 && (
                    <span className="badge rounded-pill bg-danger ms-2">{summary.overdueCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <label className="form-label" htmlFor="invoice-search">{t.search.label}</label>
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="icon-base ti tabler-search" aria-hidden="true" />
                </span>
                <input
                  id="invoice-search"
                  type="search"
                  className="form-control"
                  placeholder={t.search.placeholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="invoice-period">{t.period.label}</label>
              <select
                id="invoice-period"
                className="form-select"
                value={dateScope}
                onChange={(event) => setDateScope(event.target.value as DateScope)}
              >
                <option value="all">{t.period.allTime}</option>
                <option value="30">{t.period.last30}</option>
                <option value="90">{t.period.last90}</option>
                <option value="year">{t.period.thisYear}</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <label className="form-label" htmlFor="invoice-sort">{t.sortBy.label}</label>
              <select
                id="invoice-sort"
                className="form-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as InvoiceSort)}
              >
                <option value="attention">{t.sortBy.attention}</option>
                <option value="issued">{t.sortBy.newestIssued}</option>
                <option value="due">{t.sortBy.dueDate}</option>
                <option value="amount">{t.sortBy.highestAmount}</option>
              </select>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <AdminEmptyState
            icon="tabler-file-off"
            text={rows.length === 0 ? t.empty.noInvoices : t.empty.noMatches}
          />
        ) : (
          <>
            <div className="card-datatable table-responsive mm-invoice-desktop-table">
              <table className="table table-hover border-top mm-invoice-table">
                <thead>
                  <tr>
                    <th>{t.table.headers.invoice}</th>
                    <th>{t.table.headers.customer}</th>
                    <th style={{ minWidth: 210 }}>{t.table.headers.billingWindow}</th>
                    <th>{t.datum.seats}</th>
                    <th>{t.datum.amount}</th>
                    <th>{t.table.headers.status}</th>
                    <th className="text-end" aria-label={t.table.headers.actions} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <InvoiceTableRow
                      key={row.id}
                      row={row}
                      now={now}
                      lang={lang}
                      mutationsEnabled={mutationsEnabled}
                      onPreview={setPreviewRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mm-invoice-responsive-cards p-3 p-sm-4">
              <div className="d-grid gap-3">
                {visible.map((row) => (
                  <InvoiceMobileCard
                    key={row.id}
                    row={row}
                    now={now}
                    lang={lang}
                    mutationsEnabled={mutationsEnabled}
                    onPreview={setPreviewRow}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {previewRow && (
        <InvoicePreviewDialog row={previewRow} now={now} lang={lang} onClose={() => setPreviewRow(null)} />
      )}
    </>
  );
}

function SummaryWidget({
  icon,
  label,
  value,
  support,
  tone = 'primary',
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  support: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  last?: boolean;
}) {
  return (
    <div className="col-6 col-lg-3">
      <div className={`d-flex justify-content-between align-items-center pb-4 pb-sm-0${last ? '' : ' border-end mm-invoice-widget'}`}>
        <div className="min-w-0">
          <h4 className="mb-1 text-truncate">{value}</h4>
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

function InvoiceTableRow({
  row,
  now,
  lang,
  mutationsEnabled,
  onPreview,
}: {
  row: InvoiceWorkbenchRow;
  now: number;
  lang: Lang;
  mutationsEnabled: boolean;
  onPreview: (row: InvoiceWorkbenchRow) => void;
}) {
  const t = adminRevenue[lang].invoiceWorkbench;
  const facts = getInvoiceFacts(row, now);

  return (
    <tr>
      <td>
        <button type="button" className="btn btn-link p-0 fw-medium text-heading" onClick={() => onPreview(row)}>
          {row.number}
        </button>
        <small className="text-body-secondary d-block">{t.table.issued(formatDate(row.issuedAt, lang))}</small>
      </td>
      <td><OrganizationIdentity row={row} lang={lang} /></td>
      <td><InvoiceTimelineCell row={row} now={now} lang={lang} /></td>
      <td>
        <span className="fw-medium text-heading">{row.seats}</span>
        <small className="text-body-secondary d-block">{t.datum.activeSeatsSmall}</small>
      </td>
      <td>
        <span className="fw-medium text-heading">{formatMoney(row.amountCents, row.currency)}</span>
        <small className={`d-block ${facts.isDue ? 'text-warning' : 'text-body-secondary'}`}>
          {facts.isDue ? t.table.balance(formatMoney(row.amountCents, row.currency)) : t.table.noBalance}
        </small>
      </td>
      <td><InvoiceStatus row={row} now={now} lang={lang} /></td>
      <td className="text-end">
        <InvoiceActions row={row} lang={lang} mutationsEnabled={mutationsEnabled} onPreview={onPreview} />
      </td>
    </tr>
  );
}

function InvoiceMobileCard({
  row,
  now,
  lang,
  mutationsEnabled,
  onPreview,
}: {
  row: InvoiceWorkbenchRow;
  now: number;
  lang: Lang;
  mutationsEnabled: boolean;
  onPreview: (row: InvoiceWorkbenchRow) => void;
}) {
  const t = adminRevenue[lang].invoiceWorkbench;
  return (
    <article className="card border-0 shadow-sm mm-invoice-mobile-card">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <div>
            <small className="text-body-secondary d-block mb-1">{row.number}</small>
            <OrganizationIdentity row={row} lang={lang} />
          </div>
          <InvoiceStatus row={row} now={now} lang={lang} />
        </div>
        <InvoiceTimelineCell row={row} now={now} lang={lang} />
        <div className="row g-3 my-4">
          <PreviewDatum className="col-4" label={t.datum.amount} value={formatMoney(row.amountCents, row.currency)} />
          <PreviewDatum className="col-4" label={t.datum.seats} value={String(row.seats)} />
          <PreviewDatum className="col-4" label={t.datum.issued} value={formatDate(row.issuedAt, lang)} />
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-label-primary flex-grow-1" onClick={() => onPreview(row)}>
            <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
            {t.mobile.previewInvoice}
          </button>
          {mutationsEnabled && (
            <InvoiceRowActions
              id={row.id}
              number={row.number}
              status={row.status}
              buttonClassName="btn btn-icon btn-label-secondary rounded btn-sm dropdown-toggle hide-arrow"
            />
          )}
        </div>
      </div>
    </article>
  );
}

function InvoiceTimelineCell({ row, now, lang }: { row: InvoiceWorkbenchRow; now: number; lang: Lang }) {
  const t = adminRevenue[lang].invoiceWorkbench;
  const facts = getInvoiceFacts(row, now);
  const timeline = getInvoiceTimeline(row, now);

  if (facts.isVoid) {
    return <small className="text-body-secondary">{t.timeline.voided}</small>;
  }
  if (!timeline) {
    return (
      <div>
        <span className="text-heading fw-medium">{t.timeline.noDueDate}</span>
        <small className="text-body-secondary d-block">{t.table.issued(formatDate(row.issuedAt, lang))}</small>
      </div>
    );
  }

  return (
    <div className="mm-invoice-timeline">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
        <small className={`text-${timeline.tone} fw-medium`}>
          {facts.isPaid
            ? t.timeline.paid(formatDate(row.paidAt, lang))
            : facts.isOverdue
              ? t.timeline.overdueDays(facts.daysOverdue)
              : t.timeline.remainingDays(timeline.remainingDays)}
        </small>
        <small className="text-body-secondary">{t.timeline.due(formatDate(row.dueAt, lang))}</small>
      </div>
      <div
        className="progress mm-invoice-progress"
        role="progressbar"
        aria-label={t.timeline.windowAria(row.number)}
        aria-valuenow={timeline.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`progress-bar bg-${timeline.tone}`} style={{ width: `${timeline.percent}%` }} />
      </div>
    </div>
  );
}

function InvoiceStatus({ row, now, lang }: { row: InvoiceWorkbenchRow; now: number; lang: Lang }) {
  const t = adminRevenue[lang].invoiceWorkbench;
  const facts = getInvoiceFacts(row, now);
  if (facts.isOverdue) return <span className="badge bg-label-danger">{t.status.overdue}</span>;
  return <AdminStatusBadge value={row.status} />;
}

function InvoiceActions({
  row,
  lang,
  mutationsEnabled,
  onPreview,
}: {
  row: InvoiceWorkbenchRow;
  lang: Lang;
  mutationsEnabled: boolean;
  onPreview: (row: InvoiceWorkbenchRow) => void;
}) {
  const t = adminRevenue[lang].invoiceWorkbench;
  return (
    <div className="d-inline-flex align-items-center mm-invoice-action-cluster">
      <button
        type="button"
        className="btn btn-icon btn-label-primary rounded btn-sm"
        aria-label={t.actions.previewAria(row.number)}
        title={t.actions.previewAria(row.number)}
        onClick={() => onPreview(row)}
      >
        <i className="icon-base ti tabler-eye" aria-hidden="true" />
      </button>
      {mutationsEnabled ? (
        <InvoiceRowActions
          id={row.id}
          number={row.number}
          status={row.status}
          buttonClassName="btn btn-icon btn-label-secondary rounded btn-sm dropdown-toggle hide-arrow"
        />
      ) : (
        <Link
          href={`/admin/orgs/${row.orgId}`}
          className="btn btn-icon btn-label-secondary rounded btn-sm"
          aria-label={t.actions.openAria(row.orgName)}
        >
          <i className="icon-base ti tabler-building" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function InvoicePreviewDialog({
  row,
  now,
  lang,
  onClose,
}: {
  row: InvoiceWorkbenchRow;
  now: number;
  lang: Lang;
  onClose: () => void;
}) {
  const t = adminRevenue[lang].invoiceWorkbench;
  const facts = getInvoiceFacts(row, now);

  return (
    <StaffDialog
      title={t.preview.titlePrefix(row.number)}
      subtitle={t.preview.subtitle}
      labelledBy={t.preview.labelledBy(row.number)}
      busy={false}
      onClose={onClose}
      wide
    >
      <div className="mm-invoice-preview">
        <section className="mm-invoice-document rounded p-4 p-sm-6">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-4 mb-6">
            <div>
              <span className="avatar avatar-lg mb-3">
                <span className="avatar-initial rounded bg-primary text-white">
                  <i className="icon-base ti tabler-file-invoice icon-28px" aria-hidden="true" />
                </span>
              </span>
              <h5 className="mb-1">{t.preview.recordTitle}</h5>
              <small className="text-body-secondary">{t.preview.recordSubtitle}</small>
            </div>
            <div className="text-sm-end">
              <InvoiceStatus row={row} now={now} lang={lang} />
              <h4 className="mt-3 mb-0">{formatMoney(row.amountCents, row.currency)}</h4>
              <small className="text-body-secondary">{t.preview.authoritativeTotal}</small>
            </div>
          </div>

          <div className="row g-5 mb-6">
            <div className="col-md-6">
              <small className="text-uppercase text-body-secondary d-block mb-2">{t.preview.billTo}</small>
              <h5 className="mb-1">{row.orgName}</h5>
              <Link href={`/admin/orgs/${row.orgId}`} className="small">
                {t.preview.openCustomerRecord}
                <i className="icon-base ti tabler-external-link ms-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="col-md-6">
              <div className="row g-3">
                <PreviewDatum className="col-6" label={t.datum.issued} value={formatDate(row.issuedAt, lang)} />
                <PreviewDatum className="col-6" label={t.datum.due} value={formatDate(row.dueAt, lang)} />
                <PreviewDatum className="col-6" label={t.datum.activeSeats} value={String(row.seats)} />
                <PreviewDatum className="col-6" label={t.datum.currency} value={row.currency} />
              </div>
            </div>
          </div>

          <div className="table-responsive mb-6">
            <table className="table table-borderless align-middle mb-0 mm-invoice-preview-table">
              <thead>
                <tr>
                  <th>{t.preview.tableHeaders.billingItem}</th>
                  <th className="text-center">{t.preview.tableHeaders.quantity}</th>
                  <th className="text-end">{t.preview.tableHeaders.recordedTotal}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="fw-medium text-heading">{t.preview.lineItem}</span>
                    <small className="text-body-secondary d-block">{t.preview.lineItemDetail}</small>
                  </td>
                  <td className="text-center">{row.seats}</td>
                  <td className="text-end fw-semibold">{formatMoney(row.amountCents, row.currency)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="text-end fw-medium">{t.preview.amountDue}</td>
                  <td className="text-end"><h5 className="mb-0">{formatMoney(facts.isDue ? row.amountCents : 0, row.currency)}</h5></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {(row.note || row.paymentMethod || row.paymentReference) && (
            <div className="row g-4 mm-invoice-meta-strip rounded p-4">
              {row.note && <PreviewDatum className="col-12 col-md-6" label={t.preview.internalNote} value={row.note} />}
              {row.paymentMethod && <PreviewDatum className="col-6 col-md-3" label={t.preview.paymentMethodLabel} value={paymentMethodLabel(row.paymentMethod, lang)} />}
              {row.paymentReference && <PreviewDatum className="col-6 col-md-3" label={t.preview.referenceLabel} value={row.paymentReference} />}
            </div>
          )}
        </section>

        <div className="d-flex flex-wrap justify-content-center gap-3 mt-6">
          <button type="button" className="btn btn-label-secondary" onClick={onClose}>{common[lang].close}</button>
          <Link href={`/admin/orgs/${row.orgId}`} className="btn btn-primary">
            {t.preview.openCustomerDetail}
            <i className="icon-base ti tabler-external-link ms-2" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </StaffDialog>
  );
}

function OrganizationIdentity({ row, lang }: { row: InvoiceWorkbenchRow; lang: Lang }) {
  const t = adminRevenue[lang].invoiceWorkbench;
  return (
    <div className="d-flex align-items-center gap-3 min-w-0">
      <span className="avatar avatar-sm flex-shrink-0">
        <span className="avatar-initial rounded-circle bg-label-primary">
          {getInitials(row.orgName)}
        </span>
      </span>
      <div className="min-w-0">
        <Link href={`/admin/orgs/${row.orgId}`} className="fw-medium text-heading d-block text-truncate">
          {row.orgName}
        </Link>
        <small className="text-body-secondary d-block text-truncate">{t.table.billingOrg}</small>
      </div>
    </div>
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
    <div className={className}>
      <small className="text-body-secondary d-block mb-1">{label}</small>
      <span className="text-heading fw-medium d-block text-break">{value}</span>
    </div>
  );
}

function getOldestDate(scope: DateScope, now: number): number | null {
  if (scope === '30') return now - 30 * 24 * 60 * 60 * 1000;
  if (scope === '90') return now - 90 * 24 * 60 * 60 * 1000;
  if (scope === 'year') {
    const date = new Date(now);
    return Date.UTC(date.getUTCFullYear(), 0, 1);
  }
  return null;
}

function formatDate(value: string | null, lang: Lang): string {
  return value ? value.slice(0, 10) : adminRevenue[lang].invoiceWorkbench.table.notSet;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Ödeme yöntemi bilinen üç değerden biri değilse ham kodu insanlaştırır — savunmacı geri düşüş. */
function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

const PAYMENT_METHOD_KEYS: Record<string, keyof AdminRevenueDict['paymentMethod']> = {
  bank_transfer: 'bankTransfer',
  cash: 'cash',
  other: 'other',
};

function paymentMethodLabel(value: string, lang: Lang): string {
  const key = PAYMENT_METHOD_KEYS[value];
  return key ? adminRevenue[lang].paymentMethod[key] : humanize(value);
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import type { InvoiceWorkbenchRow } from '../invoice-workbench-model';
import {
  getAgingBuckets,
  getCurrencySummary,
  getMonthlyRevenue,
  getReceivableFacts,
  getSeatFacts,
  type OperationsOrgRow,
} from '../operations-model';
import {
  getPricingVersionFacts,
  getPricingVersionRows,
  sortPricingAssignments,
  type PricingOrganizationRow,
  type PricingPolicy,
} from '../pricing-version-model';
import { formatCompactDate, formatMoney, InitialAvatar, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminRevenue, type AdminRevenueDict } from '../../../lib/i18n/dict/admin-revenue';

function useCurrency(rows: readonly InvoiceWorkbenchRow[]) {
  const currencies = useMemo(() => [...new Set(rows.map((row) => row.currency))].sort(), [rows]);
  const [currency, setCurrency] = useState(currencies.includes('USD') ? 'USD' : (currencies[0] ?? 'USD'));
  return { currencies, currency: currencies.includes(currency) ? currency : (currencies[0] ?? 'USD'), setCurrency };
}

function CurrencyControl({ currencies, value, onChange, t }: { currencies: string[]; value: string; onChange: (value: string) => void; t: AdminRevenueDict['currencyControl'] }) {
  if (currencies.length <= 1) return <span className="badge bg-label-primary">{t.singleLedger(value)}</span>;
  return <div className="btn-group btn-group-sm" role="group" aria-label={t.ariaLabel}>{currencies.map((currency) => <button type="button" key={currency} className={`btn ${currency === value ? 'btn-primary' : 'btn-label-secondary'}`} onClick={() => onChange(currency)}>{currency}</button>)}</div>;
}

export function ReceivablesView({ rows, now }: { rows: InvoiceWorkbenchRow[]; now: number }) {
  const lang = useLang();
  const t = adminRevenue[lang].receivables;
  const tc = adminRevenue[lang].currencyControl;
  const { currencies, currency, setCurrency } = useCurrency(rows);
  const summary = useMemo(() => getCurrencySummary(rows, currency, now), [currency, now, rows]);
  const buckets = useMemo(() => getAgingBuckets(rows, now, currency), [currency, now, rows]);
  const queue = useMemo(() => rows.filter((row) => row.currency === currency && row.status === 'due').sort((a, b) => (getReceivableFacts(b, now).daysOverdue - getReceivableFacts(a, now).daysOverdue) || b.amountCents - a.amountCents), [currency, now, rows]);
  const maxBucket = Math.max(1, ...Object.values(buckets));
  const collectionPct = summary.billed ? Math.round((summary.collected / summary.billed) * 100) : 0;
  const bucketLabels = t.aging.buckets as Record<string, string>;

  return <>
    <OperationsKpiStrip>
      <OperationsKpi label={t.kpis.outstanding.label} value={formatMoney(summary.outstanding, currency)} support={t.kpis.outstanding.support(summary.dueCount)} icon="tabler-wallet" tone="primary" />
      <OperationsKpi label={t.kpis.overdue.label} value={formatMoney(summary.overdue, currency)} support={t.kpis.overdue.support(summary.overdueCount)} icon="tabler-clock-dollar" tone="danger" />
      <OperationsKpi label={t.kpis.dueSoon.label} value={formatMoney(summary.dueSoon, currency)} support={t.kpis.dueSoon.support} icon="tabler-calendar-dollar" tone="warning" />
      <OperationsKpi label={t.kpis.collectionRate.label} value={t.kpis.collectionRate.pct(collectionPct)} support={t.kpis.collectionRate.support(formatMoney(summary.collected, currency))} icon="tabler-circle-check" tone="success" last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.aging.title} support={t.aging.support} action={<CurrencyControl currencies={currencies} value={currency} onChange={setCurrency} t={tc} />} />
        <div className="d-grid gap-4 mt-6">{Object.entries(buckets).map(([bucket, amount], index) => { const tones = ['success', 'warning', 'danger', 'secondary']; return <div key={bucket}><div className="d-flex justify-content-between gap-3 mb-2"><span className="text-heading fw-medium">{bucketLabels[bucket]}</span><span>{formatMoney(amount, currency)}</span></div><div className="progress" style={{ height: '.55rem' }}><div className={`progress-bar bg-${tones[index]}`} style={{ width: `${Math.round((amount / maxBucket) * 100)}%` }} /></div></div>; })}</div>
      </div></div></div>
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.collectionDesk.title} support={t.collectionDesk.support} action={<Link href="/admin/invoices" className="btn btn-sm btn-label-primary">{t.collectionDesk.linkLabel}<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} />
        <div className="d-grid gap-2">{queue.slice(0, 5).map((row) => { const facts = getReceivableFacts(row, now); const tone = facts.daysOverdue > 30 ? 'danger' : facts.daysOverdue > 0 ? 'warning' : 'primary'; return <Link href={`/admin/orgs/${row.orgId}`} key={row.id} className="d-flex align-items-center gap-3 rounded p-3 bg-body-secondary text-reset"><InitialAvatar label={row.orgName} tone={tone} /><span className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block text-truncate">{row.orgName}</span><small className="text-body-secondary">{row.number} · {facts.daysOverdue ? t.collectionDesk.daysOverdue(facts.daysOverdue) : facts.daysUntilDue === 0 ? t.collectionDesk.dueToday : t.collectionDesk.dueIn(facts.daysUntilDue)}</small></span><span className="text-end"><strong className="d-block text-heading">{formatMoney(row.amountCents, row.currency)}</strong><small className={`text-${tone}`}>{formatCompactDate(row.dueAt, lang)}</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></Link>; })}{queue.length === 0 && <SourceNotice title={t.collectionDesk.emptyTitle} body={t.collectionDesk.emptyBody(currency)} tone="success" icon="tabler-circle-check" />}</div>
      </div></div></div>
    </div>
    <SourceNotice title={t.notice.title} body={t.notice.body} />
  </>;
}

export function SeatLedgerView({ rows }: { rows: OperationsOrgRow[] }) {
  const lang = useLang();
  const t = adminRevenue[lang].seatLedger;
  const totals = rows.reduce((result, row) => ({ active: result.active + row.activeSeats, entitled: result.entitled + row.entitledSeats, over: result.over + Math.max(0, row.activeSeats - row.entitledSeats), exceptions: result.exceptions + Number(getSeatFacts(row).over) }), { active: 0, entitled: 0, over: 0, exceptions: 0 });
  const ranked = [...rows].sort((a, b) => getSeatFacts(b).utilization - getSeatFacts(a).utilization);
  const bands = ranked.reduce((result, row) => { const value = getSeatFacts(row).utilization; if (value > 100) result.over += 1; else if (value >= 80) result.near += 1; else result.available += 1; return result; }, { over: 0, near: 0, available: 0 });
  const utilizationPct = totals.entitled ? Math.round((totals.active / totals.entitled) * 100) : 0;
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label={t.kpis.activeSeats.label} value={String(totals.active)} support={t.kpis.activeSeats.support} icon="tabler-users" tone="primary" />
      <OperationsKpi label={t.kpis.entitledSeats.label} value={String(totals.entitled)} support={t.kpis.entitledSeats.support} icon="tabler-license" tone="info" />
      <OperationsKpi label={t.kpis.overage.label} value={String(totals.over)} support={t.kpis.overage.support(totals.exceptions)} icon="tabler-users-minus" tone="danger" />
      <OperationsKpi label={t.kpis.utilization.label} value={t.kpis.utilization.pct(utilizationPct)} support={t.kpis.utilization.support} icon="tabler-chart-donut" tone="success" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.capacity.title} support={t.capacity.support} /><DonutChart labels={t.capacity.donutLabels as string[]} series={[bands.over, bands.near, bands.available]} colors={['#ff4c51', '#ff9f43', '#28c76f']} centerLabel={t.capacity.donutCenter} height={250} /></div></div></div>
      <div className="col-lg-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.utilizationCard.title} support={t.utilizationCard.support} />
        <div className="d-grid gap-4">{ranked.map((row) => { const facts = getSeatFacts(row); return <div key={row.id}><div className="d-flex align-items-center gap-3 mb-2"><InitialAvatar label={row.name} tone={facts.tone} /><span className="flex-grow-1 min-w-0"><Link href={`/admin/orgs/${row.id}`} className="fw-medium text-heading d-block text-truncate">{row.name}</Link><small className="text-body-secondary">{t.utilizationCard.activeOfEntitled(row.activeSeats, row.entitledSeats)}</small></span><span className={`badge bg-label-${facts.tone}`}>{facts.over ? t.utilizationCard.over(facts.delta) : t.utilizationCard.available(facts.available)}</span></div><div className="progress ms-11" style={{ height: '.45rem' }}><div className={`progress-bar bg-${facts.tone}`} style={{ width: `${Math.min(100, facts.utilization)}%` }} /></div></div>; })}</div>
      </div></div></div>
    </div>
    <SourceNotice title={t.notice.title} body={t.notice.body} tone="warning" icon="tabler-history" />
  </>;
}

export function RevenueOverviewView({ invoices, organizations, now }: { invoices: InvoiceWorkbenchRow[]; organizations: OperationsOrgRow[]; now: number }) {
  const lang = useLang();
  const t = adminRevenue[lang].revenueOverview;
  const tc = adminRevenue[lang].currencyControl;
  const { currencies, currency, setCurrency } = useCurrency(invoices);
  const summary = useMemo(() => getCurrencySummary(invoices, currency, now), [currency, invoices, now]);
  const monthly = useMemo(() => getMonthlyRevenue(invoices, currency, now, lang), [currency, invoices, lang, now]);
  const status = invoices.filter((row) => row.currency === currency).reduce((result, row) => { if (row.status === 'paid') result.paid += 1; else if (row.status === 'due') result.due += 1; else result.void += 1; return result; }, { paid: 0, due: 0, void: 0 });
  const customers = [...new Set(invoices.filter((row) => row.currency === currency).map((row) => row.orgId))].length;
  const ranked = organizations.map((org) => ({ ...org, value: invoices.filter((row) => row.currency === currency && row.orgId === org.id && row.status !== 'void').reduce((sum, row) => sum + row.amountCents, 0) })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const realizationPct = summary.billed ? Math.round((summary.collected / summary.billed) * 100) : 0;
  return <>
    <div className="d-flex justify-content-end mb-4"><CurrencyControl currencies={currencies} value={currency} onChange={setCurrency} t={tc} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.kpis.billed.label} value={formatMoney(summary.billed, currency)} support={t.kpis.billed.support(customers)} icon="tabler-file-dollar" tone="primary" />
      <OperationsKpi label={t.kpis.collected.label} value={formatMoney(summary.collected, currency)} support={t.kpis.collected.support(realizationPct)} icon="tabler-circle-check" tone="success" />
      <OperationsKpi label={t.kpis.outstanding.label} value={formatMoney(summary.outstanding, currency)} support={t.kpis.outstanding.support(summary.dueCount)} icon="tabler-wallet" tone="warning" />
      <OperationsKpi label={t.kpis.overdue.label} value={formatMoney(summary.overdue, currency)} support={t.kpis.overdue.support(summary.overdueCount)} icon="tabler-alert-triangle" tone="danger" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.movement.title} support={t.movement.support} /><BarsChart categories={monthly.map((point) => point.label)} seriesName={t.movement.seriesName} data={monthly.map((point) => Math.round(point.billed / 100))} color="#7367f0" height={280} /><div className="d-flex gap-4 justify-content-center small"><span><i className="icon-base ti tabler-point-filled text-primary" /> {t.movement.legendBilled}</span><span className="text-body-secondary">{t.movement.collectedTotal(formatMoney(summary.collected, currency))}</span></div></div></div></div>
      <div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.mix.title} support={t.mix.support} /><DonutChart labels={t.mix.donutLabels as string[]} series={[status.paid, status.due, status.void]} colors={['#28c76f', '#ff9f43', '#a8aaae']} centerLabel={t.mix.donutCenter} height={275} /></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.relationships.title} support={t.relationships.support} action={<Link href="/admin/invoices" className="btn btn-sm btn-label-primary">{t.relationships.openInvoices}</Link>} /><div className="row g-4">{ranked.map((row, index) => { const tones = ['primary', 'success', 'info', 'warning', 'secondary']; const tone = tones[index] ?? 'primary'; return <div className="col-md-6 col-xl" key={row.id}><Link href={`/admin/orgs/${row.id}`} className={`d-block rounded bg-label-${tone} p-4 text-reset h-100`}><small className={`text-${tone} fw-semibold`}>0{index + 1}</small><h6 className="mt-3 mb-1 text-truncate">{row.name}</h6><strong className="fs-5">{formatMoney(row.value, currency)}</strong><small className="text-body-secondary d-block mt-2">{t.relationships.activeSeats(row.activeSeats)}</small></Link></div>; })}</div></div></div>
    <SourceNotice title={t.notice.title} body={t.notice.body} />
  </>;
}

function pricingVersionLabel(t: AdminRevenueDict['pricingVersions'], version: string, currentVersion: string) {
  if (version === currentVersion) return t.distribution.currentPolicy;
  return version.replace(/-/g, ' ');
}

export function PricingVersionsView({
  rows,
  policy,
  preview = false,
}: {
  rows: PricingOrganizationRow[];
  policy: PricingPolicy;
  preview?: boolean;
}) {
  const lang = useLang();
  const t = adminRevenue[lang].pricingVersions;
  const facts = getPricingVersionFacts(rows, policy);
  const versions = getPricingVersionRows(rows, policy);
  const assignments = sortPricingAssignments(rows, policy);
  const maxCustomers = Math.max(1, ...versions.map((row) => row.customers));
  const currentAnnualPrice = formatMoney(policy.perSeatYearCents, policy.currency);

  return <>
    {preview && <div className="alert alert-warning d-flex align-items-center gap-3 mb-6" role="note"><i className="icon-base ti tabler-flask icon-24px" /><div><strong className="d-block">{t.preview.title}</strong><span>{t.preview.body}</span></div></div>}

    <OperationsKpiStrip>
      <OperationsKpi label={t.kpis.currentCoverage.label} value={t.kpis.currentCoverage.pct(facts.coverage)} support={t.kpis.currentCoverage.support(facts.currentCustomers, facts.customers)} icon="tabler-rosette-discount-check" tone="success" />
      <OperationsKpi label={t.distribution.grandfathered} value={String(facts.legacyCustomers)} support={t.kpis.grandfathered.support(facts.legacySeats)} icon="tabler-history" tone="warning" />
      <OperationsKpi label={t.kpis.storedVersions.label} value={String(facts.versions)} support={t.kpis.storedVersions.support} icon="tabler-versions" tone="info" />
      <OperationsKpi label={t.kpis.liveListPrice.label} value={currentAnnualPrice} support={t.kpis.liveListPrice.support} icon="tabler-currency-dollar" tone="primary" last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xl-5">
        <div className="card h-100 bg-primary text-white overflow-hidden">
          <div className="card-body position-relative p-6 p-xl-8">
            <div className="d-flex justify-content-between align-items-start gap-4 mb-8">
              <div><span className="badge bg-white text-primary mb-3">{t.policyCard.badge}</span><h4 className="text-white mb-1">{t.policyCard.title}</h4><p className="text-white text-opacity-75 mb-0">{t.policyCard.body}</p></div>
              <span className="avatar avatar-lg"><span className="avatar-initial rounded mm-pricing-policy-icon"><i className="icon-base ti tabler-currency-dollar icon-28px" /></span></span>
            </div>
            <div className="d-flex align-items-end gap-3 mb-7"><span className="display-4 fw-bold text-white lh-1">{currentAnnualPrice}</span><span className="text-white text-opacity-75 pb-1">{t.policyCard.perSenderYear}</span></div>
            <div className="row g-3 mb-7">
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">{t.policyCard.minimum}</small><strong>{t.policyCard.minimumValue(policy.minSeats)}</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">{t.policyCard.trial}</small><strong>{t.policyCard.trialValue(policy.trialDays, policy.trialSeats)}</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">{t.policyCard.cardRequired}</small><strong>{policy.trialRequiresCard ? t.policyCard.yes : t.policyCard.no}</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">{t.policyCard.freePlan}</small><strong>{policy.hasFreePlan ? t.policyCard.available : t.policyCard.notOffered}</strong></div></div>
            </div>
            <div className="border-top border-white border-opacity-25 pt-4"><small className="text-white text-opacity-75 d-block mb-1">{t.policyCard.versionKey}</small><code className="text-white">{policy.version}</code></div>
          </div>
        </div>
      </div>

      <div className="col-xl-7">
        <div className="card h-100"><div className="card-body p-6">
          <OperationsSectionHeader title={t.distribution.title} support={t.distribution.support} />
          <div className="row align-items-center g-6">
            <div className="col-md-5"><DonutChart labels={versions.map((row) => pricingVersionLabel(t, row.version, policy.version))} series={versions.map((row) => row.customers)} colors={['#28c76f', '#ff9f43', '#00bad1', '#7367f0']} centerLabel={t.distribution.donutCenter} height={255} /></div>
            <div className="col-md-7"><div className="d-grid gap-5">{versions.map((row, index) => { const tone = row.current ? 'success' : index % 2 ? 'info' : 'warning'; return <div key={row.version}>
              <div className="d-flex align-items-start justify-content-between gap-3 mb-2"><div className="min-w-0"><span className={`badge bg-label-${tone} mb-2`}>{row.current ? t.distribution.current : t.distribution.grandfathered}</span><h6 className="mb-0 text-truncate" title={row.version}>{pricingVersionLabel(t, row.version, policy.version)}</h6></div><div className="text-end flex-shrink-0"><strong className="fs-5 text-heading">{row.customers}</strong><small className="text-body-secondary d-block">{t.distribution.customersWord}</small></div></div>
              <div className="progress mb-2" style={{ height: '.45rem' }}><div className={`progress-bar bg-${tone}`} style={{ width: `${Math.max(8, Math.round((row.customers / maxCustomers) * 100))}%` }} /></div>
              <div className="d-flex justify-content-between gap-3 small text-body-secondary"><span>{t.distribution.entitledActive(row.entitledSeats, row.activeSeats)}</span><span>{t.distribution.activeAccounts(row.activeCustomers)}</span></div>
            </div>; })}</div></div>
          </div>
        </div></div>
      </div>
    </div>

    <div className="card mb-6">
      <div className="card-body p-0">
        <div className="p-6 pb-3"><OperationsSectionHeader title={t.assignments.title} support={t.assignments.support} action={<span className="badge bg-label-warning">{t.assignments.needsContext(facts.legacyCustomers)}</span>} /></div>
        <div className="table-responsive d-none d-lg-block">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>{t.assignments.headers.customer}</th><th>{t.assignments.headers.versionAssignment}</th><th>{t.assignments.headers.entitlement}</th><th>{t.assignments.headers.state}</th><th>{t.assignments.headers.customerSince}</th><th className="text-end">{t.assignments.headers.open}</th></tr></thead>
            <tbody>{assignments.map((row, index) => { const current = row.priceVersion === policy.version; const tone = current ? 'success' : 'warning'; const href = preview ? '#' : `/admin/orgs/${row.id}`; return <tr key={row.id}>
              <td><div className="d-flex align-items-center gap-3"><InitialAvatar label={row.name} tone={current ? 'primary' : 'warning'} /><div><span className="fw-medium text-heading d-block">{row.name}</span><small className="text-body-secondary">{t.assignments.assignmentIndex(String(index + 1).padStart(2, '0'))}</small></div></div></td>
              <td><span className={`badge bg-label-${tone} mb-1`}>{current ? t.distribution.current : t.distribution.grandfathered}</span><code className="d-block small text-body-secondary">{row.priceVersion}</code></td>
              <td><strong className="text-heading">{row.activeSeats} / {row.entitledSeats}</strong><small className="text-body-secondary d-block">{t.assignments.activeEntitled}</small></td>
              <td><span className={`badge bg-label-${row.entitlementState === 'active' ? 'success' : row.entitlementState === 'trial' ? 'info' : 'danger'}`}>{row.entitlementState.replace(/_/g, ' ')}</span></td>
              <td>{formatCompactDate(row.createdAt, lang)}</td>
              <td className="text-end">{preview ? <button type="button" className="btn btn-sm btn-icon btn-label-secondary" disabled aria-label={t.assignments.openAria(row.name)}><i className="icon-base ti tabler-arrow-up-right" /></button> : <Link href={href} className="btn btn-sm btn-icon btn-label-primary" aria-label={t.assignments.openAria(row.name)}><i className="icon-base ti tabler-arrow-up-right" /></Link>}</td>
            </tr>; })}</tbody>
          </table>
        </div>
        <div className="d-grid d-lg-none gap-0 border-top">{assignments.map((row) => { const current = row.priceVersion === policy.version; const tone = current ? 'success' : 'warning'; return <article className="p-4 border-bottom" key={`${row.id}-mobile`}>
          <div className="d-flex align-items-start gap-3 mb-4"><InitialAvatar label={row.name} tone={current ? 'primary' : 'warning'} /><div className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block">{row.name}</span><small className="text-body-secondary">{t.assignments.customerSincePrefix(formatCompactDate(row.createdAt, lang))}</small></div><span className={`badge bg-label-${tone}`}>{current ? t.distribution.current : t.distribution.grandfathered}</span></div>
          <div className="rounded bg-body-secondary p-3 mb-3"><small className="text-body-secondary d-block mb-1">{t.assignments.storedVersion}</small><code className="text-body text-break">{row.priceVersion}</code></div>
          <div className="d-flex align-items-end justify-content-between gap-3"><div><small className="text-body-secondary d-block">{t.assignments.activeEntitledCap}</small><strong className="text-heading">{row.activeSeats} / {row.entitledSeats}</strong></div><div className="text-end"><small className="text-body-secondary d-block mb-1">{t.assignments.headers.state}</small><span className={`badge bg-label-${row.entitlementState === 'active' ? 'success' : row.entitlementState === 'trial' ? 'info' : 'danger'}`}>{row.entitlementState.replace(/_/g, ' ')}</span></div>{preview ? <button type="button" className="btn btn-sm btn-icon btn-label-secondary" disabled aria-label={t.assignments.openAria(row.name)}><i className="icon-base ti tabler-arrow-up-right" /></button> : <Link href={`/admin/orgs/${row.id}`} className="btn btn-sm btn-icon btn-label-primary" aria-label={t.assignments.openAria(row.name)}><i className="icon-base ti tabler-arrow-up-right" /></Link>}</div>
        </article>; })}</div>
      </div>
    </div>

    <div className="row g-6">
      <div className="col-lg-7"><SourceNotice title={t.notices.legacyTitle} body={t.notices.legacyBody} tone="warning" icon="tabler-alert-triangle" /></div>
      <div className="col-lg-5"><SourceNotice title={t.notices.boundaryTitle} body={t.notices.boundaryBody} tone="info" icon="tabler-lock" /></div>
    </div>
  </>;
}

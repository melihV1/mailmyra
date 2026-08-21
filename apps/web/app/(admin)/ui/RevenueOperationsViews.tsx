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

function useCurrency(rows: readonly InvoiceWorkbenchRow[]) {
  const currencies = useMemo(() => [...new Set(rows.map((row) => row.currency))].sort(), [rows]);
  const [currency, setCurrency] = useState(currencies.includes('USD') ? 'USD' : (currencies[0] ?? 'USD'));
  return { currencies, currency: currencies.includes(currency) ? currency : (currencies[0] ?? 'USD'), setCurrency };
}

function CurrencyControl({ currencies, value, onChange }: { currencies: string[]; value: string; onChange: (value: string) => void }) {
  if (currencies.length <= 1) return <span className="badge bg-label-primary">{value} ledger</span>;
  return <div className="btn-group btn-group-sm" role="group" aria-label="Currency ledger">{currencies.map((currency) => <button type="button" key={currency} className={`btn ${currency === value ? 'btn-primary' : 'btn-label-secondary'}`} onClick={() => onChange(currency)}>{currency}</button>)}</div>;
}

export function ReceivablesView({ rows, now }: { rows: InvoiceWorkbenchRow[]; now: number }) {
  const { currencies, currency, setCurrency } = useCurrency(rows);
  const summary = useMemo(() => getCurrencySummary(rows, currency, now), [currency, now, rows]);
  const buckets = useMemo(() => getAgingBuckets(rows, now, currency), [currency, now, rows]);
  const queue = useMemo(() => rows.filter((row) => row.currency === currency && row.status === 'due').sort((a, b) => (getReceivableFacts(b, now).daysOverdue - getReceivableFacts(a, now).daysOverdue) || b.amountCents - a.amountCents), [currency, now, rows]);
  const maxBucket = Math.max(1, ...Object.values(buckets));

  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Outstanding" value={formatMoney(summary.outstanding, currency)} support={`${summary.dueCount} open invoices`} icon="tabler-wallet" tone="primary" />
      <OperationsKpi label="Overdue" value={formatMoney(summary.overdue, currency)} support={`${summary.overdueCount} need follow-up`} icon="tabler-clock-dollar" tone="danger" />
      <OperationsKpi label="Due within 7 days" value={formatMoney(summary.dueSoon, currency)} support="Upcoming collection window" icon="tabler-calendar-dollar" tone="warning" />
      <OperationsKpi label="Collection rate" value={`${summary.billed ? Math.round((summary.collected / summary.billed) * 100) : 0}%`} support={`${formatMoney(summary.collected, currency)} collected`} icon="tabler-circle-check" tone="success" last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xl-5"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Aging exposure" support="Open balance grouped by days past due." action={<CurrencyControl currencies={currencies} value={currency} onChange={setCurrency} />} />
        <div className="d-grid gap-4 mt-6">{Object.entries(buckets).map(([bucket, amount], index) => { const tones = ['success', 'warning', 'danger', 'secondary']; const labels: Record<string, string> = { current: 'Current', '1-7': '1–7 days', '8-30': '8–30 days', '31+': '31+ days' }; return <div key={bucket}><div className="d-flex justify-content-between gap-3 mb-2"><span className="text-heading fw-medium">{labels[bucket]}</span><span>{formatMoney(amount, currency)}</span></div><div className="progress" style={{ height: '.55rem' }}><div className={`progress-bar bg-${tones[index]}`} style={{ width: `${Math.round((amount / maxBucket) * 100)}%` }} /></div></div>; })}</div>
      </div></div></div>
      <div className="col-xl-7"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Collection desk" support="Prioritized by overdue age, then balance." action={<Link href="/admin/invoices" className="btn btn-sm btn-label-primary">Invoice ledger<i className="icon-base ti tabler-arrow-right ms-2" /></Link>} />
        <div className="d-grid gap-2">{queue.slice(0, 5).map((row) => { const facts = getReceivableFacts(row, now); const tone = facts.daysOverdue > 30 ? 'danger' : facts.daysOverdue > 0 ? 'warning' : 'primary'; return <Link href={`/admin/orgs/${row.orgId}`} key={row.id} className="d-flex align-items-center gap-3 rounded p-3 bg-body-secondary text-reset"><InitialAvatar label={row.orgName} tone={tone} /><span className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block text-truncate">{row.orgName}</span><small className="text-body-secondary">{row.number} · {facts.daysOverdue ? `${facts.daysOverdue}d overdue` : facts.daysUntilDue === 0 ? 'Due today' : `Due in ${facts.daysUntilDue}d`}</small></span><span className="text-end"><strong className="d-block text-heading">{formatMoney(row.amountCents, row.currency)}</strong><small className={`text-${tone}`}>{formatCompactDate(row.dueAt)}</small></span><i className="icon-base ti tabler-chevron-right text-body-secondary" /></Link>; })}{queue.length === 0 && <SourceNotice title="Collection queue clear" body={`No open ${currency} invoices require collection work.`} tone="success" icon="tabler-circle-check" />}</div>
      </div></div></div>
    </div>
    <SourceNotice title="Authoritative balance" body="Amounts come from invoice records. Currencies stay in separate ledgers and are never summed across USD and EUR." />
  </>;
}

export function SeatLedgerView({ rows }: { rows: OperationsOrgRow[] }) {
  const totals = rows.reduce((result, row) => ({ active: result.active + row.activeSeats, entitled: result.entitled + row.entitledSeats, over: result.over + Math.max(0, row.activeSeats - row.entitledSeats), exceptions: result.exceptions + Number(getSeatFacts(row).over) }), { active: 0, entitled: 0, over: 0, exceptions: 0 });
  const ranked = [...rows].sort((a, b) => getSeatFacts(b).utilization - getSeatFacts(a).utilization);
  const bands = ranked.reduce((result, row) => { const value = getSeatFacts(row).utilization; if (value > 100) result.over += 1; else if (value >= 80) result.near += 1; else result.available += 1; return result; }, { over: 0, near: 0, available: 0 });
  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Active seats" value={String(totals.active)} support="Current billing footprint" icon="tabler-users" tone="primary" />
      <OperationsKpi label="Entitled seats" value={String(totals.entitled)} support="Contracted capacity" icon="tabler-license" tone="info" />
      <OperationsKpi label="Overage" value={String(totals.over)} support={`${totals.exceptions} customer exceptions`} icon="tabler-users-minus" tone="danger" />
      <OperationsKpi label="Utilization" value={`${totals.entitled ? Math.round((totals.active / totals.entitled) * 100) : 0}%`} support="Across root billing orgs" icon="tabler-chart-donut" tone="success" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Capacity distribution" support="Customer count by current utilization." /><DonutChart labels={['Over capacity', '80–100%', 'Below 80%']} series={[bands.over, bands.near, bands.available]} colors={['#ff4c51', '#ff9f43', '#28c76f']} centerLabel="Customers" height={250} /></div></div></div>
      <div className="col-lg-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Seat utilization" support="Highest utilization first; overages stay visible at the top." />
        <div className="d-grid gap-4">{ranked.map((row) => { const facts = getSeatFacts(row); return <div key={row.id}><div className="d-flex align-items-center gap-3 mb-2"><InitialAvatar label={row.name} tone={facts.tone} /><span className="flex-grow-1 min-w-0"><Link href={`/admin/orgs/${row.id}`} className="fw-medium text-heading d-block text-truncate">{row.name}</Link><small className="text-body-secondary">{row.activeSeats} active / {row.entitledSeats} entitled</small></span><span className={`badge bg-label-${facts.tone}`}>{facts.over ? `${facts.delta} over` : `${facts.available} available`}</span></div><div className="progress ms-11" style={{ height: '.45rem' }}><div className={`progress-bar bg-${facts.tone}`} style={{ width: `${Math.min(100, facts.utilization)}%` }} /></div></div>; })}</div>
      </div></div></div>
    </div>
    <SourceNotice title="Snapshot, not history" body="The current schema stores active and entitled seats, but not an append-only seat movement ledger. This screen reports the current authoritative position without inventing historical movements." tone="warning" icon="tabler-history" />
  </>;
}

export function RevenueOverviewView({ invoices, organizations, now }: { invoices: InvoiceWorkbenchRow[]; organizations: OperationsOrgRow[]; now: number }) {
  const { currencies, currency, setCurrency } = useCurrency(invoices);
  const summary = useMemo(() => getCurrencySummary(invoices, currency, now), [currency, invoices, now]);
  const monthly = useMemo(() => getMonthlyRevenue(invoices, currency, now), [currency, invoices, now]);
  const status = invoices.filter((row) => row.currency === currency).reduce((result, row) => { if (row.status === 'paid') result.paid += 1; else if (row.status === 'due') result.due += 1; else result.void += 1; return result; }, { paid: 0, due: 0, void: 0 });
  const customers = [...new Set(invoices.filter((row) => row.currency === currency).map((row) => row.orgId))].length;
  const ranked = organizations.map((org) => ({ ...org, value: invoices.filter((row) => row.currency === currency && row.orgId === org.id && row.status !== 'void').reduce((sum, row) => sum + row.amountCents, 0) })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  return <>
    <div className="d-flex justify-content-end mb-4"><CurrencyControl currencies={currencies} value={currency} onChange={setCurrency} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label="Billed" value={formatMoney(summary.billed, currency)} support={`${customers} billing customers`} icon="tabler-file-dollar" tone="primary" />
      <OperationsKpi label="Collected" value={formatMoney(summary.collected, currency)} support={`${summary.billed ? Math.round((summary.collected / summary.billed) * 100) : 0}% realization`} icon="tabler-circle-check" tone="success" />
      <OperationsKpi label="Outstanding" value={formatMoney(summary.outstanding, currency)} support={`${summary.dueCount} open records`} icon="tabler-wallet" tone="warning" />
      <OperationsKpi label="Overdue" value={formatMoney(summary.overdue, currency)} support={`${summary.overdueCount} collection risks`} icon="tabler-alert-triangle" tone="danger" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Six-month billing movement" support="Issued versus collected invoice value by issue month." /><BarsChart categories={monthly.map((point) => point.label)} seriesName="Billed" data={monthly.map((point) => Math.round(point.billed / 100))} color="#7367f0" height={280} /><div className="d-flex gap-4 justify-content-center small"><span><i className="icon-base ti tabler-point-filled text-primary" /> Billed</span><span className="text-body-secondary">Collected total: {formatMoney(summary.collected, currency)}</span></div></div></div></div>
      <div className="col-xl-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Invoice mix" support="Record status in the selected ledger." /><DonutChart labels={['Paid', 'Due', 'Void']} series={[status.paid, status.due, status.void]} colors={['#28c76f', '#ff9f43', '#a8aaae']} centerLabel="Invoices" height={275} /></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Largest billing relationships" support="Billed value by root organization in the selected currency." action={<Link href="/admin/invoices" className="btn btn-sm btn-label-primary">Open invoices</Link>} /><div className="row g-4">{ranked.map((row, index) => { const tones = ['primary', 'success', 'info', 'warning', 'secondary']; const tone = tones[index] ?? 'primary'; return <div className="col-md-6 col-xl" key={row.id}><Link href={`/admin/orgs/${row.id}`} className={`d-block rounded bg-label-${tone} p-4 text-reset h-100`}><small className={`text-${tone} fw-semibold`}>0{index + 1}</small><h6 className="mt-3 mb-1 text-truncate">{row.name}</h6><strong className="fs-5">{formatMoney(row.value, currency)}</strong><small className="text-body-secondary d-block mt-2">{row.activeSeats} active seats</small></Link></div>; })}</div></div></div>
    <SourceNotice title="Ledger-scoped overview" body="This overview uses recorded invoices only. It does not infer MRR, ARR or forecast revenue from seats, and each currency remains isolated." />
  </>;
}

function pricingVersionLabel(version: string, currentVersion: string) {
  if (version === currentVersion) return 'Current policy';
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
  const facts = getPricingVersionFacts(rows, policy);
  const versions = getPricingVersionRows(rows, policy);
  const assignments = sortPricingAssignments(rows, policy);
  const maxCustomers = Math.max(1, ...versions.map((row) => row.customers));
  const currentAnnualPrice = formatMoney(policy.perSeatYearCents, policy.currency);

  return <>
    {preview && <div className="alert alert-warning d-flex align-items-center gap-3 mb-6" role="note"><i className="icon-base ti tabler-flask icon-24px" /><div><strong className="d-block">Preview data</strong><span>Representative version assignments are shown for layout review only.</span></div></div>}

    <OperationsKpiStrip>
      <OperationsKpi label="Current coverage" value={`${facts.coverage}%`} support={`${facts.currentCustomers} of ${facts.customers} customers`} icon="tabler-rosette-discount-check" tone="success" />
      <OperationsKpi label="Grandfathered" value={String(facts.legacyCustomers)} support={`${facts.legacySeats} entitled seats`} icon="tabler-history" tone="warning" />
      <OperationsKpi label="Stored versions" value={String(facts.versions)} support="Distinct assignment keys" icon="tabler-versions" tone="info" />
      <OperationsKpi label="Live list price" value={currentAnnualPrice} support="Per active sender / year" icon="tabler-currency-dollar" tone="primary" last />
    </OperationsKpiStrip>

    <div className="row g-6 mb-6">
      <div className="col-xl-5">
        <div className="card h-100 bg-primary text-white overflow-hidden">
          <div className="card-body position-relative p-6 p-xl-8">
            <div className="d-flex justify-content-between align-items-start gap-4 mb-8">
              <div><span className="badge bg-white text-primary mb-3">LIVE POLICY</span><h4 className="text-white mb-1">Annual sender pricing</h4><p className="text-white text-opacity-75 mb-0">The policy applied to newly created customer workspaces.</p></div>
              <span className="avatar avatar-lg"><span className="avatar-initial rounded mm-pricing-policy-icon"><i className="icon-base ti tabler-currency-dollar icon-28px" /></span></span>
            </div>
            <div className="d-flex align-items-end gap-3 mb-7"><span className="display-4 fw-bold text-white lh-1">{currentAnnualPrice}</span><span className="text-white text-opacity-75 pb-1">per active sender / year</span></div>
            <div className="row g-3 mb-7">
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">Minimum</small><strong>{policy.minSeats} sender</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">Trial</small><strong>{policy.trialDays} days · {policy.trialSeats} seats</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">Card required</small><strong>{policy.trialRequiresCard ? 'Yes' : 'No'}</strong></div></div>
              <div className="col-6"><div className="rounded p-3 mm-pricing-policy-tile"><small className="d-block">Free plan</small><strong>{policy.hasFreePlan ? 'Available' : 'Not offered'}</strong></div></div>
            </div>
            <div className="border-top border-white border-opacity-25 pt-4"><small className="text-white text-opacity-75 d-block mb-1">VERSION KEY</small><code className="text-white">{policy.version}</code></div>
          </div>
        </div>
      </div>

      <div className="col-xl-7">
        <div className="card h-100"><div className="card-body p-6">
          <OperationsSectionHeader title="Version distribution" support="Customer and entitlement exposure by the stored organization version." />
          <div className="row align-items-center g-6">
            <div className="col-md-5"><DonutChart labels={versions.map((row) => pricingVersionLabel(row.version, policy.version))} series={versions.map((row) => row.customers)} colors={['#28c76f', '#ff9f43', '#00bad1', '#7367f0']} centerLabel="Customers" height={255} /></div>
            <div className="col-md-7"><div className="d-grid gap-5">{versions.map((row, index) => { const tone = row.current ? 'success' : index % 2 ? 'info' : 'warning'; return <div key={row.version}>
              <div className="d-flex align-items-start justify-content-between gap-3 mb-2"><div className="min-w-0"><span className={`badge bg-label-${tone} mb-2`}>{row.current ? 'Current' : 'Grandfathered'}</span><h6 className="mb-0 text-truncate" title={row.version}>{pricingVersionLabel(row.version, policy.version)}</h6></div><div className="text-end flex-shrink-0"><strong className="fs-5 text-heading">{row.customers}</strong><small className="text-body-secondary d-block">customers</small></div></div>
              <div className="progress mb-2" style={{ height: '.45rem' }}><div className={`progress-bar bg-${tone}`} style={{ width: `${Math.max(8, Math.round((row.customers / maxCustomers) * 100))}%` }} /></div>
              <div className="d-flex justify-content-between gap-3 small text-body-secondary"><span>{row.entitledSeats} entitled · {row.activeSeats} active</span><span>{row.activeCustomers} active accounts</span></div>
            </div>; })}</div></div>
          </div>
        </div></div>
      </div>
    </div>

    <div className="card mb-6">
      <div className="card-body p-0">
        <div className="p-6 pb-3"><OperationsSectionHeader title="Customer assignments" support="Grandfathered records are placed first so pricing exceptions remain reviewable." action={<span className="badge bg-label-warning">{facts.legacyCustomers} need policy context</span>} /></div>
        <div className="table-responsive d-none d-lg-block">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>Customer</th><th>Version assignment</th><th>Entitlement</th><th>State</th><th>Customer since</th><th className="text-end">Open</th></tr></thead>
            <tbody>{assignments.map((row, index) => { const current = row.priceVersion === policy.version; const tone = current ? 'success' : 'warning'; const href = preview ? '#' : `/admin/orgs/${row.id}`; return <tr key={row.id}>
              <td><div className="d-flex align-items-center gap-3"><InitialAvatar label={row.name} tone={current ? 'primary' : 'warning'} /><div><span className="fw-medium text-heading d-block">{row.name}</span><small className="text-body-secondary">Assignment {String(index + 1).padStart(2, '0')}</small></div></div></td>
              <td><span className={`badge bg-label-${tone} mb-1`}>{current ? 'Current' : 'Grandfathered'}</span><code className="d-block small text-body-secondary">{row.priceVersion}</code></td>
              <td><strong className="text-heading">{row.activeSeats} / {row.entitledSeats}</strong><small className="text-body-secondary d-block">active / entitled</small></td>
              <td><span className={`badge bg-label-${row.entitlementState === 'active' ? 'success' : row.entitlementState === 'trial' ? 'info' : 'danger'}`}>{row.entitlementState.replace(/_/g, ' ')}</span></td>
              <td>{formatCompactDate(row.createdAt)}</td>
              <td className="text-end">{preview ? <button type="button" className="btn btn-sm btn-icon btn-label-secondary" disabled aria-label={`Open ${row.name}`}><i className="icon-base ti tabler-arrow-up-right" /></button> : <Link href={href} className="btn btn-sm btn-icon btn-label-primary" aria-label={`Open ${row.name}`}><i className="icon-base ti tabler-arrow-up-right" /></Link>}</td>
            </tr>; })}</tbody>
          </table>
        </div>
        <div className="d-grid d-lg-none gap-0 border-top">{assignments.map((row) => { const current = row.priceVersion === policy.version; const tone = current ? 'success' : 'warning'; return <article className="p-4 border-bottom" key={`${row.id}-mobile`}>
          <div className="d-flex align-items-start gap-3 mb-4"><InitialAvatar label={row.name} tone={current ? 'primary' : 'warning'} /><div className="flex-grow-1 min-w-0"><span className="fw-medium text-heading d-block">{row.name}</span><small className="text-body-secondary">Customer since {formatCompactDate(row.createdAt)}</small></div><span className={`badge bg-label-${tone}`}>{current ? 'Current' : 'Grandfathered'}</span></div>
          <div className="rounded bg-body-secondary p-3 mb-3"><small className="text-body-secondary d-block mb-1">Stored version</small><code className="text-body text-break">{row.priceVersion}</code></div>
          <div className="d-flex align-items-end justify-content-between gap-3"><div><small className="text-body-secondary d-block">Active / entitled</small><strong className="text-heading">{row.activeSeats} / {row.entitledSeats}</strong></div><div className="text-end"><small className="text-body-secondary d-block mb-1">State</small><span className={`badge bg-label-${row.entitlementState === 'active' ? 'success' : row.entitlementState === 'trial' ? 'info' : 'danger'}`}>{row.entitlementState.replace(/_/g, ' ')}</span></div>{preview ? <button type="button" className="btn btn-sm btn-icon btn-label-secondary" disabled aria-label={`Open ${row.name}`}><i className="icon-base ti tabler-arrow-up-right" /></button> : <Link href={`/admin/orgs/${row.id}`} className="btn btn-sm btn-icon btn-label-primary" aria-label={`Open ${row.name}`}><i className="icon-base ti tabler-arrow-up-right" /></Link>}</div>
        </article>; })}</div>
      </div>
    </div>

    <div className="row g-6">
      <div className="col-lg-7"><SourceNotice title="Legacy price amounts are not inferred" body="A stored version key proves which list a customer belongs to, but the current schema does not encode historical unit prices. Invoice amounts remain the financial source of truth." tone="warning" icon="tabler-alert-triangle" /></div>
      <div className="col-lg-5"><SourceNotice title="Change boundary" body="Changing the live PRICING constant affects new assignments. Existing organizations remain on their stored version until an audited entitlement workflow updates them." tone="info" icon="tabler-lock" /></div>
    </div>
  </>;
}

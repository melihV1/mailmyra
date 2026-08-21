'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DonutChart } from '../../(app)/charts/DonutChart';
import { getCustomerHealth, getSeatFacts, type CustomerUserRow, type OperationsOrgRow } from '../operations-model';
import { formatCompactDate, InitialAvatar, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { StaffDialog } from './StaffDialog';

export function CustomerUsersView({ rows }: { rows: CustomerUserRow[] }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [preview, setPreview] = useState<CustomerUserRow | null>(null);
  const visible = useMemo(() => rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    if (needle && !row.email.toLowerCase().includes(needle) && !row.memberships.some((membership) => membership.orgName.toLowerCase().includes(needle))) return false;
    if (role !== 'all' && !row.memberships.some((membership) => membership.role === role)) return false;
    return true;
  }), [query, role, rows]);
  const verified = rows.filter((row) => row.emailVerifiedAt).length;
  const active = rows.filter((row) => row.lastLoginAt).length;
  const multiOrg = rows.filter((row) => row.memberships.length > 1).length;

  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Customer users" value={String(rows.length)} support="Non-staff accounts" icon="tabler-users" tone="primary" />
      <OperationsKpi label="Verified" value={String(verified)} support={`${rows.length ? Math.round((verified / rows.length) * 100) : 0}% email coverage`} icon="tabler-user-check" tone="success" />
      <OperationsKpi label="Seen login" value={String(active)} support="At least one recorded login" icon="tabler-login" tone="info" />
      <OperationsKpi label="Multi-workspace" value={String(multiOrg)} support="Membership in 2+ orgs" icon="tabler-building-community" tone="warning" last />
    </OperationsKpiStrip>
    <div className="card">
      <div className="card-body border-bottom"><OperationsSectionHeader title="User directory" support="Read-only cross-customer identity lookup; every loaded organization is access-logged." /><div className="row g-3"><div className="col-lg-8"><div className="input-group"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" type="search" placeholder="Email or organization" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><div className="col-lg-4"><select className="form-select" value={role} onChange={(event) => setRole(event.target.value)}><option value="all">All roles</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></div></div></div>
      <div className="table-responsive"><table className="table table-hover align-middle mb-0 mm-operations-table"><thead><tr><th>User</th><th>Workspace</th><th>Role</th><th>Verification</th><th>Last login</th><th className="text-end">View</th></tr></thead><tbody>{visible.map((row) => { const primary = row.memberships[0]; return <tr key={row.id}><td><div className="d-flex align-items-center gap-3"><InitialAvatar label={row.email} /><div className="min-w-0"><span className="text-heading fw-medium d-block text-truncate" style={{ maxWidth: '15rem' }}>{row.email}</span><small className="text-body-secondary">Joined {formatCompactDate(row.createdAt)}</small></div></div></td><td>{primary ? <Link href={`/admin/orgs/${primary.orgId}`} className="fw-medium text-heading">{primary.orgName}</Link> : <span className="text-body-secondary">No workspace</span>}{row.memberships.length > 1 && <span className="badge bg-label-info ms-2">+{row.memberships.length - 1}</span>}</td><td><span className="badge bg-label-primary text-capitalize">{primary?.role ?? 'none'}</span></td><td><span className={`badge bg-label-${row.emailVerifiedAt ? 'success' : 'warning'}`}>{row.emailVerifiedAt ? 'Verified' : 'Pending'}</span></td><td><span className="text-heading">{formatCompactDate(row.lastLoginAt)}</span></td><td className="text-end"><button type="button" className="btn btn-sm btn-icon btn-label-primary" title="Preview user" aria-label={`Preview ${row.email}`} onClick={() => setPreview(row)}><i className="icon-base ti tabler-eye" /></button></td></tr>; })}</tbody></table></div>
      {visible.length === 0 && <div className="card-body"><SourceNotice title="No matching users" body="Change the search or role filter to widen the directory." tone="warning" icon="tabler-user-search" /></div>}
    </div>
    {preview && <StaffDialog title="Customer user" subtitle="Read-only identity and workspace membership context." labelledBy={`Customer user ${preview.email}`} busy={false} onClose={() => setPreview(null)} wide><div className="d-flex align-items-center gap-4 mb-6"><span className="avatar avatar-xl"><span className="avatar-initial rounded-circle bg-label-primary text-primary">{preview.email.slice(0, 2).toUpperCase()}</span></span><div><h5 className="mb-1">{preview.email}</h5><span className={`badge bg-label-${preview.emailVerifiedAt ? 'success' : 'warning'}`}>{preview.emailVerifiedAt ? 'Email verified' : 'Verification pending'}</span></div></div><div className="row g-4 mb-6"><Detail label="Account created" value={formatCompactDate(preview.createdAt)} /><Detail label="Last login" value={formatCompactDate(preview.lastLoginAt)} /><Detail label="Workspaces" value={String(preview.memberships.length)} /></div><h6 className="mb-3">Memberships</h6><div className="list-group mb-6">{preview.memberships.map((membership) => <Link href={`/admin/orgs/${membership.orgId}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" key={`${membership.orgId}:${membership.role}`}><span><strong className="d-block">{membership.orgName}</strong><small className="text-body-secondary">Joined {formatCompactDate(membership.joinedAt)}</small></span><span className="badge bg-label-primary text-capitalize">{membership.role}</span></Link>)}</div><div className="text-center"><button type="button" className="btn btn-label-secondary" onClick={() => setPreview(null)}>Close</button></div></StaffDialog>}
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="col-12 col-sm-4"><small className="text-body-secondary d-block mb-1">{label}</small><span className="text-heading fw-medium">{value}</span></div>;
}

export function CustomerHealthView({ rows, now }: { rows: OperationsOrgRow[]; now: number }) {
  const enriched = useMemo(() => rows.map((row) => ({ row, health: getCustomerHealth(row, now), seats: getSeatFacts(row) })).sort((a, b) => a.health.score - b.health.score), [now, rows]);
  const counts = enriched.reduce((result, item) => { result[item.health.band] += 1; return result; }, { healthy: 0, watch: 0, risk: 0 });
  const average = enriched.length ? Math.round(enriched.reduce((sum, item) => sum + item.health.score, 0) / enriched.length) : 0;
  const inactive = enriched.filter((item) => item.health.inactiveDays === null || item.health.inactiveDays >= 14).length;
  const interventions = enriched.filter((item) => item.health.band === 'risk').length;

  return <>
    <OperationsKpiStrip>
      <OperationsKpi label="Average health" value={`${average}/100`} support="Operational heuristic" icon="tabler-heart-rate-monitor" tone="primary" />
      <OperationsKpi label="Healthy" value={String(counts.healthy)} support="Score 80 and above" icon="tabler-heart-check" tone="success" />
      <OperationsKpi label="Watch" value={String(counts.watch)} support="Score 55–79" icon="tabler-eye" tone="warning" />
      <OperationsKpi label="Intervention" value={String(interventions)} support={`${inactive} inactive signals`} icon="tabler-alert-triangle" tone="danger" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Portfolio health" support="Distribution of the current operational signal." /><DonutChart labels={['Healthy', 'Watch', 'Risk']} series={[counts.healthy, counts.watch, counts.risk]} colors={['#28c76f', '#ff9f43', '#ff4c51']} centerLabel="Customers" height={270} /></div></div></div>
      <div className="col-lg-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title="Intervention queue" support="Lowest score first; each signal remains explainable." /><div className="row g-4">{enriched.slice(0, 6).map(({ row, health, seats }) => <div className="col-md-6" key={row.id}><Link href={`/admin/orgs/${row.id}`} className={`d-block rounded bg-label-${health.tone} p-4 text-reset h-100`}><div className="d-flex align-items-start gap-3"><InitialAvatar label={row.name} tone={health.tone} /><span className="flex-grow-1 min-w-0"><span className="fw-semibold text-heading d-block text-truncate">{row.name}</span><small className="text-body-secondary">{row.activeSeats}/{row.entitledSeats} seats · {row.memberCount} members</small></span><strong className={`text-${health.tone}`}>{health.score}</strong></div><div className="progress my-3" style={{ height: '.45rem' }}><div className={`progress-bar bg-${health.tone}`} style={{ width: `${health.score}%` }} /></div><div className="d-flex flex-wrap gap-2">{health.signals.slice(0, 2).map((signal) => <span className={`badge bg-label-${health.tone}`} key={signal}>{signal}</span>)}{health.signals.length === 0 && <span className="badge bg-label-success">No active risks</span>}{seats.utilization >= 90 && !seats.over && <span className="badge bg-label-warning">Capacity {seats.utilization}%</span>}</div></Link></div>)}</div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title="Signal matrix" support="Customers grouped by explainable operational conditions, not an opaque predictive model." /><div className="row g-3">{[['Past due', enriched.filter((item) => item.row.entitlementState === 'past_due').length, 'danger'], ['Seat exception', enriched.filter((item) => item.seats.over).length, 'warning'], ['No activity', enriched.filter((item) => item.health.inactiveDays === null).length, 'secondary'], ['14d inactive', enriched.filter((item) => (item.health.inactiveDays ?? 0) >= 14).length, 'info'], ['No active seats', enriched.filter((item) => item.row.activeSeats === 0).length, 'primary'], ['Trial expired', enriched.filter((item) => item.health.signals.includes('Trial expired')).length, 'danger']].map(([label, value, tone]) => <div className="col-6 col-lg-2" key={String(label)}><div className={`rounded bg-label-${tone} p-4 h-100`}><h4 className={`text-${tone} mb-1`}>{value}</h4><small className="text-heading fw-medium">{label}</small></div></div>)}</div></div></div>
    <SourceNotice title="Explainable heuristic" body="Health uses entitlement state, seat exceptions, member presence and recorded activity. It is an operational triage signal, not a contractual score or predictive churn model." tone="info" icon="tabler-info-circle" />
  </>;
}

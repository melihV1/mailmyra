'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DonutChart } from '../../(app)/charts/DonutChart';
import { getCustomerHealth, getSeatFacts, type CustomerUserRow, type OperationsOrgRow } from '../operations-model';
import { formatCompactDate, InitialAvatar, OperationsKpi, OperationsKpiStrip, OperationsSectionHeader, SourceNotice } from './OperationsShared';
import { StaffDialog } from './StaffDialog';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCustomers } from '../../../lib/i18n/dict/admin-customers';
import { common } from '../../../lib/i18n/dict/common';

/**
 * `getCustomerHealth`in ürettiği `signals` dizisi (operations-model.ts)
 * hâlâ İngilizce ham metin — o dosya bu görevin DIŞI (AdminQueue'nun
 * `queue-model.ts` EMPTY_TEXT'i için bıraktığı emsalin aynısı: model
 * çıktısı, ayrı bir süpürme kapsamı). Aşağıdaki matris SADECE görüntü
 * etiketini çevirir; `.includes('Trial expired')` karşılaştırması model
 * çıktısıyla birebir eşleşmek zorunda olduğu için İngilizce kalır —
 * bkz. Task 5 raporu.
 */
interface EnrichedOrgRow {
  row: OperationsOrgRow;
  health: ReturnType<typeof getCustomerHealth>;
  seats: ReturnType<typeof getSeatFacts>;
}

const HEALTH_SIGNAL_MATRIX: ReadonlyArray<{ key: 'pastDue' | 'seatException' | 'noActivity' | 'inactive14d' | 'noActiveSeats' | 'trialExpired'; filter: (item: EnrichedOrgRow) => boolean; tone: string }> = [
  { key: 'pastDue', filter: (item) => item.row.entitlementState === 'past_due', tone: 'danger' },
  { key: 'seatException', filter: (item) => item.seats.over, tone: 'warning' },
  { key: 'noActivity', filter: (item) => item.health.inactiveDays === null, tone: 'secondary' },
  { key: 'inactive14d', filter: (item) => (item.health.inactiveDays ?? 0) >= 14, tone: 'info' },
  { key: 'noActiveSeats', filter: (item) => item.row.activeSeats === 0, tone: 'primary' },
  { key: 'trialExpired', filter: (item) => item.health.signals.includes('Trial expired'), tone: 'danger' },
];

export function CustomerUsersView({ rows }: { rows: CustomerUserRow[] }) {
  const lang = useLang();
  const t = adminCustomers[lang].operations.users;
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
      <OperationsKpi label={t.kpis.customerUsers.label} value={String(rows.length)} support={t.kpis.customerUsers.support} icon="tabler-users" tone="primary" />
      <OperationsKpi label={t.kpis.verified.label} value={String(verified)} support={t.kpis.verified.support(rows.length ? Math.round((verified / rows.length) * 100) : 0)} icon="tabler-user-check" tone="success" />
      <OperationsKpi label={t.kpis.seenLogin.label} value={String(active)} support={t.kpis.seenLogin.support} icon="tabler-login" tone="info" />
      <OperationsKpi label={t.kpis.multiWorkspace.label} value={String(multiOrg)} support={t.kpis.multiWorkspace.support} icon="tabler-building-community" tone="warning" last />
    </OperationsKpiStrip>
    <div className="card">
      <div className="card-body border-bottom"><OperationsSectionHeader title={t.directory.title} support={t.directory.support} /><div className="row g-3"><div className="col-lg-8"><div className="input-group"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" type="search" placeholder={t.directory.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><div className="col-lg-4"><select className="form-select" value={role} onChange={(event) => setRole(event.target.value)}><option value="all">{t.directory.roleAll}</option><option value="owner">{t.directory.roles.owner}</option><option value="admin">{t.directory.roles.admin}</option><option value="editor">{t.directory.roles.editor}</option><option value="viewer">{t.directory.roles.viewer}</option></select></div></div></div>
      <div className="table-responsive"><table className="table table-hover align-middle mb-0 mm-operations-table"><thead><tr><th>{t.table.user}</th><th>{t.table.workspace}</th><th>{t.table.role}</th><th>{t.table.verification}</th><th>{t.table.lastLogin}</th><th className="text-end">{t.table.view}</th></tr></thead><tbody>{visible.map((row) => { const primary = row.memberships[0]; return <tr key={row.id}><td><div className="d-flex align-items-center gap-3"><InitialAvatar label={row.email} /><div className="min-w-0"><span className="text-heading fw-medium d-block text-truncate" style={{ maxWidth: '15rem' }}>{row.email}</span><small className="text-body-secondary">{t.joined(formatCompactDate(row.createdAt, lang))}</small></div></div></td><td>{primary ? <Link href={`/admin/orgs/${primary.orgId}`} className="fw-medium text-heading">{primary.orgName}</Link> : <span className="text-body-secondary">{t.noWorkspace}</span>}{row.memberships.length > 1 && <span className="badge bg-label-info ms-2">+{row.memberships.length - 1}</span>}</td><td><span className="badge bg-label-primary text-capitalize">{primary?.role ?? 'none'}</span></td><td><span className={`badge bg-label-${row.emailVerifiedAt ? 'success' : 'warning'}`}>{row.emailVerifiedAt ? t.state.verified : t.state.pending}</span></td><td><span className="text-heading">{formatCompactDate(row.lastLoginAt, lang)}</span></td><td className="text-end"><button type="button" className="btn btn-sm btn-icon btn-label-primary" title={t.previewButton} aria-label={t.previewAria(row.email)} onClick={() => setPreview(row)}><i className="icon-base ti tabler-eye" /></button></td></tr>; })}</tbody></table></div>
      {visible.length === 0 && <div className="card-body"><SourceNotice title={t.empty.title} body={t.empty.body} tone="warning" icon="tabler-user-search" /></div>}
    </div>
    {preview && <StaffDialog title={t.preview.title} subtitle={t.preview.subtitle} labelledBy={t.preview.labelledBy(preview.email)} busy={false} onClose={() => setPreview(null)} wide><div className="d-flex align-items-center gap-4 mb-6"><span className="avatar avatar-xl"><span className="avatar-initial rounded-circle bg-label-primary text-primary">{preview.email.slice(0, 2).toUpperCase()}</span></span><div><h5 className="mb-1">{preview.email}</h5><span className={`badge bg-label-${preview.emailVerifiedAt ? 'success' : 'warning'}`}>{preview.emailVerifiedAt ? t.preview.emailVerified : t.preview.verificationPending}</span></div></div><div className="row g-4 mb-6"><Detail label={t.preview.accountCreated} value={formatCompactDate(preview.createdAt, lang)} /><Detail label={t.preview.lastLogin} value={formatCompactDate(preview.lastLoginAt, lang)} /><Detail label={t.preview.workspaces} value={String(preview.memberships.length)} /></div><h6 className="mb-3">{t.preview.memberships}</h6><div className="list-group mb-6">{preview.memberships.map((membership) => <Link href={`/admin/orgs/${membership.orgId}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" key={`${membership.orgId}:${membership.role}`}><span><strong className="d-block">{membership.orgName}</strong><small className="text-body-secondary">{t.joined(formatCompactDate(membership.joinedAt, lang))}</small></span><span className="badge bg-label-primary text-capitalize">{membership.role}</span></Link>)}</div><div className="text-center"><button type="button" className="btn btn-label-secondary" onClick={() => setPreview(null)}>{common[lang].close}</button></div></StaffDialog>}
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="col-12 col-sm-4"><small className="text-body-secondary d-block mb-1">{label}</small><span className="text-heading fw-medium">{value}</span></div>;
}

export function CustomerHealthView({ rows, now }: { rows: OperationsOrgRow[]; now: number }) {
  const lang = useLang();
  const t = adminCustomers[lang].operations.health;
  const enriched = useMemo(() => rows.map((row) => ({ row, health: getCustomerHealth(row, now), seats: getSeatFacts(row) })).sort((a, b) => a.health.score - b.health.score), [now, rows]);
  const counts = enriched.reduce((result, item) => { result[item.health.band] += 1; return result; }, { healthy: 0, watch: 0, risk: 0 });
  const average = enriched.length ? Math.round(enriched.reduce((sum, item) => sum + item.health.score, 0) / enriched.length) : 0;
  const inactive = enriched.filter((item) => item.health.inactiveDays === null || item.health.inactiveDays >= 14).length;
  const interventions = enriched.filter((item) => item.health.band === 'risk').length;

  return <>
    <OperationsKpiStrip>
      <OperationsKpi label={t.kpis.averageHealth.label} value={`${average}/100`} support={t.kpis.averageHealth.support} icon="tabler-heart-rate-monitor" tone="primary" />
      <OperationsKpi label={t.kpis.healthy.label} value={String(counts.healthy)} support={t.kpis.healthy.support} icon="tabler-heart-check" tone="success" />
      <OperationsKpi label={t.kpis.watch.label} value={String(counts.watch)} support={t.kpis.watch.support} icon="tabler-eye" tone="warning" />
      <OperationsKpi label={t.kpis.intervention.label} value={String(interventions)} support={t.kpis.intervention.support(inactive)} icon="tabler-alert-triangle" tone="danger" last />
    </OperationsKpiStrip>
    <div className="row g-6 mb-6">
      <div className="col-lg-4"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.portfolio.title} support={t.portfolio.support} /><DonutChart labels={t.donutLabels as string[]} series={[counts.healthy, counts.watch, counts.risk]} colors={['#28c76f', '#ff9f43', '#ff4c51']} centerLabel={t.donutCenter} height={270} /></div></div></div>
      <div className="col-lg-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.interventionQueue.title} support={t.interventionQueue.support} /><div className="row g-4">{enriched.slice(0, 6).map(({ row, health, seats }) => <div className="col-md-6" key={row.id}><Link href={`/admin/orgs/${row.id}`} className={`d-block rounded bg-label-${health.tone} p-4 text-reset h-100`}><div className="d-flex align-items-start gap-3"><InitialAvatar label={row.name} tone={health.tone} /><span className="flex-grow-1 min-w-0"><span className="fw-semibold text-heading d-block text-truncate">{row.name}</span><small className="text-body-secondary">{t.interventionQueue.seatsAndMembers(row.activeSeats, row.entitledSeats, row.memberCount)}</small></span><strong className={`text-${health.tone}`}>{health.score}</strong></div><div className="progress my-3" style={{ height: '.45rem' }}><div className={`progress-bar bg-${health.tone}`} style={{ width: `${health.score}%` }} /></div><div className="d-flex flex-wrap gap-2">{health.signals.slice(0, 2).map((signal) => <span className={`badge bg-label-${health.tone}`} key={signal}>{signal}</span>)}{health.signals.length === 0 && <span className="badge bg-label-success">{t.noActiveRisks}</span>}{seats.utilization >= 90 && !seats.over && <span className="badge bg-label-warning">{t.capacityPct(seats.utilization)}</span>}</div></Link></div>)}</div></div></div></div>
    </div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.signalMatrix.title} support={t.signalMatrix.support} /><div className="row g-3">{HEALTH_SIGNAL_MATRIX.map((entry) => <div className="col-6 col-lg-2" key={entry.key}><div className={`rounded bg-label-${entry.tone} p-4 h-100`}><h4 className={`text-${entry.tone} mb-1`}>{enriched.filter(entry.filter).length}</h4><small className="text-heading fw-medium">{t.signalMatrix[entry.key]}</small></div></div>)}</div></div></div>
    <SourceNotice title={t.explainable.title} body={t.explainable.body} tone="info" icon="tabler-info-circle" />
  </>;
}

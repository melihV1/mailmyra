import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import { listAdminQueues, listOrganizations, NotStaffError } from '../../../lib/repo/admin';
import { fmtDate, fmtMoney, STATE_BADGE } from '../format';

export const metadata = { title: 'Command center — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Komuta merkezi: dört sayı + dört iş kuyruğu + müşteri tablosu.
 * Süs grafiği yok — her kutu ya bir cevap ya bir eylem listesi.
 *
 * Layout korumasına güvenilmiyor (senders/page.tsx dersi): oturum burada da
 * doğrulanır; asıl kapı zaten repo fonksiyonlarının `requireStaff`'ında.
 */
export default async function CommandCenterPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin');

  let orgs, queues;
  try {
    [orgs, queues] = await Promise.all([
      listOrganizations(session.user.id),
      listAdminQueues(session.user.id),
    ]);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  const activeSeats = orgs.reduce((sum, o) => sum + o.activeSeats, 0);
  const entitledSeats = orgs.reduce((sum, o) => sum + o.entitledSeats, 0);
  const overdueTotal = queues.overdueInvoices.reduce((sum, i) => sum + i.amountCents, 0);

  const KPIS = [
    { label: 'Customers', value: String(orgs.length), icon: 'tabler-building', tone: 'primary' },
    {
      // "Revenue" DEMİYORUZ: koltuk × $1 liste fiyatı tabanıdır, tahsilat
      // değil (brief §5.1 uyarısı haklıydı).
      label: 'Active seats · list-price base',
      value: `${activeSeats} / ${entitledSeats} seats`,
      icon: 'tabler-users',
      tone: 'success',
    },
    {
      label: 'Trials ending in 7 days',
      value: String(queues.trialsEnding.length),
      icon: 'tabler-hourglass',
      tone: 'warning',
    },
    {
      label: 'Overdue invoices',
      value: queues.overdueInvoices.length
        ? `${queues.overdueInvoices.length} · ${fmtMoney(overdueTotal, 'USD')}`
        : '0',
      icon: 'tabler-alert-triangle',
      tone: 'danger',
    },
  ];

  const QUEUES: Array<{
    title: string;
    icon: string;
    rows: Array<{ key: string; href: string; main: string; side: string }>;
    empty: string;
  }> = [
    {
      title: 'Trials ending soon',
      icon: 'tabler-hourglass',
      rows: queues.trialsEnding.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: `ends ${fmtDate(o.trialEndsAt)}`,
      })),
      empty: 'No trials end in the next 7 days.',
    },
    {
      title: 'Over entitlement',
      icon: 'tabler-users-minus',
      rows: queues.overEntitlement.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: `${o.activeSeats}/${o.entitledSeats} seats`,
      })),
      empty: 'Nobody exceeds their seats.',
    },
    {
      title: 'Expired trial, still marked trial',
      icon: 'tabler-clock-exclamation',
      rows: queues.expiredTrials.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: `expired ${fmtDate(o.trialEndsAt)}`,
      })),
      empty: 'No stale trials.',
    },
    {
      title: 'Overdue invoices',
      icon: 'tabler-file-alert',
      rows: queues.overdueInvoices.map((i) => ({
        key: i.id,
        href: `/admin/orgs/${i.orgId}`,
        main: `${i.number} · ${i.orgName}`,
        side: `${i.overdueDays}d · ${fmtMoney(i.amountCents, i.currency)}`,
      })),
      empty: 'Nothing overdue.',
    },
  ];

  return (
    <div className="mm-admin">
      <h4 className="mb-1">Command center</h4>
      <p className="text-body-secondary mb-4">What needs attention today.</p>

      <div className="row g-4 mb-4">
        {KPIS.map((k) => (
          <div className="col-sm-6 col-xl-3" key={k.label}>
            <div className="card h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <span className={`badge bg-label-${k.tone} rounded p-2`}>
                  <i className={`icon-base ti ${k.icon} icon-md`} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-body-secondary small">{k.label}</div>
                  <h5 className="mb-0">{k.value}</h5>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {QUEUES.map((queue) => (
          <div className="col-md-6" key={queue.title}>
            <div className="card h-100">
              <div className="card-header d-flex align-items-center gap-2 pb-2">
                <i className={`icon-base ti ${queue.icon}`} aria-hidden="true" />
                <h6 className="mb-0">{queue.title}</h6>
                <span className="badge bg-label-secondary ms-auto">{queue.rows.length}</span>
              </div>
              <div className="list-group list-group-flush">
                {queue.rows.length === 0 && (
                  <div className="list-group-item text-body-secondary small">{queue.empty}</div>
                )}
                {queue.rows.slice(0, 6).map((row) => (
                  <Link
                    key={row.key}
                    href={row.href}
                    className="list-group-item list-group-item-action d-flex justify-content-between"
                  >
                    <span>{row.main}</span>
                    <span className="text-body-secondary small">{row.side}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Customers</h5>
          <p className="text-body-secondary small mb-0">
            Root billing organizations — agency child workspaces live inside their root.
          </p>
        </div>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Organization</th>
                <th>State</th>
                <th>Seats</th>
                <th>Trial ends</th>
                <th>Members</th>
                <th>Children</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-body-secondary">
                    No customers yet. The first one shows up here the moment they register.
                  </td>
                </tr>
              )}
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orgs/${o.id}`} className="fw-medium">
                      {o.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${STATE_BADGE[o.entitlementState] ?? 'bg-label-secondary'}`}>
                      {o.entitlementState}
                    </span>
                  </td>
                  <td className={o.activeSeats > o.entitledSeats ? 'text-danger fw-medium' : ''}>
                    {o.activeSeats}/{o.entitledSeats}
                  </td>
                  <td>{fmtDate(o.trialEndsAt)}</td>
                  <td>{o.memberCount}</td>
                  <td>{o.childCount || '—'}</td>
                  <td>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

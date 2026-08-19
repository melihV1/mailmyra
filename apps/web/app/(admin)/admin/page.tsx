import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import { listAdminQueues, listOrganizations, NotStaffError } from '../../../lib/repo/admin';
import { fmtDate, fmtMoney, STATE_BADGE } from '../format';

export const metadata = { title: 'Command center — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Komuta merkezi. Görsel dil müşteri panelinin ONAYLI senders sayfasından
 * (karar 2026-08-13): stat kartları `avatar-initial` rozetiyle, listeler
 * kart içinde `table table-hover` (2026-08-16 dersi: list-group DEĞİL,
 * temadaki tablolar). Süs grafiği yok — her kutu ya cevap ya eylem listesi.
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
  const pct = entitledSeats > 0 ? Math.min(100, (activeSeats / entitledSeats) * 100) : 0;

  const stats = [
    {
      label: 'Customers',
      value: String(orgs.length),
      note: 'Root billing organizations',
      icon: 'tabler-building',
      tone: 'primary',
    },
    {
      label: 'Trials ending',
      value: String(queues.trialsEnding.length),
      note: 'Within the next 7 days',
      icon: 'tabler-hourglass',
      tone: 'warning',
    },
    {
      label: 'Overdue',
      value: queues.overdueInvoices.length ? fmtMoney(overdueTotal, 'USD') : '0',
      note: `${queues.overdueInvoices.length} invoice${queues.overdueInvoices.length === 1 ? '' : 's'} past due`,
      icon: 'tabler-alert-triangle',
      tone: 'danger',
    },
  ] as const;

  const QUEUES: Array<{
    title: string;
    icon: string;
    columns: [string, string];
    rows: Array<{ key: string; href: string; main: string; side: string }>;
    empty: string;
  }> = [
    {
      title: 'Trials ending soon',
      icon: 'tabler-hourglass',
      columns: ['Customer', 'Ends'],
      rows: queues.trialsEnding.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: fmtDate(o.trialEndsAt),
      })),
      empty: 'No trials end in the next 7 days.',
    },
    {
      title: 'Over entitlement',
      icon: 'tabler-users-minus',
      columns: ['Customer', 'Seats'],
      rows: queues.overEntitlement.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: `${o.activeSeats}/${o.entitledSeats}`,
      })),
      empty: 'Nobody exceeds their seats.',
    },
    {
      title: 'Expired trial, still marked trial',
      icon: 'tabler-clock-exclamation',
      columns: ['Customer', 'Expired'],
      rows: queues.expiredTrials.map((o) => ({
        key: o.id,
        href: `/admin/orgs/${o.id}`,
        main: o.name,
        side: fmtDate(o.trialEndsAt),
      })),
      empty: 'No stale trials.',
    },
    {
      title: 'Overdue invoices',
      icon: 'tabler-file-alert',
      columns: ['Invoice', 'Overdue'],
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
    <section>
      <h4 className="mb-4">Command center</h4>

      <div className="row g-4 mb-4">
        {/* Koltuk kartı — senders sayfasındaki sayaç + ilerleme çubuğu kalıbı */}
        <div className="col-sm-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-heading mb-1">Active seats</p>
                  <h4 className="mb-2" role="status">
                    {activeSeats} <span className="text-body-secondary">/ {entitledSeats}</span>
                  </h4>
                </div>
                <span className="avatar">
                  <span className="avatar-initial rounded bg-label-success">
                    <i className="icon-base ti tabler-users icon-md" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <div className="progress" style={{ height: 6 }} aria-hidden="true">
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
              {/* "Revenue" DEMİYORUZ: koltuk × $1 liste fiyatı tabanı, tahsilat değil. */}
              <small className="text-body-secondary d-block mt-2">
                List-price base: {fmtMoney(activeSeats * 100, 'USD')}/yr
              </small>
            </div>
          </div>
        </div>

        {stats.map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-heading mb-1">{s.label}</p>
                    <h4 className="mb-1">{s.value}</h4>
                    <small className="text-body-secondary">{s.note}</small>
                  </div>
                  <span className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.tone}`}>
                      <i className={`icon-base ti ${s.icon} icon-md`} aria-hidden="true" />
                    </span>
                  </span>
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
              <div className="card-header d-flex align-items-center gap-2">
                <span className="avatar avatar-sm">
                  <span className="avatar-initial rounded bg-label-secondary">
                    <i className={`icon-base ti ${queue.icon} icon-sm`} aria-hidden="true" />
                  </span>
                </span>
                <h5 className="card-title mb-0">{queue.title}</h5>
                <span className="badge bg-label-secondary rounded-pill ms-auto">
                  {queue.rows.length}
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{queue.columns[0]}</th>
                      <th className="text-end">{queue.columns[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.rows.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-body-secondary small">
                          {queue.empty}
                        </td>
                      </tr>
                    )}
                    {queue.rows.slice(0, 6).map((row) => (
                      <tr key={row.key}>
                        <td>
                          <Link href={row.href}>{row.main}</Link>
                        </td>
                        <td className="text-end text-body-secondary small">{row.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h5 className="card-title mb-0">Customers</h5>
            <p className="card-subtitle text-body-secondary mt-1 mb-0">
              Root billing organizations — agency workspaces live inside their root.
            </p>
          </div>
        </div>
        <div className="table-responsive text-nowrap">
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
                    No customers yet — the first registration shows up here.
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
                    <span
                      className={`badge ${STATE_BADGE[o.entitlementState] ?? 'bg-label-secondary'}`}
                    >
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
    </section>
  );
}

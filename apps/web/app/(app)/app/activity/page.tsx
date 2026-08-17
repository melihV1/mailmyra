import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listActivityAs } from '../../../../lib/repo/activity';
import { ACTIVITY_FILTERS, ACTIVITY_LOOKS } from '../../activity-looks';
import { timeAgo } from '../../notification-looks';

export const metadata = { title: 'Activity — Mailmyra' };

/**
 * Denetim günlüğü (2026-08-15, dış denetim P2). Bildirim listesinden farkı:
 * bu ORG'un kaydı, kişinin değil — herkesin eylemi görünür, tercihle
 * susturulamaz ve okundu/okunmadı durumu yoktur.
 *
 * Filtre sunucu tarafında (`?type=`): günlük büyüdükçe istemciye 100 satır
 * gönderip orada elemek anlamsız — sorgu zaten indeksli.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/activity');

  const { type } = await searchParams;
  const active = ACTIVITY_FILTERS.some((f) => f.value === type) ? (type ?? '') : '';
  const rows = await listActivityAs(session.user.id, active ? { type: active } : undefined);

  if (rows === null) {
    return (
      <section>
        <h4 className="mb-4">Activity</h4>
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-secondary">
                <i className="icon-base ti tabler-lock icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>Owners and admins only</h5>
            <p className="text-body-secondary mb-0">
              The activity log shows who changed what across the workspace.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h4 className="mb-1">Activity</h4>
        <p className="text-body-secondary mb-0">
          Who changed what in this workspace. Kept for the record — it cannot be edited or
          silenced.
        </p>
      </div>

      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="card-title mb-0">
            Recent events <span className="badge bg-label-primary ms-1">{rows.length}</span>
          </h5>
          {/* Filtre link'lerle: sunucu bileşeni, JS'siz de çalışır. */}
          <div className="d-flex flex-wrap gap-2">
            {ACTIVITY_FILTERS.map((f) => (
              <Link
                key={f.value || 'all'}
                href={f.value ? `/app/activity?type=${f.value}` : '/app/activity'}
                className={`btn btn-sm ${
                  active === f.value ? 'btn-primary' : 'btn-label-secondary'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card-body text-center py-5 text-body-secondary">
            <i className="icon-base ti tabler-history icon-26px d-block mx-auto mb-2" />
            {active
              ? 'No events of this kind yet.'
              : 'Nothing recorded yet — publishes, exports and member changes will show up here.'}
          </div>
        ) : (
          <div className="table-responsive text-nowrap">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Details</th>
                  <th>Who</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {rows.map((row) => {
                  const look = ACTIVITY_LOOKS[row.type];
                  // Bilinmeyen tip (eski kayıt / ileri sürüm): satırı düşürmek
                  // yerine ham tipi göster — günlükte boşluk olmaz.
                  if (!look) {
                    return (
                      <tr key={row.id}>
                        <td className="text-heading">{row.type}</td>
                        <td className="text-body-secondary">—</td>
                        <td>{row.actorEmail ?? '—'}</td>
                        <td>{timeAgo(row.createdAt)}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="d-flex align-items-center gap-2">
                          <span className="avatar avatar-sm flex-shrink-0">
                            <span
                              className={`avatar-initial rounded-circle bg-label-${look.tone}`}
                            >
                              <i
                                className={`icon-base ti ${look.icon} icon-18px`}
                                aria-hidden="true"
                              />
                            </span>
                          </span>
                          <span className="fw-medium text-heading">{look.title}</span>
                        </span>
                      </td>
                      <td className="text-body-secondary text-wrap">{look.body(row.payload)}</td>
                      <td>{row.actorEmail ?? <span className="text-body-secondary">—</span>}</td>
                      <td>
                        <time
                          dateTime={row.createdAt.toISOString()}
                          title={row.createdAt.toLocaleString('en-GB')}
                        >
                          {timeAgo(row.createdAt)}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

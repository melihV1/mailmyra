import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listNotifications } from '../../../../../lib/repo/notifications';
import { NOTIFICATION_LOOKS, timeAgo } from '../../../notification-looks';
import { AccountTabs } from '../AccountTabs';

export const metadata = { title: 'Notifications — Mailmyra' };

/**
 * Notifications sekmesi: zilin uzun listesi + hangi olayların bildirim
 * ürettiğinin dökümü. Tercih anahtarları (kapat/aç) BİLEREK yok — üç olay
 * tipiyle tercih matrisi kurmak erken; olay çeşidi artınca gelir.
 */
export default async function NotificationsPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/notifications');

  const notifications = await listNotifications(session.user.id);

  return (
    <section>
      <AccountTabs />

      <div className="row g-4">
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header pb-2">
              <h5 className="card-title mb-0">Recent notifications</h5>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <p className="text-body-secondary mb-0">
                  Nothing yet — publishes, invitations and seat warnings will show up here.
                </p>
              ) : (
                <ul className="list-unstyled mb-0 d-grid gap-3">
                  {notifications.map((n) => {
                    const look = NOTIFICATION_LOOKS[n.type];
                    return (
                      <li key={n.id} className="d-flex align-items-start">
                        <div className="avatar avatar-sm flex-shrink-0 me-3">
                          <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                            <i
                              className={`icon-base ti ${look.icon} icon-18px`}
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                        <div className="flex-grow-1">
                          <span className="d-block fw-medium text-heading">{look.title}</span>
                          <small className="text-body-secondary d-block">
                            {look.body(n.payload)}
                          </small>
                        </div>
                        <small className="text-body-secondary flex-shrink-0 ms-2">
                          {timeAgo(n.createdAt)}
                        </small>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card h-100">
            <div className="card-header pb-2">
              <h5 className="card-title mb-0">What creates a notification?</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled d-grid gap-3 mb-4">
                {Object.values(NOTIFICATION_LOOKS).map((look) => (
                  <li key={look.title} className="d-flex align-items-center">
                    <div className="avatar avatar-sm flex-shrink-0 me-3">
                      <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                        <i className={`icon-base ti ${look.icon} icon-18px`} aria-hidden="true" />
                      </span>
                    </div>
                    <span className="text-heading">{look.title}</span>
                  </li>
                ))}
              </ul>
              <p className="text-body-secondary small mb-0">
                Notifications go to workspace owners and admins. Seat warnings are also sent by
                e-mail to owners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

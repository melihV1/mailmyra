import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { account as accountDict } from '../../../../../lib/i18n/dict/account';
import { getLang } from '../../../../../lib/i18n/lang.server';
import {
  EMAIL_CAPABLE_TYPES,
  TRANSACTIONAL_EMAIL_TYPES,
  getPreferences,
} from '../../../../../lib/repo/notification-prefs';
import { listNotifications } from '../../../../../lib/repo/notifications';
import { NOTIFICATION_LOOKS, timeAgo } from '../../../notification-looks';
import { AccountTabs } from '../AccountTabs';
import { PreferencesForm } from './PreferencesForm';

export async function generateMetadata() {
  return { title: accountDict[await getLang()].pageTitles.notifications };
}

/**
 * Notifications sekmesi: tercih tablosu (2026-08-15, dış denetim bulgusu —
 * sayfa yalnız geçmişi açıklıyordu) + zilin uzun listesi + hangi olayların
 * bildirim ürettiğinin dökümü. Bildirim İÇERİĞİ (NOTIFICATION_LOOKS,
 * timeAgo) dil-farkında — Task 6.
 */
export default async function NotificationsPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/notifications');
  const lang = await getLang();
  const t = accountDict[lang];

  const [notifications, preferences] = await Promise.all([
    listNotifications(session.user.id),
    getPreferences(session.user.id),
  ]);

  return (
    <section>
      <AccountTabs />

      <div className="card mb-4">
        <div className="card-header pb-2">
          <div className="card-title mb-0">
            <h5 className="mb-1">{t.notifications.preferencesTitle}</h5>
            <p className="card-subtitle mb-0">{t.notifications.preferencesSubtitle}</p>
          </div>
        </div>
        <PreferencesForm
          initial={preferences}
          emailCapable={EMAIL_CAPABLE_TYPES}
          transactionalEmail={TRANSACTIONAL_EMAIL_TYPES}
        />
      </div>

      <div className="row g-4">
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header pb-2 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">{t.notifications.recentTitle}</h5>
              {/* Tam kutu ayrı sayfada: okundu/silme orada (2026-08-15). */}
              <Link href="/app/notifications" className="btn btn-sm btn-label-primary">
                {t.notifications.viewAll}
              </Link>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <p className="text-body-secondary mb-0">{t.activityEmpty}</p>
              ) : (
                <ul className="list-unstyled mb-0 d-grid gap-3">
                  {notifications.map((n) => {
                    const look = NOTIFICATION_LOOKS[lang][n.type];
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
                          {timeAgo(lang, n.createdAt)}
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
              <h5 className="card-title mb-0">{t.notifications.whatCreatesTitle}</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled d-grid gap-3 mb-4">
                {Object.values(NOTIFICATION_LOOKS[lang]).map((look) => (
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
              <p className="text-body-secondary small mb-0">{t.notifications.whatCreatesNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

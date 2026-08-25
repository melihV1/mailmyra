import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { notifications as notificationsDict } from '../../../../lib/i18n/dict/notifications';
import { getLang } from '../../../../lib/i18n/lang.server';
import { listInbox, unreadCount } from '../../../../lib/repo/notifications';
import { InboxClient } from './InboxClient';

export async function generateMetadata() {
  return { title: notificationsDict[await getLang()].pageTitle };
}

/**
 * Bildirim kutusu — zilin "View all notifications" hedefi (2026-08-15).
 * Kişiseldir: yalnız oturumdaki kullanıcının satırları, okundu/silme
 * hakkıyla. Org'un denetim izi ayrı ve silinemez (`/app/activity`).
 */
export default async function NotificationsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/notifications');
  const lang = await getLang();
  const t = notificationsDict[lang].page;

  const { filter } = await searchParams;
  const unreadOnly = filter === 'unread';

  const [rows, unreadTotal, readTotal] = await Promise.all([
    listInbox(session.user.id, { unreadOnly }),
    unreadCount(session.user.id),
    prisma.notification.count({ where: { userId: session.user.id, readAt: { not: null } } }),
  ]);

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h4 className="mb-1">{t.heading}</h4>
          <p className="text-body-secondary mb-0">
            {t.subtitleLead}
            <Link href="/app/account/notifications">{t.prefsLink}</Link>.
          </p>
        </div>
      </div>

      <InboxClient
        // Sunucu Date'leri istemciye string olarak geçer — bileşen zaten
        // string bekliyor (zil ile aynı sözleşme).
        rows={rows.map((r) => ({
          ...r,
          readAt: r.readAt ? r.readAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        }))}
        unreadOnly={unreadOnly}
        unreadTotal={unreadTotal}
        readTotal={readTotal}
      />
    </section>
  );
}

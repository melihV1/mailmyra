import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { listInbox, unreadCount } from '../../../../lib/repo/notifications';
import { InboxClient } from './InboxClient';

export const metadata = { title: 'Notifications — Mailmyra' };

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
          <h4 className="mb-1">Notifications</h4>
          <p className="text-body-secondary mb-0">
            Everything sent to you. Choose what reaches you in{' '}
            <Link href="/app/account/notifications">notification preferences</Link>.
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

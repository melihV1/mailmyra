import { currentSession } from '../../../lib/auth/current';
import { listNotifications, unreadCount } from '../../../lib/repo/notifications';
import { json } from '../auth/_shared';

/** Zil menüsünün beslemesi: son bildirimler + okunmamış sayısı. */
export async function GET(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const [items, unread] = await Promise.all([
    listNotifications(session.user.id),
    unreadCount(session.user.id),
  ]);
  return json(200, { items, unread });
}

import { currentSession } from '../../../../lib/auth/current';
import { markAllRead } from '../../../../lib/repo/notifications';
import { json } from '../../auth/_shared';

/** "Mark all as read" — zil rozetini sıfırlar. */
export async function POST(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  await markAllRead(session.user.id);
  return json(200, { ok: true });
}

import { currentSession } from '../../../../lib/auth/current';
import { removeNotifications, removeReadNotifications } from '../../../../lib/repo/notifications';
import { json, readJsonBody } from '../../auth/_shared';

/**
 * Bildirim siler: `{ ids: [...] }` seçilileri, `{ readOnly: true }` bütün
 * okunmuşları. Silinen yalnız KİŞİSEL bildirimdir — org'un denetim günlüğü
 * (ActivityEvent) buradan etkilenmez.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  if ((body as { readOnly?: unknown }).readOnly === true) {
    const count = await removeReadNotifications(session.user.id);
    return json(200, { ok: true, count });
  }

  const raw = (body as { ids?: unknown }).ids;
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length === 0) return json(400, { error: 'invalid_input' });

  const count = await removeNotifications(session.user.id, ids);
  return json(200, { ok: true, count });
}

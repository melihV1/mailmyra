import { currentSession } from '../../../../lib/auth/current';
import { setRead } from '../../../../lib/repo/notifications';
import { json, readJsonBody } from '../../auth/_shared';

/** Seçili bildirimleri okundu/okunmadı yapar. POST — IIS/WebDAV kuralı. */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const raw = (body as { ids?: unknown }).ids;
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  if (ids.length === 0) return json(400, { error: 'invalid_input' });

  const read = (body as { read?: unknown }).read !== false;
  const count = await setRead(session.user.id, ids, read);
  return json(200, { ok: true, count });
}

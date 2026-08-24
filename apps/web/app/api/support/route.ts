import { currentSession } from '../../../lib/auth/current';
import { openSupportCase } from '../../../lib/repo/support';
import { field, json, readJsonBody } from '../auth/_shared';

/**
 * Müşteri ticket v1 — ince uç (senders emsali): gövdeyi oku, repo'yu
 * çağır, sonucu statüye çevir. Kapı ve doğrulama repo'da. Listeleme için
 * GET yok — sayfa sunucu tarafında repo'dan okur.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await openSupportCase(session.user.id, {
    subject: field(body, 'subject'),
    category: field(body, 'category'),
    message: field(body, 'message'),
  });

  if (!result.ok) {
    return json(result.reason === 'no_org' ? 403 : 400, { error: result.reason });
  }
  return json(200, { ok: true, reference: result.reference });
}

import { currentSession } from '../../../../../lib/auth/current';
import { addCustomerMessage } from '../../../../../lib/repo/support';
import { field, json, readJsonBody } from '../../../auth/_shared';

/**
 * Müşteri ticket v2 mesaj ekleme — ince uç (`api/support/route.ts` emsali):
 * oturum → repo → statü. Vaka listeleme/detay için GET yok, sayfa
 * sunucu tarafında repo'dan okur (spec §7).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const body = await readJsonBody(req);
  const result = await addCustomerMessage(session.user.id, id, field(body, 'body'));

  if (!result.ok) {
    return json(result.reason === 'not_found' ? 404 : 400, { error: result.reason });
  }
  return json(200, { ok: true, id: result.id });
}

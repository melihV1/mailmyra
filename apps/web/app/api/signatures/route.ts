import { currentSession } from '../../../lib/auth/current';
import { prisma } from '../../../lib/db';
import { saveSignature } from '../../../lib/repo/signatures';
import { field, json, readJsonBody } from '../auth/_shared';

/**
 * İmza kaydet (id verilirse güncelle). Faz 1'de kullanıcı tek org'lu —
 * kayıtta açılan "Workspace" — bu yüzden org gövdede sorulmaz, üyelikten
 * bulunur. Çok org'lu kullanıcı (ajans, Faz 4) geldiğinde gövdeye orgId
 * eklenir; depo katmanı zaten org bazlı çalışıyor.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) return json(403, { error: 'no_org' });

  const body = await readJsonBody(req);
  const name = field(body, 'name').trim() || 'Untitled signature';
  const data: unknown = body.data;
  if (!data || typeof data !== 'object') return json(400, { error: 'invalid_data' });

  const id = field(body, 'id') || undefined;
  const result = await saveSignature(session.user.id, {
    id,
    orgId: membership.orgId,
    name,
    data,
  });

  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true, id: result.id });
}

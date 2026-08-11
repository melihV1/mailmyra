import { currentSession } from '../../../../../lib/auth/current';
import { assignSignature } from '../../../../../lib/repo/signatures';
import { json, readJsonBody } from '../../../auth/_shared';

/**
 * Atama POST ile: canlıda IIS'in WebDAV modülü PATCH/DELETE'i uygulamaya
 * ulaşmadan boş 403'le yiyor (2026-08-11'de ölçüldü). Sunucu modül cerrahisi
 * yerine fiil değişti — bkz. docs/deploy-app-subdomain.md.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const body = await readJsonBody(req);
  const raw = (body as { senderIdentityId?: unknown }).senderIdentityId;
  if (raw !== null && typeof raw !== 'string') return json(400, { error: 'invalid_input' });

  const result = await assignSignature(session.user.id, id, raw);
  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true });
}

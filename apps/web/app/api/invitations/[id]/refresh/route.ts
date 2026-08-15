import { currentSession } from '../../../../../lib/auth/current';
import { getMailer } from '../../../../../lib/mail';
import { refreshInvitation } from '../../../../../lib/repo/members';
import { field, json, readJsonBody } from '../../../auth/_shared';

/**
 * Bekleyen davete taze link: `delivery:'email'` maili yeniden yollar,
 * `'link'` yalnız URL döner (panoya kopyalanır). İkisi de eski linki
 * öldürür. POST — IIS/WebDAV kuralı.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const delivery = field(body, 'delivery');
  if (delivery !== 'email' && delivery !== 'link') return json(400, { error: 'invalid_input' });

  const { id } = await params;
  const result = await refreshInvitation(session.user.id, id, delivery === 'email', getMailer());

  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  // Link modunda URL döner; mail modunda da dönmesi zararsız (çağıran yönetici).
  return json(200, { ok: true, actionUrl: result.actionUrl });
}

import { getSignaturePreview } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/**
 * Tıkla-aç imza önizlemesi. Erişim kaydı repo'da İÇERİKTEN önce atılır;
 * yazılamazsa bu uç hata döner, HTML hiç üretilmez (kapalıya düşme).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;

  try {
    const result = await getSignaturePreview(auth.userId, id, staffCtx(req));
    if (!result.ok) {
      return json(result.reason === 'not_found' ? 404 : 500, { error: result.reason });
    }
    return json(200, { ok: true, html: result.html, name: result.name, orgName: result.orgName });
  } catch (err) {
    return adminError(err);
  }
}

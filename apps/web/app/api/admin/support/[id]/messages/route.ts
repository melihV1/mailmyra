import { listSupportMessages } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/**
 * Vakanın gerçek yazışma ipliği (spec §7 personel) — bölme tembel yükleme
 * için ayrı uç. İnce: kapı ve içerik repo'da (`listSupportMessages`).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;

  try {
    const messages = await listSupportMessages(auth.userId, id, staffCtx(req));
    return json(200, { messages });
  } catch (err) {
    return adminError(err);
  }
}

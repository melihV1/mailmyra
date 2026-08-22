import { readJsonBody, field } from '../../../../auth/_shared';
import { setSupportCasePriority } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/** Öncelik değişince `slaDueAt`ı repo `createdAt`ten yeniden hesaplar. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const priority = field(body, 'priority');
  if (!['urgent', 'high', 'normal', 'low'].includes(priority)) {
    return json(400, { error: 'Öncelik gerekli.' });
  }

  try {
    await setSupportCasePriority(
      auth.userId,
      id,
      priority as 'urgent' | 'high' | 'normal' | 'low',
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

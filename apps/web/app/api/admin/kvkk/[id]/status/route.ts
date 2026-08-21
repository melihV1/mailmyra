import { readJsonBody, field } from '../../../../auth/_shared';
import { setKvkkStatus } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const status = field(body, 'status');
  if (!['identity_check', 'in_progress', 'legal_review'].includes(status)) {
    return json(400, { error: 'Hedef durum gerekli.' });
  }

  try {
    await setKvkkStatus(auth.userId, id, status as 'identity_check' | 'in_progress' | 'legal_review', field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

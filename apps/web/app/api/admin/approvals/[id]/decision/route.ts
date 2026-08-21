import { readJsonBody, field } from '../../../../auth/_shared';
import { decideApproval } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const decision = field(body, 'decision');
  if (decision !== 'approve' && decision !== 'reject') {
    return json(400, { error: 'Karar (approve|reject) gerekli.' });
  }

  try {
    const res = await decideApproval(auth.userId, id, decision, field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true, status: res.status });
  } catch (err) {
    return adminError(err);
  }
}

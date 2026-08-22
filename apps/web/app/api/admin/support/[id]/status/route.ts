import { readJsonBody, field } from '../../../../auth/_shared';
import { setSupportCaseStatus } from '../../../../../../lib/repo/admin';
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
  if (!['open', 'waiting_customer', 'escalated', 'resolved'].includes(status)) {
    return json(400, { error: 'Hedef durum gerekli.' });
  }

  try {
    await setSupportCaseStatus(
      auth.userId,
      id,
      status as 'open' | 'waiting_customer' | 'escalated' | 'resolved',
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

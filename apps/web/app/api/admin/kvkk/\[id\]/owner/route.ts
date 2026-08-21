import { readJsonBody, field } from '../../../../auth/_shared';
import { assignKvkkOwner } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  try {
    await assignKvkkOwner(auth.userId, id, field(body, 'ownerEmail'), field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

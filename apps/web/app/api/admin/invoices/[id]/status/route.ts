import { readJsonBody, field } from '../../../../auth/_shared';
import { setInvoiceStatus } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/** Geri açma / iptal. `paid` bu uçtan geçmez — /paid muhasebe kaydı ister. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const status = field(body, 'status');
  if (status !== 'due' && status !== 'void') {
    return json(400, { error: "Durum yalnız 'due' ya da 'void' olabilir." });
  }

  try {
    await setInvoiceStatus(auth.userId, id, status, field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

import { readJsonBody, field } from '../../../auth/_shared';
import { setStaffFlag } from '../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../_shared';

/**
 * Personel bayrağını çevirir — onayın İLK gerçek icrası. `grant` panelden
 * JSON BOOLEAN gelir; `field()` yalnız string döndürdüğü için ham gövdeden
 * tip kontrolüyle okunur (approvals route'undaki `requiredApprovals`
 * dersinin boolean hali) — string olmayan her değer 400.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  if (typeof body.grant !== 'boolean') {
    return json(400, { error: 'grant (true|false) gerekli.' });
  }

  try {
    await setStaffFlag(
      auth.userId,
      field(body, 'targetEmail'),
      body.grant,
      field(body, 'approvalRequestId'),
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

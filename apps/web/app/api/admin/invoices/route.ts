import { readJsonBody, field } from '../../auth/_shared';
import { createInvoice } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

/** Fatura kesme. Tutar İSTEMCİDEN gelir — hesaplanmaz (amountCents kuralı). */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  try {
    const id = await createInvoice(
      auth.userId,
      {
        orgId: field(body, 'orgId'),
        number: field(body, 'number'),
        issuedAt: new Date(field(body, 'issuedAt') || Date.now()),
        dueAt: field(body, 'dueAt') ? new Date(field(body, 'dueAt')) : null,
        seats: typeof body.seats === 'number' ? body.seats : 0,
        unitCents: typeof body.unitCents === 'number' ? body.unitCents : undefined,
        amountCents: typeof body.amountCents === 'number' ? body.amountCents : -1,
        currency: field(body, 'currency') || undefined,
        note: field(body, 'note') || null,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id });
  } catch (err) {
    return adminError(err);
  }
}

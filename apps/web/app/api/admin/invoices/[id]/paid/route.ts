import { readJsonBody, field } from '../../../../auth/_shared';
import { markInvoicePaid, type PaymentMethod } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/** Ödendi işareti = muhasebe kaydı: tarih + yöntem + dekont zorunlu yol. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const method = field(body, 'method');
  if (method !== 'bank_transfer' && method !== 'cash' && method !== 'other') {
    return json(400, { error: 'Ödeme yöntemi gerekli.' });
  }

  try {
    await markInvoicePaid(
      auth.userId,
      id,
      {
        paidAt: new Date(field(body, 'paidAt') || Date.now()),
        method: method as PaymentMethod,
        reference: field(body, 'reference') || null,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

import { readJsonBody, field } from '../../../../auth/_shared';
import { setEntitlement } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/** Hak ediş düzeltme. POST (IIS kuralı: PATCH/DELETE yok). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const seats = body.entitledSeats;
  const state = field(body, 'entitlementState');
  const trialRaw = field(body, 'trialEndsAt');

  try {
    await setEntitlement(
      auth.userId,
      id,
      {
        ...(typeof seats === 'number' ? { entitledSeats: seats } : {}),
        ...(state === 'trial' || state === 'active' || state === 'past_due' || state === 'cancelled'
          ? { entitlementState: state }
          : {}),
        // Boş string bilinçli "temizle" değil "dokunma": deneme tarihini
        // silmek için istemci açıkça null gönderir.
        ...(trialRaw ? { trialEndsAt: new Date(trialRaw) } : body.trialEndsAt === null ? { trialEndsAt: null } : {}),
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}

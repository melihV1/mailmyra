import { readJsonBody, field } from '../../auth/_shared';
import {
  createApprovalRequest,
  type ApprovalDomain,
  type ApprovalRisk,
} from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

/** Onay talebi açar — karar defteri kaydı; hiçbir şeyi otomatik uygulamaz. */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const domain = field(body, 'domain');
  if (!['entitlement', 'billing', 'security', 'platform'].includes(domain)) {
    return json(400, { error: 'Alan (domain) gerekli.' });
  }
  const riskLevel = field(body, 'riskLevel');
  if (!['medium', 'high', 'critical'].includes(riskLevel)) {
    return json(400, { error: 'Risk seviyesi gerekli.' });
  }
  // `field()` yalnız string döner; panel bunu JSON SAYI olarak yolluyor —
  // `field()` ile okunsaydı her istek sessizce eşik 1'e düşerdi. invoices
  // route'undaki seats deseniyle aynı: ham gövdeden tipini kontrol ederek oku.
  const requiredApprovals = typeof body.requiredApprovals === 'number' ? body.requiredApprovals : undefined;

  try {
    const res = await createApprovalRequest(
      auth.userId,
      {
        title: field(body, 'title'),
        domain: domain as ApprovalDomain,
        riskLevel: riskLevel as ApprovalRisk,
        orgId: field(body, 'orgId') || undefined,
        targetType: field(body, 'targetType') || undefined,
        targetId: field(body, 'targetId') || undefined,
        requiredApprovals,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}

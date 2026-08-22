import { readJsonBody, field } from '../../auth/_shared';
import { createSupportCase, type SupportChannel, type SupportCategory } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

/** Destek vakası açar. `slaDueAt`ı repo hesaplar — burada yalnız gövde doğrulanır. */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const channel = field(body, 'channel');
  if (!['email', 'form', 'staff'].includes(channel)) {
    return json(400, { error: 'Kanal gerekli.' });
  }
  const category = field(body, 'category');
  if (!['billing', 'builder', 'export', 'access', 'account'].includes(category)) {
    return json(400, { error: 'Kategori gerekli.' });
  }
  const priority = field(body, 'priority');
  if (!['urgent', 'high', 'normal', 'low'].includes(priority)) {
    return json(400, { error: 'Öncelik gerekli.' });
  }

  try {
    const res = await createSupportCase(
      auth.userId,
      {
        reference: field(body, 'reference'),
        subject: field(body, 'subject'),
        requesterEmail: field(body, 'requesterEmail'),
        channel: channel as SupportChannel,
        category: category as SupportCategory,
        priority: priority as 'urgent' | 'high' | 'normal' | 'low',
        orgId: field(body, 'orgId') || undefined,
        summary: field(body, 'summary') || undefined,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}

import { readJsonBody, field } from '../../auth/_shared';
import { createKvkkRequest, type KvkkType } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const type = field(body, 'type');
  if (!['access', 'erasure', 'correction', 'portability'].includes(type)) {
    return json(400, { error: 'Talep türü gerekli.' });
  }
  const receivedAtRaw = field(body, 'receivedAt');
  // Sessizce Date.now()'a düşmek YASAK: bu alan yasal (statutory) süre
  // hesabının başlangıcı — sunucunun "şimdi"si gerçek geliş tarihini
  // sessizce ezerdi. UI zaten her zaman gönderiyor; eksikse gövde bozuk.
  if (!receivedAtRaw) {
    return json(400, { error: 'Geliş tarihi gerekli.' });
  }
  const receivedAt = new Date(receivedAtRaw);
  if (Number.isNaN(receivedAt.getTime())) {
    return json(400, { error: 'Geliş tarihi geçersiz.' });
  }

  try {
    const res = await createKvkkRequest(
      auth.userId,
      {
        reference: field(body, 'reference'),
        subjectEmail: field(body, 'subjectEmail'),
        type: type as KvkkType,
        orgId: field(body, 'orgId') || undefined,
        receivedAt,
        receivedVia: field(body, 'receivedVia') || undefined,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}

import { readJsonBody, field } from '../../../../auth/_shared';
import { addStaffReply } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/**
 * Personel cevabı (spec §7). İnce: sebep sabit `'reply'` repo'da yaşıyor
 * (spec §8-1) — burada yalnız gövde ve kimlik çevrilir.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  try {
    const result = await addStaffReply(auth.userId, id, field(body, 'body'), staffCtx(req));
    return json(200, { ok: true, id: result.id });
  } catch (err) {
    return adminError(err);
  }
}

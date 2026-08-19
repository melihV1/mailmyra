import { currentSession } from '../../../lib/auth/current';
import { clientIp } from '../../../lib/client-ip';
import { NotStaffError, type StaffContext } from '../../../lib/repo/admin';

/**
 * Admin uçlarının ortak parçaları. Desen `api/auth/_shared` ile aynı: uçlar
 * ince, davranış repo'da. Personel kontrolü BURADA DEĞİL — her repo
 * fonksiyonu kendi kapısını taşıyor; buradaki `session` yalnız "kim soruyor"
 * cevabı. Kapıyı uca taşımak, repo fonksiyonunu korumasız sanıp başka
 * yerden çağırma hatasına davetiye olurdu.
 */

export function json(status: number, payload: unknown): Response {
  return Response.json(payload, { status });
}

export async function requireSessionUserId(): Promise<
  { ok: true; userId: string } | { ok: false; res: Response }
> {
  const session = await currentSession();
  if (!session) return { ok: false, res: json(401, { error: 'unauthenticated' }) };
  return { ok: true, userId: session.user.id };
}

/** İstek bağlamı — StaffAccess/AdminAction satırlarına işlenir. */
export function staffCtx(req: Request): StaffContext {
  return {
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}

/**
 * Repo hatasını HTTP'ye çevirir. `NotStaffError` → 404: admin uçlarının
 * varlığı personel olmayana sızdırılmaz — 403 "burada bir şey var ama sana
 * yasak" der, 404 hiçbir şey demez.
 */
export function adminError(err: unknown): Response {
  if (err instanceof NotStaffError) return json(404, { error: 'not_found' });
  const message = err instanceof Error ? err.message : 'unknown';
  return json(400, { error: message });
}

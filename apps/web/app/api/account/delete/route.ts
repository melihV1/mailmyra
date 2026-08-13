import { deleteAccount } from '../../../../lib/auth/account';
import { clearSessionCookieHeader } from '../../../../lib/auth/cookie';
import { currentSession } from '../../../../lib/auth/current';
import { field, json, readJsonBody } from '../../auth/_shared';

/**
 * Spec §4. `deleteAccount` eksik `CDN_WRITE_PATH` konfigürasyonunda fırlatır
 * — burada yakalanmaz, konfigürasyon hatası sert 500 olarak yükselir.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await deleteAccount(session.user.id, {
    password: field(body, 'password'),
    emailConfirm: field(body, 'emailConfirm'),
  });

  if (!result.ok) {
    const status =
      result.reason === 'invalid_credentials'
        ? 403
        : result.reason === 'email_mismatch'
          ? 400
          : 409; // workspace_has_members
    return json(status, { error: result.reason });
  }

  // Kullanıcı satırı gitti — çerez de burada, logout'takiyle aynı başlıkla düşer.
  return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookieHeader() });
}

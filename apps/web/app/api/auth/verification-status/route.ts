import { currentSession } from '../../../../lib/auth/current';
import { json } from '../_shared';

/**
 * verify-pending sayfasının nabzı: doğrulama başka sekmede (e-postadaki
 * link) tamamlanınca buradan görünür, sayfa kendini panele yönlendirir
 * (karar 2026-08-14: doğrulanmadan panele giriş yok).
 */
export async function GET(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });
  return json(200, {
    verified: Boolean(session.user.emailVerifiedAt),
    email: session.user.email,
  });
}

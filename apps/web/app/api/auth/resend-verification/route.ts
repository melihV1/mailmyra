import { currentSession } from '../../../../lib/auth/current';
import { resendVerification } from '../../../../lib/auth/flows';
import { getMailer } from '../../../../lib/mail';
import { json } from '../_shared';

export async function POST(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const result = await resendVerification(session.user.id, getMailer());

  if (!result.ok) {
    if (result.reason === 'rate_limited') {
      return json(
        429,
        { error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
        { 'Retry-After': String(result.retryAfterSeconds) },
      );
    }
    // Zaten doğrulanmış: istenen durum sağlanmış, hata değil.
    return json(200, { ok: true, alreadyVerified: true });
  }

  return json(200, { ok: true });
}

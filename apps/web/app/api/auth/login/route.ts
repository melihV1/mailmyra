import { sessionCookieHeader } from '../../../../lib/auth/cookie';
import { login } from '../../../../lib/auth/flows';
import { clientIp } from '../../../../lib/client-ip';
import { field, json, readJsonBody } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);

  const result = await login({
    email: field(body, 'email'),
    password: field(body, 'password'),
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  if (!result.ok) {
    if (result.reason === 'rate_limited') {
      return json(
        429,
        { error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
        { 'Retry-After': String(result.retryAfterSeconds) },
      );
    }
    // Yanlış şifre ile bilinmeyen hesap aynı cevap — akış zaten ayırt
    // ettirmiyor, statü de ettirmemeli.
    return json(401, { error: result.reason });
  }

  return json(200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(result.sessionToken) });
}

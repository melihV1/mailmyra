import { clearSessionCookieHeader, SESSION_COOKIE } from '../../../../lib/auth/cookie';
import { revokeSession } from '../../../../lib/auth/session';

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq !== -1 && pair.slice(0, eq).trim() === name) return pair.slice(eq + 1).trim();
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const token = cookieValue(req, SESSION_COOKIE);
  // Bayat ya da hiç olmayan çerezle çıkış da başarılıdır — kullanıcının
  // istediği durum ("oturumum kapalı olsun") zaten sağlanmış.
  if (token) await revokeSession(token);

  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookieHeader() } });
}

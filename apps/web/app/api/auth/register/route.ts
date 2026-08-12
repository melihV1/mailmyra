import { sessionCookieHeader } from '../../../../lib/auth/cookie';
import { register } from '../../../../lib/auth/flows';
import { clientIp } from '../../../../lib/client-ip';
import { getMailer } from '../../../../lib/mail';
import { field, json, readJsonBody } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);

  const result = await register(
    {
      email: field(body, 'email'),
      password: field(body, 'password'),
      orgName: field(body, 'orgName'),
      termsVersion: field(body, 'termsVersion') || 'unversioned',
      ip: clientIp(req),
    },
    getMailer(),
  );

  if (!result.ok) {
    // `email_taken` 409, gerisi 400. Kayıt formu hesabın varlığını zaten
    // söylemek zorunda — giriş ve sıfırlamanın aksine burada gizlemek,
    // kullanıcıya "olmadı ama nedenini söylemem" demek olurdu.
    return json(result.reason === 'email_taken' ? 409 : 400, { error: result.reason });
  }

  // Bayrak istemciye açık: mail gitmediyse kullanıcı panele yine girer,
  // doğrulama şeridi + "yeniden gönder" oradadır; istemci isterse bunu söyler.
  return json(
    200,
    { ok: true, verificationMailSent: result.verificationMailSent },
    { 'Set-Cookie': sessionCookieHeader(result.sessionToken) },
  );
}

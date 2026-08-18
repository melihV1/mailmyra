import { sessionCookieHeader } from '../../../../lib/auth/cookie';
import { register } from '../../../../lib/auth/flows';
import { clientIp } from '../../../../lib/client-ip';
import { getMailer } from '../../../../lib/mail';
import { field, formErrorRedirect, json, readBody, seeOther } from '../_shared';

/** Kayıttan sonra kullanıcının düştüğü yer — panelin kendi formuyla aynı. */
const AFTER_REGISTER = '/app/signatures';

export async function POST(req: Request): Promise<Response> {
  const { body, isForm } = await readBody(req);

  // Şifre tekrarı yalnız form gönderiminde gelir ve SUNUCUDA da bakılır:
  // pazarlama sayfası düz `<form>` gönderimi yaptığı için tarayıcı tarafı
  // kontrol atlanabilir (JS kapalı, script yüklenmemiş, istek elle atılmış).
  // Bakılmazsa yazım hatası yapan kullanıcı ilk şifreyle kaydolur ve
  // bildiğini sandığı şifreyle bir daha giremez.
  const confirmation = field(body, 'password_confirmation');
  if (isForm && confirmation && confirmation !== field(body, 'password')) {
    return formErrorRedirect('register.html', 'password_mismatch');
  }

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
    if (isForm) return formErrorRedirect('register.html', result.reason);
    // `email_taken` 409, gerisi 400. Kayıt formu hesabın varlığını zaten
    // söylemek zorunda — giriş ve sıfırlamanın aksine burada gizlemek,
    // kullanıcıya "olmadı ama nedenini söylemem" demek olurdu.
    return json(result.reason === 'email_taken' ? 409 : 400, { error: result.reason });
  }

  const cookie = sessionCookieHeader(result.sessionToken);

  // Doğrulama postası gitmediyse de panele girilir; şerit ve "yeniden gönder"
  // orada. Statik sayfaya bunu taşıyacak bir yer yok, JSON istemcisi için
  // bayrak aşağıda duruyor.
  if (isForm) return seeOther(AFTER_REGISTER, { 'Set-Cookie': cookie });

  return json(
    200,
    { ok: true, verificationMailSent: result.verificationMailSent },
    { 'Set-Cookie': cookie },
  );
}

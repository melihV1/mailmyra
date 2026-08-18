import { sessionCookieHeader } from '../../../../lib/auth/cookie';
import { login } from '../../../../lib/auth/flows';
import { clientIp } from '../../../../lib/client-ip';
import { field, formErrorRedirect, json, readBody, seeOther } from '../_shared';

/** Girişten sonra kullanıcının düştüğü yer — panelin kendi formuyla aynı. */
const AFTER_LOGIN = '/app/signatures';

export async function POST(req: Request): Promise<Response> {
  const { body, isForm } = await readBody(req);

  const result = await login({
    email: field(body, 'email'),
    password: field(body, 'password'),
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  if (!result.ok) {
    // Pazarlama sitesinin formu geldiği sayfaya döner; hata kodu query'de,
    // metni sayfa yazar. `rate_limited` de aynı yoldan gider — statik sayfada
    // `Retry-After` başlığını okuyacak kimse yok.
    if (isForm) return formErrorRedirect('login.html', result.reason);

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

  const cookie = sessionCookieHeader(result.sessionToken);

  // Çerez çapraz-site bir POST'un cevabında yazılıyor ama `SameSite=Lax`
  // bunu engellemez: kısıt çerezin GÖNDERİLMESİNDE, yazılmasında değil.
  // Yönlendirmeden sonraki istek app.mailmyra.com'a aynı-site sayıldığı için
  // oturum sorunsuz taşınır.
  if (isForm) return seeOther(AFTER_LOGIN, { 'Set-Cookie': cookie });

  return json(200, { ok: true }, { 'Set-Cookie': cookie });
}

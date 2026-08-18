/**
 * Auth uçlarının ortak küçük parçaları.
 *
 * Uçlar bilerek ince: bütün davranış `lib/auth/flows.ts`'te yaşıyor ve orada
 * gerçek veritabanına karşı test ediliyor. Burada yalnız HTTP çevirisi var —
 * gövdeyi oku, akışı çağır, sonucu statü koduna ve çereze çevir.
 *
 * İki istemci var ve ikisi farklı konuşuyor: panelin kendi formları `fetch`
 * ile JSON yollayıp JSON cevap bekler; pazarlama sitesindeki (mailmyra.com)
 * statik formlar ise düz bir `<form method="post">` gönderimiyle gelir ve
 * tarayıcı cevabı doğrudan ekrana basar — onlara JSON dönmek ziyaretçiye ham
 * `{"error":"invalid_credentials"}` göstermek demektir. Bu yüzden gövde iki
 * biçimde de okunur ve form gönderimleri 303 ile yönlendirilir.
 */

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // düşerek boş gövdeye
  }
  return {};
}

export interface ParsedBody {
  body: Record<string, unknown>;
  /** Düz form gönderimi mi — cevabın JSON değil yönlendirme olacağını söyler. */
  isForm: boolean;
}

/**
 * `Content-Type`e bakarak JSON ya da form gövdesi okur.
 *
 * Tarayıcının düz form gönderimi `application/x-www-form-urlencoded` gelir;
 * `req.json()` bunu ayrıştıramaz ve gövde sessizce `{}` olur — akış da "boş
 * alan" deyip reddeder. Yani tip kontrolü olmadan pazarlama formu her zaman,
 * hem de nedeni görünmeden başarısız olurdu.
 */
export async function readBody(req: Request): Promise<ParsedBody> {
  const type = req.headers.get('content-type') ?? '';

  if (
    type.includes('application/x-www-form-urlencoded') ||
    type.includes('multipart/form-data')
  ) {
    try {
      const form = await req.formData();
      const body: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        // Auth formlarında dosya yok; string olmayanı düşürmek `field()`in
        // "string değilse boş" sözleşmesiyle aynı davranış.
        if (typeof value === 'string') body[key] = value;
      }
      return { body, isForm: true };
    } catch {
      return { body: {}, isForm: true };
    }
  }

  return { body: await readJsonBody(req), isForm: false };
}

/** Alan yoksa ya da string değilse boş string — akışlar boşu zaten reddeder. */
export function field(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  return typeof value === 'string' ? value : '';
}

export function json(status: number, payload: unknown, headers?: HeadersInit): Response {
  return Response.json(payload, { status, headers });
}

/**
 * Form gönderiminin cevabı: 303 See Other.
 *
 * 303 şart, 302 değil: 302'de tarayıcıların POST'u tekrarlama hakkı var;
 * 303 hedefin GET ile açılacağını garantiler, yani kullanıcı sayfayı
 * yenilediğinde giriş isteği ikinci kez gitmez.
 */
export function seeOther(location: string, headers?: Record<string, string>): Response {
  return new Response(null, { status: 303, headers: { ...headers, Location: location } });
}

/**
 * Pazarlama sitesinin kökü — form hatalarında ziyaretçinin geri döneceği yer.
 *
 * Env'den okunur ve **istekten ASLA türetilmez**: `Origin`/`Referer`e
 * güvenmek açık yönlendirme (open redirect) açığıdır — saldırgan kendi
 * sitesinden form gönderip kullanıcıyı istediği adrese düşürebilirdi.
 *
 * Tip `Record<string, string | undefined>`: `NodeJS.ProcessEnv` yalnız kendi
 * bildirdiği anahtarlarla (`NODE_ENV` gibi) eşleşir, `MARKETING_ORIGIN` orada
 * tanımlı olmadığı için dar bir nesne tipi istemek derlemeyi kırıyor
 * (bkz. `lib/auth/cookie.ts` aynı tuzağa düşmüş).
 */
export function marketingOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  return (env.MARKETING_ORIGIN ?? 'https://mailmyra.com').replace(/\/+$/, '');
}

/**
 * Statik sayfaya hata koduyla dönüş. Kod makine tarafı; metni sayfa seçer,
 * böylece dil ve ton pazarlama sitesinde kalır.
 */
export function formErrorRedirect(
  page: string,
  reason: string,
  env?: Record<string, string | undefined>,
): Response {
  return seeOther(`${marketingOrigin(env)}/${page}?error=${encodeURIComponent(reason)}`);
}

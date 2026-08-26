/** Girişten sonra dönülecek varsayılan yer. */
export const DEFAULT_AFTER_LOGIN = '/app/signatures';

/**
 * `?next=` parametresini süzer.
 *
 * Süzülmeseydi giriş formu bir yönlendiriciye dönüşürdü: oltalama maili
 * `mailmyra.com/login?next=https://kotu.example` der, kullanıcı *bizim*
 * sayfamızda şifresini girer ve girişten sonra saldırganın sitesine düşer.
 *
 * Yalnız site içi yol kabul: tek `/` ile başlayacak; `//` (protokolsüz
 * mutlak adres) ve `/\` (bazı tarayıcılarda aynı kapı) reddedilir.
 */
export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  const second = value[1];
  if (second === '/' || second === '\\') return DEFAULT_AFTER_LOGIN;
  return value;
}

/**
 * Middleware'in ön kontrolünde kullandığı, `/login?next=...` hedefini üretir.
 *
 * Saf fonksiyon — middleware'de de, testte de aynı kod çalışır. `pathname +
 * search` tek parça olarak `next=` değerine gömülür (elle string
 * birleştirme değil, `URLSearchParams` ile) ki `?client=gmail` gibi bir
 * sorgu kendi `&`/`=` karakterleriyle login formunun sorgu dizesine karışıp
 * ayrı bir parametre gibi görünmesin — çözülünce yol ve sorgu birlikte geri
 * gelmeli. `search`, `req.nextUrl.search` gibi baştaki `?` ile de gelebilir,
 * onsuz da.
 */
export function loginRedirectPath(pathname: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const target = query ? `${pathname}?${query}` : pathname;
  const params = new URLSearchParams();
  params.set('next', target);
  return `/login?${params.toString()}`;
}

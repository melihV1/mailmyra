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

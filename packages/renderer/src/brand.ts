/**
 * Marka renkleri — TEK KAYNAK (spec: 2026-07-27-brand-identity-design.md).
 *
 * Renderer paketinde durur çünkü hem apps/web hem fixture'lar bunu paylaşır
 * ve bu değerler `SignatureData`'ya giren alan verisidir. Sabittir, davranış
 * içermez — renderer saf kalır.
 *
 * Site arayüzü bunları `apps/web/app/tokens.css` üzerinden CSS değişkeni
 * olarak kullanır. E-posta HTML'inde CSS değişkeni ÇALIŞMAZ; orada daima
 * literal hex gider.
 *
 * ── İKİ TONLU MAVİ (karar: 2026-07-27, ölçümle) ──────────────────────────
 * Tek bir mavi iki işi birden yapamıyor. Ölçülen kontrastlar:
 *
 *   #2f66c8  beyaza 5.45 · üstünde beyaz metin 5.45 (AA GEÇER)
 *            → buton zemini, link, e-posta imzasındaki CTA ve ikonlar.
 *              İmzalar BEYAZ zeminde okunur, bu yüzden imza tarafının
 *              varsayılanı budur.
 *
 *   #7b9fd3  beyaza 2.71 (beyaz metin TAŞIYAMAZ) · koyu lacivertte 6.38
 *            → YALNIZ koyu zeminli site arayüzünde vurgu rengi.
 *              Buton zemini olarak KULLANILMAZ — eski tek-renk kullanımında
 *              CTA butonu 2.71 ile erişilebilirlik eşiğinin altındaydı.
 *
 *   #e0a66c  koyu lacivertte 8.11 → vurgu turuncusu, koyu zeminde güçlü.
 */
export const BRAND = {
  /**
   * Buton/link zemini ve e-posta imzası varsayılanı. Beyaz metin taşır.
   * (Şu an `primary` hâlâ eski açık tondur — varsayılanların bu değere
   * geçirilmesi ayrı bir iştir, testleri ve üretilmiş ikon yollarını etkiler.)
   */
  strong: '#2f66c8',
  /** Mevcut varsayılan: brandColor + iconColor. Koyu zeminde vurgu. */
  primary: '#7b9fd3',
  /** Vurgu turuncusu. */
  secondary: '#e0a66c',
} as const;

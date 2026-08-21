/**
 * Fiyat modelinin tek kaynağı (kilitli karar, 2026-08-07).
 *
 * `$1 / aktif gönderici / yıl` · minimum 1 · yalnız yıllık · 7 gün kartsız
 * deneme · **ücretsiz plan yok**. Pro / Team / Agency plan değil, aynı fiyatın
 * üç çalışma alanı biçimi.
 *
 * Rakam koda ikinci kez yazılmaz. Pazarlama sitesi statik HTML olduğu için
 * aynı sayılar orada `scripts/marketing-site/build-pricing-page.py` içindeki
 * Python sabitlerinde yaşıyor — iki kaynağın **elle** eşit tutulması gerekiyor.
 * Sayı değişirse ikisi birden değişir.
 */

export const PRICING = {
  /** Organization.priceVersion ile birebir eşleşen canlı fiyat politikası. */
  version: '2026-08-07-usd-1-year',
  perSeatYearCents: 100,
  currency: 'USD',
  minSeats: 1,
  trialDays: 7,
  /** Deneme koltuğu (karar: 2026-08-11, Hüseyin). Ekipler ikinci kişiyi
   *  yayına alamadan duvara toslamasın; kayıtta org bu kapasiteyle açılır. */
  trialSeats: 5,
  trialRequiresCard: false,
  hasFreePlan: false,
} as const;

/**
 * Yıllık toplam, cent cinsinden. Kademe yok — çarpma, tablo değil.
 *
 * Minimumun altı minimuma yuvarlanır: "0 koltuk" bir sipariş değil, boş bir
 * formdur ve kullanıcıya hata göstermek yerine tabana çekiyoruz (pazarlama
 * sayfasındaki hesaplayıcı da aynı şeyi yapıyor).
 */
export function annualTotalCents(seats: number): number {
  if (!Number.isInteger(seats)) {
    throw new RangeError(`Seat count must be a whole number, got ${seats}`);
  }
  return Math.max(seats, PRICING.minSeats) * PRICING.perSeatYearCents;
}

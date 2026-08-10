/**
 * Koltuk sayımı.
 *
 * Kilitli karar (2026-08-08): koltuk **ayrı bir "yayına al" adımında** tükenir.
 * Taslak bedavadır — insan imzayı kurup görsün, para kapıyı yayına alırken
 * çalsın. Bunun pratik sonucu, koltuğu tüketen varlığın imza değil
 * **gönderici kimliği** olmasıdır: bir kişinin üç imzası bir koltuk yer.
 *
 * Sayım DB bilmez. Çağıran, fatura sahibi org'un ağacındaki bütün kimlikleri
 * tek liste hâlinde verir; ajans senaryosunda müşteri org'ları da o listeye
 * girer. Böylece "ajans tek koltukla sınırsız müşteri yönetsin" açığı
 * kapanır — kural burada değil, listeyi kuran sorguda tanımlıdır.
 */

export type SeatStatus = 'draft' | 'active' | 'inactive';

/** `SenderIdentity`'nin sayım için gereken en küçük parçası. */
export interface SeatBearing {
  publishedAt: Date | null;
  deactivatedAt: Date | null;
}

export function seatStatus(identity: SeatBearing): SeatStatus {
  // `deactivatedAt` her şeyi ezer. Tarihleri karşılaştırmıyoruz: saat kayması
  // ya da elle veri düzeltmesi sırayı bozabilir ve o durumda yanlış taraf,
  // müşteriye ödemediği koltuğu faturalamak olur.
  if (identity.deactivatedAt !== null) return 'inactive';
  if (identity.publishedAt === null) return 'draft';
  return 'active';
}

export function countActiveSeats(identities: readonly SeatBearing[]): number {
  return identities.filter((identity) => seatStatus(identity) === 'active').length;
}

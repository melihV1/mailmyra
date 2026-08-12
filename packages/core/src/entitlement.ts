/**
 * Yayına alma ve export kapısı.
 *
 * Spec §4: **export ayrı bir kapı değil.** Export yalnız aktif gönderici için
 * çalışır; böylece "frontend'de düğmeyi gizlemek" hiçbir şey ifade etmez —
 * kapı, kimliğin durumunun kendisidir.
 *
 * Buradaki fonksiyonlar saf ve senkron: karar verirler, iş yapmazlar. Gerçek
 * zorlama `POST /api/senders/:id/publish` içindeki transaction'da,
 * `SELECT ... FOR UPDATE` ile alınan kilidin altında bu karara bakarak olur.
 * İki eşzamanlı publish'in tavanı aşmasını engelleyen şey kilit, bu dosya
 * değil.
 */

import { seatStatus, type SeatBearing } from './seats';

export type EntitlementState = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface Entitlement {
  /** Satın alınmış kapasite. Dönem içinde düşmez (v3 §8: iade yok). */
  entitledSeats: number;
  state: EntitlementState;
}

export type BlockedReason =
  /** Tavan dolu — yeni koltuk gerekiyor. HTTP 402. */
  | 'seat_limit'
  /** Çalışma alanı yeni yayın/export hakkına sahip değil. HTTP 402. */
  | 'not_entitled'
  /** Kimlik yayında değil; export'un tek ön koşulu bu. HTTP 409. */
  | 'not_published';

export type Decision = { allowed: true } | { allowed: false; reason: BlockedReason };

const ALLOWED: Decision = { allowed: true };

const deny = (reason: BlockedReason): Decision => ({ allowed: false, reason });

/**
 * Durum → yetenek tablosu.
 *
 * `past_due` bilinçli olarak yumuşak: sahadaki insanlar çalışmaya devam eder,
 * yalnız **yeni** kimlik yayına alınamaz. Gerekçe: ilk 10 müşteri elle
 * faturalanıyor; geciken bir havaleyi 200 kişilik bir firmanın imzalarını
 * kapatarak cezalandırmak, tahsilattan çok daha pahalıya patlar.
 *
 * ⚠️ Bu satır bir iş kararı — Hüseyin'in onayı bekliyor, bkz. spec §10.
 * Değiştirmek isteyen tabloyu değiştirsin, `if` yazmasın.
 */
const CAPABILITY: Record<EntitlementState, { publishNew: boolean; export: boolean }> = {
  trial: { publishNew: true, export: true },
  active: { publishNew: true, export: true },
  past_due: { publishNew: false, export: true },
  cancelled: { publishNew: false, export: false },
};

export interface PublishInput {
  entitlement: Entitlement;
  /** Fatura sahibi org ağacındaki aktif koltuk sayısı — `countActiveSeats`. */
  activeSeats: number;
  target: SeatBearing;
}

export function canPublish({ entitlement, activeSeats, target }: PublishInput): Decision {
  // Zaten aktif olan bir kimliği tekrar yayına almak koltuk sayısını
  // değiştirmez. Tavan dolu olsa bile, hatta çalışma alanı gecikmiş olsa bile
  // geçmeli — aksi hâlde ünvan düzeltmek imkânsız hâle gelir.
  if (seatStatus(target) === 'active') return ALLOWED;

  if (!CAPABILITY[entitlement.state].publishNew) return deny('not_entitled');

  // `>=` çünkü bu çağrı bir koltuk daha isteyecek. Tavanın üstünde bir sayım
  // (koltuk düşürülmüş ya da veri elle düzeltilmiş) de burada yakalanır.
  if (activeSeats >= entitlement.entitledSeats) return deny('seat_limit');

  return ALLOWED;
}

/** Bilgilendirme eşiği — spec §6 "tavana yaklaşınca". */
export const SEAT_WARNING_RATIO = 0.8;

export interface SeatWarningInput {
  /** Az önce biten publish SONRASI aktif koltuk sayısı. */
  activeSeats: number;
  entitledSeats: number;
}

/**
 * Bu publish %80 çizgisini aşağıdan geçti mi?
 *
 * Publish tek koltuk tüketir; "öncesi" tanım gereği bir eksik. Çizginin
 * üstündeyken atılan her koltuk yeniden mail üretmesin diye yalnız GEÇİŞ
 * anına bakılır — koltuk boşalıp çizgi yeniden geçilirse uyarı da yeniden
 * düşer, ayrıca durum tutmaya gerek kalmaz.
 */
export function seatWarningDue({ activeSeats, entitledSeats }: SeatWarningInput): boolean {
  if (entitledSeats <= 0 || activeSeats <= 0) return false;
  // Bölme biçimi bilinçli: IEEE bölme doğru yuvarlar, 4/5 ve 12/15 tam olarak
  // 0.8 literaliyle eşit çıkar. `entitledSeats * 0.8` çarpımı ise etmez.
  const nowAtOrPast = activeSeats / entitledSeats >= SEAT_WARNING_RATIO;
  const wasBelow = (activeSeats - 1) / entitledSeats < SEAT_WARNING_RATIO;
  return nowAtOrPast && wasBelow;
}

export interface ExportInput {
  entitlement: Entitlement;
  target: SeatBearing;
}

export function canExport({ entitlement, target }: ExportInput): Decision {
  if (!CAPABILITY[entitlement.state].export) return deny('not_entitled');
  if (seatStatus(target) !== 'active') return deny('not_published');
  return ALLOWED;
}

/**
 * Zamanlama matematiği — SAF, kapısız (admin repo'sunun numaralandırma
 * testi her export'tan personel kapısı beklediği için oradan ayrı yaşar).
 *
 * "Sonraki planlı koşu" GEÇMİŞ değil: zamanlama tanımının kendi anlamı.
 * Depoda `nextRunAt` doluysa repo onu kullanır; bu yalnız boş hâlin
 * deterministik türetmesi. Saat 07:00 UTC — Europe/Istanbul sabahı.
 */
export function nextPlannedRun(cadence: string, from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 7));
  if (cadence === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (cadence === 'weekly') {
    const day = d.getUTCDay(); // 0 = Pazar
    const toMonday = ((8 - day) % 7) || 7;
    d.setUTCDate(d.getUTCDate() + toMonday);
  } else {
    // monthly (bilinmeyen kadans da aylık gibi davranır — sessiz hata yok,
    // repo yazarken kadansı zaten doğrulayacak)
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  }
  return d;
}

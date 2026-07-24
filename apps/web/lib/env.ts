/**
 * Ortam değişkeni tam sayı ayrıştırma: `Number(value)` NaN veya sonsuz
 * üretirse (eksik, boş, veya çöp string) `fallback` döner — asla `NaN`
 * sızdırmaz. Böylece bozuk/silinmiş bir env değeri (ör. rate limit veya
 * kota sabiti) korumayı sessizce devre dışı bırakamaz.
 */
export function envInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

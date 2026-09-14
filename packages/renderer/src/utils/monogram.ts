/**
 * Ad-soyaddan en fazla iki baş harf üretir.
 *
 * Büyütme kuralı: karakter `toLocaleUpperCase('tr-TR')`'den geçirilir.
 * Zaten büyük olan karakterler için bu kimlik fonksiyonudur, o yüzden
 * ayrıca "zaten büyük mü" kontrolüne GEREK YOK — eklemeyin, ölü daldır.
 *
 * Sonuç tablosu (spec'ten):
 *   'İlker Yılmaz' → İY   (zaten büyük, dokunulmadı)
 *   'ilker yılmaz' → İY   (Türkçe kural)
 *   'Ian Smith'    → IS   (zaten büyük, dokunulmadı)
 *   'ian smith'    → İS   ← BİLİNEN SINIR, kabul edildi
 *
 * Son satır tamamen küçük harfle yazılmış İngilizce bir isim gerektirir;
 * insanlar kendi adını böyle yazmaz. Düz `toUpperCase()` seçilseydi 2.
 * satır `IY` çıkardı — yani gerçek müşteri kitlesinde bozulurdu.
 */
export function initialsFrom(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  // [...w][0] — kod noktası güvenli: 'w[0]' astral karakterlerde (emoji)
  // vekil çiftin yarısını döndürüp bozuk karakter üretirdi.
  const first = (w: string) => ([...w][0] ?? '').toLocaleUpperCase('tr-TR');

  if (words.length === 1) return first(words[0]!);
  return first(words[0]!) + first(words[words.length - 1]!);
}

import type { SignatureData } from '../types';

type NameSpacing = NonNullable<SignatureData['layout']['nameSpacing']>;

/**
 * Geniş aralıklı isimde harf aralığı.
 *
 * Bu dosya bir zamanlar `displayName()` de içeriyordu ve ismi büyük harfe
 * çeviriyordu. KALDIRILDI (2026-09-15) çünkü ölçüldü: hangi büyütme kuralı
 * seçilirse seçilsin isimlerin bir kısmı bozuluyor — varsayılan kural
 * `Elif` → `ELIF`, Türkçe kural `Smith` → `SMİTH`. Bir ismi dilini bilmeden
 * doğru büyütmek mümkün değil. **Geri eklemeyin**; ancak `SignatureData`
 * kişi başına bir dil sinyali taşırsa mümkün olur.
 *
 * `em` cinsinden — px verseydik 15px ve 23px isimde aynı oranı tutmazdı.
 * Monogramın `0.02em`'inden geniş, çünkü orada iki harf var, burada tam bir
 * isim.
 *
 * `undefined` dönmesi kasıtlı: `utils/inline-style.ts` içindeki
 * `styleToString` `undefined` ve `''` değerleri filtreliyor, yani çağıran
 * bunu doğrudan stil nesnesine koyabilir ve `normal` hâlde anahtar hiç
 * basılmaz — bugünkü çıktı bayt bayt korunur.
 */
export function nameLetterSpacing(nameSpacing: NameSpacing | undefined): string | undefined {
  return nameSpacing === 'wide' ? '0.04em' : undefined;
}

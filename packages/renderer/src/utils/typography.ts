import type { SignatureData } from '../types';

type NameCase = NonNullable<SignatureData['layout']['nameCase']>;

/**
 * İsim satırının basılacak hâli.
 *
 * Büyük harf CSS ile DEĞİL burada üretilir: `text-transform` Outlook'un
 * masaüstü Word render motorunda güvenilmez, ama biz zaten çıktıyı üreten
 * tarafız — güvenilmez bir CSS özelliğine bulaşmak için sebep yok.
 *
 * `toLocaleUpperCase('tr-TR')` — `initialsFrom`'un kullandığı kuralın aynısı
 * (`i` → `İ`). Bilinen sınır da aynı: tamamen küçük harfle yazılmış İngilizce
 * bir isim (`ian smith` → `İAN SMİTH`). Nadir ve müşteri kitlesinin doğru
 * tarafında.
 *
 * `ß` → `SS` katlaması BURADA SORUN DEĞİL (monogramda sorundu, çünkü orada
 * "en fazla iki karakter" garantisi vardı); tam isimde SS doğru Almanca
 * büyük harftir.
 */
export function displayName(fullName: string, nameCase: NameCase | undefined): string {
  if (nameCase !== 'upper') return fullName;
  return fullName.toLocaleUpperCase('tr-TR');
}

/**
 * Versal isimde harf aralığı. `em` cinsinden — px verseydik 15px ve 23px
 * isimde aynı oranı tutmazdı. Monogramın `0.02em`'inden geniş, çünkü orada
 * iki harf var, burada tam bir isim.
 *
 * `undefined` dönmesi kasıtlı: çağıran bunu doğrudan `styleToString`'e
 * verebilsin, `normal` hâlde stile hiçbir şey eklenmesin.
 */
export function nameLetterSpacing(nameCase: NameCase | undefined): string | undefined {
  return nameCase === 'upper' ? '0.04em' : undefined;
}

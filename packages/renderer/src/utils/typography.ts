import type { SignatureData } from '../types';

type NameCase = NonNullable<SignatureData['layout']['nameCase']>;

/**
 * İsim satırının basılacak hâli.
 *
 * Büyük harf CSS ile DEĞİL burada üretilir: `text-transform` Outlook'un
 * masaüstü Word render motorunda güvenilmez, ama biz zaten çıktıyı üreten
 * tarafız — güvenilmez bir CSS özelliğine bulaşmak için sebep yok.
 *
 * VARSAYILAN `toUpperCase()` kullanılır — komşu `initialsFrom`'un
 * `toLocaleUpperCase('tr-TR')`'ından KASITLI OLARAK FARKLI. Birleştirmeyin.
 *
 * Sebep ölçüldü: Türkçe kural isimdeki HER `i`'yi noktalıya çevirir, yalnız
 * ilk harfi değil. `Smith` → `SMİTH`, `Martin` → `MARTİN`, `Weiß` → `WEİSS`.
 * Varsayılan kuralda düzgün yazılmış Türkçe isim de doğru çıkar (`İ` zaten
 * büyüktür, `ı` → `I` doğrudur): `İlker Yılmaz` → `İLKER YILMAZ`.
 *
 * Kabul edilen tek sınır: tamamen küçük harfle yazılmış Türkçe isim
 * (`ilker yılmaz` → `ILKER YILMAZ`, noktası düşer). `initialsFrom`'un kabul
 * ettiği sınırın aynısı ama ters yönde — orada bedel tek harf, burada bir
 * harf; `tr-TR` seçseydik bedel `i` içeren HER isim olurdu.
 *
 * `ß` → `SS` katlaması iki kuralda da olur ve burada DOĞRUDUR: tam isimde SS
 * doğru Almanca büyük harftir.
 */
export function displayName(fullName: string, nameCase: NameCase | undefined): string {
  if (nameCase !== 'upper') return fullName;
  return fullName.toUpperCase();
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

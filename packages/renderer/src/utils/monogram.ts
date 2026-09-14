import type { SignatureData } from '../types';
import { normalizeHex, readableTextOn } from './color';
import { htmlEscape } from './escape';
import { table, row, cell } from './table';

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

/**
 * Monogram basılacak mı: fotoğraf YOKSA, kapatılmamışsa ve addan en az bir
 * harf türetilebiliyorsa. `avatarUrl` varsa monogram fotoğrafın yerini almaz.
 */
export function shouldShowMonogram(data: SignatureData): boolean {
  if (data.visuals.avatarUrl) return false;
  if ((data.layout.monogram ?? 'auto') === 'off') return false;
  return initialsFrom(data.identity.fullName).length > 0;
}

/**
 * Marka renginde, baş harfleri ortalanmış tek hücrelik tablo.
 *
 * Görsel DEĞİL, bilerek: kurumsal Outlook dış görselleri varsayılan
 * engeller; fotoğrafı olmayan kullanıcı için eklenen fallback'in kendisi
 * engellenebilir olsaydı tam ihtiyaç anında hiçbir şey göstermezdi.
 *
 * `bgcolor` attribute'u ve `background-color` stili BİRLİKTE verilir —
 * Word motoru CSS zeminini her zaman uygulamıyor. Dikey ortalama için
 * `valign` + `mso-line-height-rule: exactly` + kutu boyuna eşit
 * `line-height` birlikte kullanılır (tek satırlık metinde bilinen yöntem).
 *
 * Punto kutunun %40'ı: Arial bold büyük harf ≈ 0.72em, iki harf ≈ 1.44em,
 * `1.44 × 0.4 = 0.576` → baş harfler kutunun ~%58'ini kaplar, her boyutta
 * rahat sığar. Oranı yükseltmek en küçük kutuda (40px) taşma riski doğurur.
 */
export function monogramCell(opts: {
  initials: string;
  size: number;
  brandHex: string;
  fontFamily: string;
  /** Şablonun KENDİ avatar yarıçapı — beşi '4px', photo-first '50%'. */
  borderRadius: string;
}): string {
  const bg = normalizeHex(opts.brandHex);
  const fg = readableTextOn(bg);
  const fontSize = Math.round(opts.size * 0.4);
  const style = {
    width: `${opts.size}px`,
    height: `${opts.size}px`,
    'background-color': bg,
    color: fg,
    'font-family': opts.fontFamily,
    'font-size': `${fontSize}px`,
    'font-weight': 'bold',
    'letter-spacing': '0.02em',
    'text-align': 'center',
    'mso-line-height-rule': 'exactly',
    'line-height': `${opts.size}px`,
    'border-radius': opts.borderRadius,
  };

  const td = cell(htmlEscape(opts.initials), {
    align: 'center',
    valign: 'middle',
    bgcolor: bg,
    height: opts.size,
    width: opts.size,
    style,
  });

  // border="0" + border:none + mso-table-lspace/rspace:0pt buradan gelir
  // (Outlook 2512 kenarlık bug'ı — bkz. table()).
  return table(row(td), { width: opts.size });
}

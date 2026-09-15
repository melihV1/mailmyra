import type { SignatureData } from '../types';
import { normalizeHex } from './color';
import { cell, row } from './table';

/**
 * Aksan alanı çizilsin mi.
 *
 * Alan YOKSA 'auto' sayılır: aksan, şablonun KARAKTERİDİR, kişisel tercih
 * değil. Kapalı varsayılan galeriyi bugünkü basic hâlinde bırakırdı — ki
 * bu işin çıkış noktası tam olarak oydu.
 *
 * Bu fonksiyon yalnız KULLANICI tercihini söyler. Şablonun aksan alanı
 * olup olmadığı ayrı bir sorudur ve şablonun kendi kararıdır; yeri
 * tanımsız şablonlar bu fonksiyonu hiç çağırmaz.
 */
export function shouldShowAccentBand(data: SignatureData): boolean {
  return (data.layout.accentBand ?? 'auto') === 'auto';
}

/**
 * Dekoratif tam genişlik renk bandı — tek hücrelik bir satır.
 *
 * İçeriği `&nbsp;` ve satır kutusu 1px'e çökertilir. Sebep card-bordered'ın
 * kendi şerit hücresinde yazılı: *"Outlook boş hücreye arka plan
 * boyamıyor."* İçeriksiz bir hücre bazı istemcilerde hiç görünmez.
 *
 * `bgcolor` attribute'u VE `background-color` stili birlikte verilir —
 * Word motoru CSS zeminini her zaman uygulamıyor.
 *
 * GÖRSEL İÇERMEZ ve içermemeli: şeffaf PNG logo koyu zeminde kaybolur
 * (CLAUDE.md) ve elimizde açık/koyu logo varyantı yok.
 */
export function accentBandRow(opts: {
  brandHex: string;
  height: number;
  /**
   * Bandın kaç sütun kaplayacağı. Bant TEK hücreli bir satır; eğer aynı
   * tablodaki diğer satır çok hücreliyse (card-bordered'da şerit + gövde)
   * bunu vermezsek Word'de sütunlar hizasız çizilir.
   */
  colspan?: number;
}): string {
  const bg = normalizeHex(opts.brandHex);
  return row(
    cell('&nbsp;', {
      bgcolor: bg,
      height: opts.height,
      ...(opts.colspan ? { colspan: opts.colspan } : {}),
      style: {
        'background-color': bg,
        height: `${opts.height}px`,
        'font-size': '1px',
        'line-height': '1px',
      },
    }),
  );
}

/**
 * Bir hücreyi renk paneline çeviren attribute + stil parçası.
 *
 * Bant gibi kendi satırını kurmaz; çağıran bunu mevcut bir `cell()`
 * çağrısına yayar (`...accentPanelStyle(brand)`). Böylece panel, içindeki
 * avatar ile AYNI hücrede kalır ve Word'de hücre yüksekliği uyuşmazlığı
 * riski doğmaz.
 *
 * Metin rengi BİLEREK dönmez (final review ⑤ — önceki turda `color:
 * readableTextOn(bg)` vardı, kaldırıldı). Tek tüketici `photo-first.ts`'in
 * avatar hücresi: içeriği her zaman bir `<img>`, hiçbir glif bu stili miras
 * almaz — `<img>` CSS `color`'dan etkilenmez. Ölü bir kontrast hesabını
 * canlı tutmak yerine kaldırmayı seçtik: kullanılmayan kod "ileride lazım
 * olur" diye tutulursa hiç doğrulanmadan bozulabilir. İleride panelin
 * içine metin taşıyan bir varyant eklenirse `readableTextOn(bg)` o an
 * geri eklenir (bkz. `utils/color.ts`) — tek satırlık bir ekleme.
 */
export function accentPanelStyle(brandHex: string): {
  bgcolor: string;
  style: Record<string, string>;
} {
  const bg = normalizeHex(brandHex);
  return {
    bgcolor: bg,
    style: { 'background-color': bg },
  };
}

import type { SignatureData } from '@mailmyra/renderer';
import { TEMPLATE_ACCENT_SURFACE } from '@mailmyra/renderer';

export type SwitchName = 'nameSpacing' | 'monogram' | 'accentBand';

export interface SwitchState {
  /** Anahtar hiç gösterilsin mi — işe yaramayacağı yerde GİZLENİR (spec Karar 2). */
  visible: boolean;
  /** Onay kutusu işaretli mi. */
  checked: boolean;
}

/**
 * Üç yerleşim anahtarının o anki hâli.
 *
 * Bu kural BİLEREK JSX'in dışında: `apps/web`'de React bileşen testi
 * altyapısı yok (vitest yalnız `test/**\/*.test.ts` topluyor), yani
 * `checked={...}` diye gömülen bir ifade hiç sınanamazdı — ve sınanması
 * gereken şey tam da aşağıdaki asimetri.
 *
 * ÇAĞIRAN `applied`'ı (marka bindirilmiş veriyi) vermeli, ham `data`'yı
 * değil: `templateId` marka ayarlarından KİLİTLENEBİLİR, ve aksan
 * anahtarının görünürlüğü gerçekten render edilecek şablona bağlıdır.
 * Üç alanın kendisi marka belgesinde olmadığı için `checked` iki veride de
 * aynıdır.
 */
export function layoutSwitches(data: SignatureData): Record<SwitchName, SwitchState> {
  const { layout, visuals } = data;
  const accentTemplate: boolean =
    (TEMPLATE_ACCENT_SURFACE as Record<string, boolean>)[layout.templateId] ?? false;

  return {
    // Harf aralığı altı şablonda da çalışır — koşulsuz görünür.
    nameSpacing: {
      visible: true,
      // 🔴 `=== 'wide'` — tanımsızken KAPALI. Diğer ikisiyle aynı kalıba SOKMA.
      checked: layout.nameSpacing === 'wide',
    },
    // Monogram altı şablonda da var; koşul yalnız "fotoğraf yok".
    monogram: {
      visible: !visuals.avatarUrl,
      // 🔴 `!== 'off'` — tanımsızken AÇIK.
      checked: layout.monogram !== 'off',
    },
    accentBand: {
      visible: accentTemplate,
      // 🔴 `!== 'off'` — tanımsızken AÇIK.
      checked: layout.accentBand !== 'off',
    },
  };
}

/**
 * Onay kutusu değişince `patchLayout`'a verilecek parça.
 *
 * `'auto'`/`'normal'` AÇIKÇA yazılır, alan `undefined` bırakılmaz: kullanıcı
 * bilinçli olarak açtıysa bu kayda geçmelidir. Ayrıca boolean yazmak
 * renderer'da sessizce "off değil" sayılır — hata vermez, özellik
 * kapatılamaz hâle gelir.
 */
export function layoutSwitchPatch(
  name: SwitchName,
  checked: boolean,
): Partial<SignatureData['layout']> {
  switch (name) {
    case 'nameSpacing':
      return { nameSpacing: checked ? 'wide' : 'normal' };
    case 'monogram':
      return { monogram: checked ? 'auto' : 'off' };
    case 'accentBand':
      return { accentBand: checked ? 'auto' : 'off' };
  }
}

import type { SignatureData } from '@mailmyra/renderer';
import { accentSurfaceAvailable } from '@mailmyra/renderer';
import type { BuilderDict } from '../../lib/i18n/dict/builder';

export type SwitchName = 'nameSpacing' | 'monogram' | 'accentBand';

/**
 * Üç anahtarın adı, tek yerde. `StyleStep.tsx`'teki elle yazılmış
 * `['nameSpacing', 'monogram', 'accentBand'] as const` dizisinin YERİNİ
 * ALIR — ikinci bir elle tutulan liste olmasın diye (final review ③).
 * `apps/web/test/builder-layout-switches.test.ts` bunun `layoutSwitches`'in
 * döndürdüğü anahtarlarla (yani gerçek `SwitchName` kapsamıyla) birebir
 * aynı olduğunu kilitler.
 */
export const SWITCH_NAMES: readonly SwitchName[] = ['nameSpacing', 'monogram', 'accentBand'] as const;

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
  // Tek yüklem `capabilities.ts`'ten (final review ①): şablonlar VE arayüz
  // AYNI fonksiyonu çağırır, koşul iki yerde ayrı ayrı tarif edilmez.
  // `data` bütünüyle verilir, yalnız `layout.templateId` değil — yüklem
  // photo-first'te `visuals.avatarUrl`'a de bakar.
  const accentTemplate: boolean = accentSurfaceAvailable(data, layout.templateId);

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

/**
 * Anahtarın onay kutusu etiketi.
 *
 * BİLEREK JSX'in dışında (final review ③): `StyleStep.tsx`'te iç içe
 * ternary ile seçiliyordu, sınanmayan mantık JSX'te yaşıyordu. `Record<
 * SwitchName, string>` kullanılır — bir ternary zincirinden farklı olarak,
 * dördüncü bir `SwitchName` eklendiğinde eksik dal DERLEMEYİ KIRAR; ternary
 * sessizce yanlış (ya da `undefined`) etiket basardı.
 *
 * `t` parametresinin tipi sözlükten TÜRETİLİR
 * (`BuilderDict['steps']['style']['typography']`) — metnin kendisi bu
 * modüle KOPYALANMAZ, tek kaynak `lib/i18n/dict/builder.ts` kalır.
 */
export function switchLabel(
  t: BuilderDict['steps']['style']['typography'],
  name: SwitchName,
): string {
  const labels: Record<SwitchName, string> = {
    nameSpacing: t.nameSpacingWide,
    monogram: t.monogramFallback,
    accentBand: t.accentBandOn,
  };
  return labels[name];
}

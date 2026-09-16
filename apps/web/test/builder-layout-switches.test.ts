import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { TEMPLATE_IDS } from '@mailmyra/renderer';
import { createEmptyData } from '../app/builder/reducer';
import {
  layoutSwitches,
  layoutSwitchPatch,
  switchLabel,
  SWITCH_NAMES,
} from '../app/builder/layout-switches';
import { builder as builderDict } from '../lib/i18n/dict/builder';

function withLayout(over: Partial<SignatureData['layout']>): SignatureData {
  const d = createEmptyData();
  return { ...d, layout: { ...d.layout, ...over } };
}

describe('layoutSwitches — default asymmetry', () => {
  it('treats an untouched layout as monogram ON, accent ON, spacing OFF', () => {
    // 🔴 Bu testin varlık sebebi: üç ifadeyi tek kalıba sokan bir "temizlik"
    // refactor'ı sahada kayıtlı HER imzanın varsayılanını ters çevirir.
    const s = layoutSwitches(withLayout({ templateId: 'card-bordered' }));
    expect(s.monogram.checked).toBe(true);
    expect(s.accentBand.checked).toBe(true);
    expect(s.nameSpacing.checked).toBe(false);
  });

  it('reads an explicit off as off, and an explicit wide as on', () => {
    const s = layoutSwitches(
      withLayout({ templateId: 'card-bordered', monogram: 'off', accentBand: 'off', nameSpacing: 'wide' }),
    );
    expect(s.monogram.checked).toBe(false);
    expect(s.accentBand.checked).toBe(false);
    expect(s.nameSpacing.checked).toBe(true);
  });

  it('reads an explicit auto/normal the same as undefined', () => {
    const s = layoutSwitches(
      withLayout({ templateId: 'card-bordered', monogram: 'auto', accentBand: 'auto', nameSpacing: 'normal' }),
    );
    expect(s.monogram.checked).toBe(true);
    expect(s.accentBand.checked).toBe(true);
    expect(s.nameSpacing.checked).toBe(false);
  });
});

describe('layoutSwitches — visibility', () => {
  it('shows the spacing switch on every template', () => {
    for (const templateId of TEMPLATE_IDS) {
      expect(layoutSwitches(withLayout({ templateId })).nameSpacing.visible).toBe(true);
    }
  });

  it('shows the accent switch only where the template can currently draw an accent surface', () => {
    // card-bordered'ın aksan alanı KOŞULSUZ var; photo-first'in aksan alanı
    // yalnız gerçek bir FOTOĞRAF varken var (final review ①) — bu ölçüm
    // avatarlı bir veriyle yapılır, aşağıdaki "dead-switch" testi ise
    // fotoğrafsız hâli ayrıca sınar.
    const base = createEmptyData();
    const withAvatar: SignatureData = {
      ...base,
      visuals: { ...base.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' },
    };
    const visible = TEMPLATE_IDS.filter((templateId) => {
      const data: SignatureData = { ...withAvatar, layout: { ...withAvatar.layout, templateId } };
      return layoutSwitches(data).accentBand.visible;
    }).sort();
    // DİKKAT: sadece "card-bordered görünür" demek yetmez — listenin TAMAMINI
    // iddia etmezsek "hepsinde görünür" diyen bir regresyon testi geçer.
    expect(visible).toEqual(['card-bordered', 'photo-first']);
  });

  it('hides the accent switch for photo-first when there is no photo yet (final review ① — the dead-switch bug)', () => {
    // Düzeltilen hata tam burada: eskiden panel koşulu
    // `hasAvatar && shouldShowAccentBand(data)` iken anahtarın görünürlüğü
    // yalnız `TEMPLATE_ACCENT_SURFACE['photo-first'] === true`'ya bakıyordu
    // — yani fotoğraf YOKKEN anahtar görünüyor ama tıklamak hiçbir şeyi
    // değiştirmiyordu (ölü anahtar). Artık ikisi de AYNI yüklemi
    // (`accentSurfaceAvailable`) okuyor, yani fotoğrafsızken anahtar hiç
    // gösterilmez.
    const s = layoutSwitches(withLayout({ templateId: 'photo-first' }));
    expect(s.accentBand.visible).toBe(false);
  });

  it('shows the monogram switch only when there is no photo', () => {
    const noPhoto = withLayout({ templateId: 'photo-first' });
    expect(layoutSwitches(noPhoto).monogram.visible).toBe(true);

    const withPhoto: SignatureData = {
      ...noPhoto,
      visuals: { ...noPhoto.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' },
    };
    expect(layoutSwitches(withPhoto).monogram.visible).toBe(false);
  });

  it('falls back to a hidden accent switch for an unknown templateId, and does not throw', () => {
    // Saved signature can carry an older or deleted template id.
    // `accentSurfaceAvailable` will not know the key; it falls back to
    // `false` — hiding the switch is safer than showing it for an unknown
    // template.
    const s = layoutSwitches(withLayout({ templateId: 'deleted-template' }));
    expect(s.accentBand.visible).toBe(false);
    // The other two switches are template-agnostic, unaffected.
    expect(s.nameSpacing.visible).toBe(true);
    expect(s.monogram.visible).toBe(true);
  });

  it('keeps the accent switch visible when the user has turned it off (the visibility trap)', () => {
    // En kolay düşülen hata: `visible`'ı `checked`'e bağlamak. Kullanıcı
    // anahtarı kapattığı anda (`accentBand: 'off'`) anahtar EKRANDAN
    // KAYBOLURSA bir daha geri açamaz. `accentSurfaceAvailable` BİLEREK
    // kullanıcının tercihine bakmaz (bkz. `capabilities.ts`) — yalnız
    // şablon + veri (avatar) sorusuna bakar.
    const cardOff = layoutSwitches(withLayout({ templateId: 'card-bordered', accentBand: 'off' }));
    expect(cardOff.accentBand.visible).toBe(true);
    expect(cardOff.accentBand.checked).toBe(false);

    const photoBase = withLayout({ templateId: 'photo-first', accentBand: 'off' });
    const photoOffWithAvatar: SignatureData = {
      ...photoBase,
      visuals: { ...photoBase.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' },
    };
    const photoOff = layoutSwitches(photoOffWithAvatar);
    expect(photoOff.accentBand.visible).toBe(true);
    expect(photoOff.accentBand.checked).toBe(false);
  });

  it('hides the accent switch for a JS prototype key masquerading as a templateId (final review ②)', () => {
    // 'deleted-template' vakası bu deliği KAÇIRIYORDU: bir sıradan nesnede
    // `constructor` gerçekten var (Object.prototype'dan miras) ve bir
    // FONKSİYONDUR — gevşek bir `?? false` ya da truthy kontrolü onu
    // yakalamaz, `accentSurfaceAvailable`'ın `===` karşılaştırması yakalar
    // (bkz. `packages/renderer/src/capabilities.ts`).
    const s = layoutSwitches(withLayout({ templateId: 'constructor' }));
    expect(s.accentBand.visible).toBe(false);
    expect(typeof s.accentBand.visible).toBe('boolean');
  });
});

describe('SWITCH_NAMES', () => {
  it('covers exactly the keys layoutSwitches returns for every SwitchName (final review ③)', () => {
    // `layoutSwitches`'in dönüş tipi `Record<SwitchName, SwitchState>` —
    // derleyici zaten döndürülen nesnenin her `SwitchName`i kapsamasını
    // zorunlu kılıyor. Bu test `SWITCH_NAMES`'in o gerçek anahtar kümesiyle
    // birebir aynı olduğunu kilitler; StyleStep.tsx'teki elle yazılmış ikinci
    // listenin yerini SWITCH_NAMES aldı, burada onu tek kaynağa (layoutSwitches'in
    // dönüş tipi) karşı doğruluyoruz.
    const s = layoutSwitches(withLayout({ templateId: 'card-bordered' }));
    expect([...SWITCH_NAMES].sort()).toEqual(Object.keys(s).sort());
  });
});

describe('switchLabel', () => {
  it('maps every SwitchName to its own dictionary text, not a neighbor’s', () => {
    // Record<SwitchName, string> derlemeyi kırar bir anahtar eksikse; bu
    // test yanlış (çapraz) eşlemeyi de yakalar — derleyici bunu göremez.
    const t = builderDict.en.steps.style.typography;
    expect(switchLabel(t, 'nameSpacing')).toBe(t.nameSpacingWide);
    expect(switchLabel(t, 'monogram')).toBe(t.monogramFallback);
    expect(switchLabel(t, 'accentBand')).toBe(t.accentBandOn);
  });

  it('covers every SwitchName without throwing', () => {
    const t = builderDict.en.steps.style.typography;
    for (const name of SWITCH_NAMES) {
      expect(() => switchLabel(t, name)).not.toThrow();
      expect(switchLabel(t, name)).toBeTypeOf('string');
    }
  });
});

describe('layoutSwitchPatch — write direction', () => {
  it('writes the string the renderer expects, never a boolean', () => {
    // Boolean yazan bir regresyon renderer'da sessizce "off değil" sayılır,
    // yani özellik kapatılamaz hâle gelir ve hiçbir şey hata vermez.
    expect(layoutSwitchPatch('monogram', false)).toEqual({ monogram: 'off' });
    expect(layoutSwitchPatch('monogram', true)).toEqual({ monogram: 'auto' });
    expect(layoutSwitchPatch('accentBand', false)).toEqual({ accentBand: 'off' });
    expect(layoutSwitchPatch('accentBand', true)).toEqual({ accentBand: 'auto' });
    expect(layoutSwitchPatch('nameSpacing', false)).toEqual({ nameSpacing: 'normal' });
    expect(layoutSwitchPatch('nameSpacing', true)).toEqual({ nameSpacing: 'wide' });
  });

  it('never leaves the field undefined — a deliberate choice must be recorded', () => {
    for (const name of ['monogram', 'accentBand', 'nameSpacing'] as const) {
      for (const checked of [true, false]) {
        const patch = layoutSwitchPatch(name, checked);
        expect(Object.keys(patch)).toEqual([name]);
        expect(patch[name]).toBeTypeOf('string');
      }
    }
  });
});

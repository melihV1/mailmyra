import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { TEMPLATE_IDS } from '@mailmyra/renderer';
import { createEmptyData } from '../app/builder/reducer';
import { layoutSwitches, layoutSwitchPatch } from '../app/builder/layout-switches';

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

  it('shows the accent switch only where the template has an accent surface', () => {
    const visible = TEMPLATE_IDS.filter(
      (templateId) => layoutSwitches(withLayout({ templateId })).accentBand.visible,
    ).sort();
    // DİKKAT: sadece "card-bordered görünür" demek yetmez — listenin TAMAMINI
    // iddia etmezsek "hepsinde görünür" diyen bir regresyon testi geçer.
    expect(visible).toEqual(['card-bordered', 'photo-first']);
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

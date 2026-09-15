import { describe, it, expect } from 'vitest';
import { renderSignature } from '../src/render';
import type { SignatureData } from '../src/types';

const base: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: { email: 'elif@voldi.net' },
  visuals: {
    brandColor: '#7b9fd3',
    iconColor: '#7b9fd3',
    textColor: '#111827',
    mutedColor: '#6b7280',
    fontFamily: 'Arial, Helvetica, sans-serif',
    avatarUrl: 'https://cdn.mailmyra.com/a.png',
  },
  social: [],
  layout: { templateId: '', size: 'medium', iconStyle: 'mono', showDividers: false },
};

// Aksan alanının YERİ şablonun kararı (spec Karar 3). Bu üçünde yeri YOK,
// dolayısıyla anahtar sessizce yok sayılmalı — çıktı iki ayarda da AYNI.
// toContain/regex DEĞİL: tam çıktı eşitliği kullanılıyor çünkü accentBand'ın
// açık/kapalı çıktısı arasındaki fark bazen tek bir stil değeri kadar küçük
// olabilir ve bir alt dizeyle yakalanamaz — burada iddia edilen şey "hiçbir
// fark yok", bu da yalnızca `toBe` ile kanıtlanabilir.
const IGNORES_THE_SWITCH = ['classic-horizontal', 'divider-columns', 'stacked-minimal'] as const;

for (const templateId of IGNORES_THE_SWITCH) {
  it(`${templateId} renders identically whichever way the accent switch is set`, () => {
    const on = renderSignature(
      { ...base, layout: { ...base.layout, templateId, accentBand: 'auto' } },
      templateId,
    );
    const off = renderSignature(
      { ...base, layout: { ...base.layout, templateId, accentBand: 'off' } },
      templateId,
    );
    expect(on).toBe(off);
  });
}

describe('cta-banner', () => {
  // Bu şablonun CTA bandı `extras.ctaLabel`a bağlıdır, aksan bandına DEĞİL.
  // İkisini karıştırmak kullanıcının CTA'sını sessizce yok ederdi.
  const withCta: SignatureData = {
    ...base,
    extras: { ctaLabel: 'Book a meeting', ctaUrl: 'https://mailmyra.com/demo' },
    layout: { ...base.layout, templateId: 'cta-banner' },
  };

  it('still draws its CTA band when the accent switch is off', () => {
    const html = renderSignature(
      { ...withCta, layout: { ...withCta.layout, accentBand: 'off' } },
      'cta-banner',
    );
    expect(html).toContain('Book a meeting');
    // NOT (guncellendi): bu sablonun CTA bandi artik zemini `bgcolor`
    // attribute'u VE `background-color` stiliyle BIRLIKTE veriyor (bkz.
    // cta-banner.test.ts, "the CTA band cell also carries a bgcolor
    // attribute..." testi) — asagidaki tutarsizlik notu artik GECERSIZ,
    // duzeltildi. Burada hala bandin CIZILDIGINI olcuyoruz (accentBand
    // anahtariyla ILGISIZ oldugunu), nasil boyandigini o baska testin isi.
    expect(html).toContain('background-color:#7b9fd3');
  });
});

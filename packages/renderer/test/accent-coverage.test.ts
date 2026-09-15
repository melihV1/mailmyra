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
// `cta-banner` dahil DÖRT şablon (final review ④): bu şablonun kendi CTA
// bandı var ve `accentBand`'ı hiç okumuyor (bkz. cta-banner.ts) — anahtar
// onda da tamamen etkisiz. Aşağıdaki `describe('cta-banner', ...)` bloğu
// CTA'nın anahtar kapalıyken HAYATTA KALDIĞINI kanıtlıyor; bu döngü FARKLI
// bir iddia kanıtlar — anahtarın çıktıyı hiç DEĞİŞTİRMEDİĞİNİ (`base`
// fixture'ında zaten CTA yok, dolayısıyla iki ayar da birebir aynı basar).
const IGNORES_THE_SWITCH = [
  'classic-horizontal',
  'divider-columns',
  'stacked-minimal',
  'cta-banner',
] as const;

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
    // Burada yalnız bandın ÇİZİLDİĞİNİ (accentBand'dan bağımsız olduğunu) ölçüyoruz — zeminin `bgcolor`+`background-color` çiftiyle nasıl boyandığı cta-banner.test.ts'in işi (final review ⑧: eski altı satırlık not var olmayan bir "aşağıdaki nota" atıf yapıyordu, tek satıra indirildi).
    expect(html).toContain('background-color:#7b9fd3');
  });
});

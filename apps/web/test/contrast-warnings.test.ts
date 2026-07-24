import { describe, it, expect } from 'vitest';
import { contrastRatio, type SignatureData } from '@mailmyra/renderer';
import { contrastWarnings } from '../app/builder/steps/StyleStep';

const LIGHT_BG = '#ffffff';
const DARK_BG = '#1a1a1a';
const TEXT_MIN = 4.5;
const MUTED_MIN = 3;

function visuals(overrides: Partial<SignatureData['visuals']>): SignatureData['visuals'] {
  return {
    brandColor: '#719ad1',
    textColor: '#1a1a1a',
    mutedColor: '#6d6e71',
    fontFamily: 'Arial, Helvetica, sans-serif',
    ...overrides,
  };
}

describe('contrastWarnings', () => {
  it('warns only for the dark background when text color equals the dark background (#1a1a1a)', () => {
    const textColor = '#1a1a1a';
    // Ön koşul: seçilen mutedColor her iki zeminde de kendi eşiğini (3)
    // rahatça geçiyor mu — testin tek ölçtüğü şey textColor davranışı olsun.
    const mutedColor = '#767676';
    expect(contrastRatio(mutedColor, LIGHT_BG)).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(contrastRatio(mutedColor, DARK_BG)).toBeGreaterThanOrEqual(MUTED_MIN);
    // Ön koşul: textColor gerçekten beyazda geçer, koyuda kalır mı?
    expect(contrastRatio(textColor, LIGHT_BG)).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(contrastRatio(textColor, DARK_BG)).toBeLessThan(TEXT_MIN);

    expect(contrastWarnings(visuals({ textColor, mutedColor }))).toEqual([
      'Metin rengi koyu zeminde (dark mode) zor okunur.',
    ]);
  });

  it('warns only for the white background when text color is a light gray (#cccccc)', () => {
    const textColor = '#cccccc';
    const mutedColor = '#767676';
    expect(contrastRatio(mutedColor, LIGHT_BG)).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(contrastRatio(mutedColor, DARK_BG)).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(contrastRatio(textColor, LIGHT_BG)).toBeLessThan(TEXT_MIN);
    expect(contrastRatio(textColor, DARK_BG)).toBeGreaterThanOrEqual(TEXT_MIN);

    expect(contrastWarnings(visuals({ textColor, mutedColor }))).toEqual([
      'Metin rengi beyaz zeminde zor okunur.',
    ]);
  });

  it('applies the looser muted threshold (3) vs the stricter text threshold (4.5) to the same mid-gray color', () => {
    // #767676: 4.5 eşiğini (metin) beyazda GEÇER, koyuda GEÇEMEZ; ama 3
    // eşiğini (ikincil metin) her iki zeminde de GEÇER. Aynı renk, alana
    // göre farklı sonuç üretir — bu test iki eşiğin gerçekten ayrı ayrı
    // uygulandığını kanıtlar (contrastRatio ile hesaplanmış, elle seçilmiş
    // "sihirli" bir sayı değil).
    const midGray = '#767676';
    // Diğer alan için varsayılan marka rengi kullanılır (#6d6e71, iki zeminde
    // de 3 eşiğini rahatça geçer — bkz. ilk iki test) böylece yalnızca
    // midGray'in davranışı ölçülür.
    const safeMuted = '#6d6e71';
    const whiteRatio = contrastRatio(midGray, LIGHT_BG);
    const darkRatio = contrastRatio(midGray, DARK_BG);
    expect(whiteRatio).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(darkRatio).toBeLessThan(TEXT_MIN);
    expect(whiteRatio).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(darkRatio).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(contrastRatio(safeMuted, LIGHT_BG)).toBeGreaterThanOrEqual(MUTED_MIN);
    expect(contrastRatio(safeMuted, DARK_BG)).toBeGreaterThanOrEqual(MUTED_MIN);

    // Metin rengi olarak: 4.5 eşiğine göre koyu zeminde başarısız -> uyarır.
    expect(contrastWarnings(visuals({ textColor: midGray, mutedColor: safeMuted }))).toEqual([
      'Metin rengi koyu zeminde (dark mode) zor okunur.',
    ]);
    // İkincil metin (muted) rengi olarak: 3 eşiğine göre her iki zeminde de
    // geçer -> hiç uyarı yok. (textColor burada #000000: beyaza karşı 4.5'i
    // geçer, ama koyuya karşı asla geçemez — bkz. not aşağıda — bu yüzden
    // yalnızca muted'e ait uyarının YOKLUĞU doğrulanır, textColor'ınki ayrı
    // filtrelenir.)
    const warningsWithMidGrayAsMuted = contrastWarnings(
      visuals({ textColor: '#000000', mutedColor: midGray }),
    );
    expect(warningsWithMidGrayAsMuted.some((w) => w.startsWith('İkincil metin rengi'))).toBe(false);
  });

  it('never fully clears the text-color check for this app’s fixed background pair (#ffffff / #1a1a1a) — documents a real constraint, not a test bug', () => {
    // Matematiksel gerçek: #ffffff (lum≈1) ve #1a1a1a (lum≈0.014) birbirinden
    // o kadar uzak ki, 4.5 eşiğini HER İKİSİNE karşı aynı anda geçen tek bir
    // renk yoktur (ayrıntı: contrastRatio(x,#fff)>=4.5 ⇒ lum(x)<=~0.183;
    // contrastRatio(x,#1a1a1a)>=4.5 ⇒ lum(x)>=~0.238 — kesişmiyor). Bu yüzden
    // textColor için "iki zeminde de uyarısız" senaryosu YOKTUR; her seçimde
    // en az bir zemin uyarısı beklenir. Siyah (yüksek beyaz kontrastı) ve
    // beyaz (yüksek koyu kontrastı) uçları bunu doğrular.
    expect(contrastRatio('#000000', LIGHT_BG)).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(contrastRatio('#000000', DARK_BG)).toBeLessThan(TEXT_MIN);
    expect(contrastRatio('#ffffff', DARK_BG)).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(contrastRatio('#ffffff', LIGHT_BG)).toBeLessThan(TEXT_MIN);

    const withBlackText = contrastWarnings(visuals({ textColor: '#000000', mutedColor: '#6d6e71' }));
    expect(withBlackText.some((w) => w.startsWith('Metin rengi'))).toBe(true);
    const withWhiteText = contrastWarnings(visuals({ textColor: '#ffffff', mutedColor: '#6d6e71' }));
    expect(withWhiteText.some((w) => w.startsWith('Metin rengi'))).toBe(true);
  });
});

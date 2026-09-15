import { describe, it, expect } from 'vitest';
import { renderSignature, TEMPLATE_IDS } from '../src/render';
import { contrastRatio } from '../src/utils/color';
import type { SignatureData } from '../src/types';

// Bu spec'in cikis noktasi: fotograf/logo/el imzasi olmadan ALTI sablon da
// sifir <img> uretiyordu, yani sablon secimi anlamsizlasiyordu. Monogram bir
// <img> DEGIL (bilerek — Outlook gorselleri engeller), o yuzden bu test
// <img> saymaz; fotografsiz ciktida bir monogram hucresinin VARLIGINI olcer.
const bare: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: { email: 'elif@voldi.net' },
  visuals: {
    brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827', mutedColor: '#6b7280',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  social: [],
  layout: { templateId: '', size: 'medium', iconStyle: 'mono', showDividers: false },
};

for (const templateId of TEMPLATE_IDS) {
  describe(`monogram coverage: ${templateId}`, () => {
    const html = renderSignature({ ...bare, layout: { ...bare.layout, templateId } }, templateId);

    it('gives a photo-less signature a visual anchor', () => {
      expect(html).toContain('bgcolor="#7b9fd3"');
      expect(html).toContain('>EK<');
    });
    it('keeps the monogram out of the markup when turned off', () => {
      const off = renderSignature(
        { ...bare, layout: { ...bare.layout, templateId, monogram: 'off' } },
        templateId,
      );
      expect(off).not.toContain('>EK<');
    });
    it('drops the monogram when a photo is supplied', () => {
      const withPhoto = renderSignature(
        { ...bare, layout: { ...bare.layout, templateId }, visuals: { ...bare.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' } },
        templateId,
      );
      expect(withPhoto).not.toContain('>EK<');
    });
    it('never lets the monogram fall below 4.5:1 contrast', () => {
      // Adini tutan test: rengi OKUYUP kontrasti gercekten hesaplar.
      // Yalnizca "siyah ya da beyaz mi" diye bakmak bu iddiayi kanitlamaz.
      // `align="center" valign="middle"` monogramCell'e ozgu (bkz.
      // monogram.ts) — sade `bgcolor="..."` yeterli değil: card-bordered'da
      // aksan bandı da AYNI marka hex'ini bgcolor olarak basıyor (bilerek,
      // bkz. accent.ts) ve HTML'de monogramdan ÖNCE geliyor, bu yüzden
      // ayraçsız bir arama bandı yakalayıp `color:` bulamadan patlardı.
      const cellMatch = html.match(/align="center" valign="middle" bgcolor="(#[0-9a-f]{6})"[^>]*style="([^"]*)"/i);
      expect(cellMatch).not.toBeNull();
      const bg = cellMatch![1]!;
      const fg = cellMatch![2]!.match(/(?:^|;)color:(#[0-9a-f]{6})/i)![1]!;
      expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
    });
  });
}

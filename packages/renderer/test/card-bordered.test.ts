import { describe, it, expect } from 'vitest';
import { cardBordered } from '../src/templates/card-bordered';
import { renderSignature } from '../src/render';
import { fixtures } from '../src/fixtures/samples';
import type { SignatureData } from '../src/types';

const full = fixtures.find((f) => f.id === 'full')!.data;
const minimal = fixtures.find((f) => f.id === 'minimal')!.data;
const longContent = fixtures.find((f) => f.id === 'longContent')!.data;

describe('cardBordered', () => {
  it('renders the full name', () => {
    expect(cardBordered(full)).toContain('Ellen Mercer');
  });
  it('renders the email as a mailto link', () => {
    expect(cardBordered(full)).toContain('href="mailto:ellen@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(cardBordered(full)).toContain('href="https://voldi.net"');
  });
  it('renders phone and mobile as tel links', () => {
    const html = cardBordered(full);
    expect(html).toContain('href="tel:+903320000000"');
    expect(html).toContain('href="tel:+905550000000"');
  });
  it('wraps the body in a bordered, padded, white card', () => {
    const html = cardBordered(full);
    // Kenarlık mutedColor'dan türetilir (#6d6e71 → %78 beyaza karışmış)
    expect(html).toContain('border-top:1px solid #dfdfe0');
    expect(html).toContain('border-right:1px solid #dfdfe0');
    expect(html).toContain('border-bottom:1px solid #dfdfe0');
    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('padding:18px');
  });
  it('gives the white card body a bgcolor attribute alongside its background-color style (Outlook Classic ignores CSS-only fills)', () => {
    const html = cardBordered(full);
    // İğne `bgcolor="#ffffff"` + aynı hücrenin stilinde 'background-color:#ffffff'
    // aranır — bu değer yalnız gövde hücresinde kullanılır, kart şeridi ve CTA
    // #7b9fd3 (brand) bastığı için çakışma riski yok.
    const cell = html.match(/<td valign="top" bgcolor="#ffffff"[^>]*>/)?.[0];
    expect(cell).toBeTruthy();
    expect(cell).toContain('background-color:#ffffff');
  });
  it('draws a brand-coloured accent stripe on the left, scaled by layout.size', () => {
    const medium = cardBordered(full);
    expect(medium).toContain('width:4px;background-color:#7b9fd3');
    const large = cardBordered({ ...full, layout: { ...full.layout, size: 'large' } });
    expect(large).toContain('width:6px;background-color:#7b9fd3');
  });
  it('gives the accent stripe a bgcolor attribute alongside its background-color style (Outlook Classic ignores CSS-only fills)', () => {
    const html = cardBordered(full);
    // DİKKAT: `bgcolor="#7b9fd3"` tek başına belirsiz — aynı değeri aksan
    // bandı (colspan="2") ve CTA butonu (align="center") de basar. Şeridi
    // KENDİ genişliğiyle (`width="4"`, medium boy) izole ederiz; bu üçlü
    // yalnız şeritte birlikte geçer.
    const cell = html.match(/<td bgcolor="#7b9fd3" width="4"[^>]*>/)?.[0];
    expect(cell).toBeTruthy();
    expect(cell).toContain('background-color:#7b9fd3');
  });
  it('pins an explicit card width per size, always under the 600px cap', () => {
    // Word max-width tanımadığı için piksel width ŞART (yüzde iç tablolar
    // aksi hâlde okuma bölmesine yayılır).
    for (const [size, expected] of [
      ['small', 460],
      ['medium', 520],
      ['large', 580],
    ] as const) {
      const html = cardBordered({ ...full, layout: { ...full.layout, size } });
      expect(html).toContain(`width="${expected}"`);
      expect(html).toContain(`max-width:${expected}px`);
      expect(expected).toBeLessThanOrEqual(600);
    }
  });
  it('puts the logo in the header, to the right of the name (not under the avatar)', () => {
    const html = cardBordered(full);
    // DİKKAT: 'Ellen Mercer' avatarın alt metninde de geçiyor — ad satırının
    // gerçek yerini kapanış etiketiyle ararız.
    const nameAt = html.indexOf('>Ellen Mercer</span>');
    expect(nameAt).toBeGreaterThan(-1);
    expect(html.indexOf('avatar.png')).toBeLessThan(nameAt);
    expect(html.indexOf('logo.png')).toBeGreaterThan(nameAt);
    // Logo hücresi sağa yaslı, img height taşımaz (oran bilinmiyor)
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
    expect(html).toContain('align="right"');
  });
  it('lays contact details out in a two-column grid', () => {
    const html = cardBordered(full);
    // phone|mobile ve email|website ikişerli → iki adet 50% hücre çifti
    const halfCells = html.match(/width="50%"/g) ?? [];
    expect(halfCells).toHaveLength(4);
  });
  it('spans a lone contact item across both columns instead of leaving an empty cell', () => {
    // minimal fixture: yalnız e-posta → tek öğe
    const html = cardBordered(minimal);
    expect(html).toContain('colspan="2"');
    expect(html).not.toContain('width="50%"');
    expect(html).not.toContain('<td></td>');
  });
  it('renders no <img> at all when there is no avatar, logo or hand signature', () => {
    const noImg = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: undefined,
        logoUrl: undefined,
        handSignatureUrl: undefined,
      },
    };
    expect(cardBordered(noImg)).not.toContain('<img');
  });
  it('uses a border-top on the contact block as its divider, only when showDividers', () => {
    const on = cardBordered({ ...full, layout: { ...full.layout, showDividers: true } });
    const off = cardBordered({ ...full, layout: { ...full.layout, showDividers: false } });
    // Kartın kendi kenarlığı 3 kez geçer; ayraç açıkken border-top bir fazla olur.
    const count = (html: string) => (html.match(/border-top:1px solid #dfdfe0/g) ?? []).length;
    expect(count(on)).toBe(count(off) + 1);
  });
  it('draws no divider when there is no contact block at all', () => {
    const identityOnly = {
      ...full,
      contact: {},
      extras: undefined,
      layout: { ...full.layout, showDividers: true, accentBand: 'off' as const },
    };
    const html = cardBordered(identityOnly);
    // Bandi acikca kapatiyoruz: bu test iletisim bloğu yokken fazladan
    // ayraç eklenmediğini doğruluyor, bandın kendi üst kenarlığı yutma
    // davranışıyla (bkz. accent band testleri) karışmasın.
    // Yalnız kartın kendi üst kenarlığı kalır
    expect((html.match(/border-top:1px solid #dfdfe0/g) ?? []).length).toBe(1);
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = cardBordered(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const anchors = cardBordered(full).match(/<a [^>]*>/gi) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toContain('text-decoration:none');
    }
  });
  it('scales the name font size with layout.size', () => {
    const small = cardBordered({ ...full, layout: { ...full.layout, size: 'small' } });
    const large = cardBordered({ ...full, layout: { ...full.layout, size: 'large' } });
    expect(small).toContain('font-size:15px');
    expect(large).toContain('font-size:21px');
  });
  it('renders long content without dropping fields', () => {
    const html = cardBordered(longContent);
    expect(html).toContain('Alexandra Katherine Fitzgerald-Whitmore');
    expect(html).toContain('Voldi Creative Advertising &amp; Promotion Services Inc.');
    expect(html).toContain('please notify the sender and delete the message');
    expect(html).toContain('max-width:520px');
  });
  it('keeps the hand signature inside the card and the disclaimer outside it', () => {
    const html = cardBordered(full);
    const cardEnd = html.lastIndexOf('</table></td></tr>');
    expect(html.indexOf('hand-signature.png')).toBeLessThan(cardEnd);
    expect(html.indexOf('This e-mail and any attachments are confidential')).toBeGreaterThan(
      html.indexOf('hand-signature.png'),
    );
  });
  it('still renders the disclaimer when there is no hand signature', () => {
    const noSig = { ...full, visuals: { ...full.visuals, handSignatureUrl: undefined } };
    const html = cardBordered(noSig);
    expect(html).toContain('This e-mail and any attachments are confidential');
    expect(html).not.toContain('hand-signature.png');
  });
  it('renders the CTA with a readable label colour on the brand background', () => {
    const html = cardBordered(full);
    expect(html).toContain('href="https://voldi.net/meeting"');
    expect(html).toContain('Book a meeting');
    // readableTextOn(#7b9fd3) → siyah (daha yüksek kontrast, bkz. color.test.ts).
    // Anchor'ı kendi parçası üzerinden doğrula: kartın gövdesi zaten
    // 'background-color:#ffffff' taşıyor ve 'color:#ffffff' onun alt dizesi —
    // tüm html üzerinde arasak yanlışlıkla eşleşir (bkz. task-1-report.md).
    const ctaAnchor = html.match(/<a[^>]*>Book a meeting<\/a>/i)![0];
    expect(ctaAnchor).toContain('color:#000000');
    const light = cardBordered({
      ...full,
      visuals: { ...full.visuals, brandColor: '#ffee00' },
    });
    const lightAnchor = light.match(/<a[^>]*>Book a meeting<\/a>/i)![0];
    expect(lightAnchor).toContain('color:#000000');
  });
  it('gives the CTA button cell a bgcolor attribute alongside its background-color style (Outlook Classic ignores CSS-only fills)', () => {
    const html = cardBordered(full);
    // İğne, CTA'nın KENDİ `href`'inin hemen ardından gelen <td>'yi hedefler —
    // aksan bandı ve şerit de AYNI #7b9fd3'ü basıyor (bkz. yukarıdaki testler),
    // bu yüzden değeri bağlamsız arasak yanlış hücreyi de doğrulamış oluruz.
    const m = html.match(/<td([^>]*)><a href="https:\/\/voldi\.net\/meeting"/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('bgcolor="#7b9fd3"');
  });
  it('omits the CTA when only one of label/url is set', () => {
    const half = { ...full, extras: { ...full.extras, ctaUrl: undefined } };
    expect(cardBordered(half)).not.toContain('Book a meeting');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = cardBordered(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = cardBordered(full, { iconBaseUrl: 'https://cdn.example.com/' });
    const iconImgs = html.match(/<img[^>]*\/icons\/[^>]*>/gi) ?? [];
    expect(iconImgs).toHaveLength(3);
    for (const img of iconImgs) {
      expect(img).toContain('width="24"');
      expect(img).toContain('height="24"');
    }
    expect(html).not.toContain('.com//icons/');
    expect(html).toContain('/icons/mono-7b9fd3/linkedin.png');
    expect(html).not.toContain('>LinkedIn</a>');
  });
  it('keys outline and mono icon paths off iconColor, not brandColor', () => {
    const custom = {
      ...full,
      visuals: { ...full.visuals, brandColor: '#ff0000', iconColor: '#123456' },
      layout: { ...full.layout, iconStyle: 'outline' as const },
    };
    const html = cardBordered(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('renders address and custom fields full width, below the grid', () => {
    const html = cardBordered(full);
    expect(html).toContain('Selçuklu, Konya, Turkey');
    expect(html).toContain('Portfolio: ');
    expect(html.indexOf('Selçuklu')).toBeGreaterThan(html.indexOf('mailto:ellen@voldi.net'));
  });
  it('drops the whole social row when there are no social links', () => {
    const html = cardBordered({ ...full, social: [] });
    expect(html).not.toContain('LinkedIn');
    expect(html).not.toContain('/icons/');
  });
});

describe('card-bordered monogram', () => {
  // SignatureData ile ACIKCA tiplenir: annotation olmadan `fontFamily`
  // `WebSafeFont` birlesimi yerine `string`e genisliyor ve `tsc --noEmit`
  // kiriliyor (vitest'in esbuild donusumu bunu yakalamaz, typecheck yakalar).
  const noPhoto: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827', mutedColor: '#6b7280',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: 'card-bordered', size: 'medium' as const, iconStyle: 'mono' as const, showDividers: false },
  };

  it('shows a monogram when there is no photo', () => {
    const html = renderSignature(noPhoto, 'card-bordered');
    expect(html).toContain('bgcolor="#7b9fd3"');
    expect(html).toContain('>EK<');
  });
  it('shows the photo and no monogram when a photo exists', () => {
    const html = renderSignature(
      { ...noPhoto, visuals: { ...noPhoto.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' } },
      'card-bordered',
    );
    expect(html).toContain('<img');
    expect(html).not.toContain('>EK<');
  });
  it('shows nothing when the monogram is turned off', () => {
    const html = renderSignature(
      { ...noPhoto, layout: { ...noPhoto.layout, monogram: 'off' as const } },
      'card-bordered',
    );
    expect(html).not.toContain('>EK<');
  });
  it('uses this template medium avatar box', () => {
    expect(renderSignature(noPhoto, 'card-bordered')).toContain('height="60"');
  });
});

describe('card-bordered name spacing', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: 'card-bordered', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  it('adds no tracking by default', () => {
    expect(renderSignature(base, 'card-bordered')).not.toContain('letter-spacing:0.04em');
  });
  it('opens the tracking when asked', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, 'card-bordered'),
    ).toContain('letter-spacing:0.04em');
  });
  // Versal BIRAKILDI: hicbir ayar ismin harflerine dokunmaz. Bu testin
  // kirmizi olmasi, birinin buyuk harfi geri getirdigi anlamina gelir.
  it('never changes the letters of the name', () => {
    for (const ns of [undefined, 'normal', 'wide'] as const) {
      const html = renderSignature({ ...base, layout: { ...base.layout, nameSpacing: ns } }, 'card-bordered');
      expect(html).toContain('>Elif Kaya<');
      expect(html).not.toContain('ELIF');
      expect(html).not.toContain('ELİF');
    }
  });
  it('never uses text-transform', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, 'card-bordered'),
    ).not.toMatch(/text-transform/i);
  });
});

describe('card-bordered accent band', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: 'card-bordered', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  // DIKKAT: `bgcolor="#7b9fd3"` bandin imzasi DEGILDIR — bu fixture'da avatar
  // yok, dolayisiyla monogram tetikleniyor ve AYNI bgcolor'u basiyor. Bandi
  // ondan ayiran sey cokertilmis satir kutusu (`font-size:1px` +
  // `line-height:1px`), ki monogram onu hicbir zaman uretmez.
  it('draws the band by default', () => {
    const html = renderSignature(base, 'card-bordered');
    expect(html).toContain('font-size:1px');
    expect(html).toContain('line-height:1px');
    expect(html).toContain('height:8px');
  });
  it('drops the band when turned off', () => {
    const html = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'card-bordered');
    // NOT: `font-size:1px` burada guvenilir bir ayrac DEGIL — kartin sol
    // dikey seridi (bandla ILGISIZ, bu task'tan ONCE var olan kod) AYNI
    // Outlook cokertme desenini (font-size:1px + line-height:1px) zaten
    // kosulsuz basiyor. Bandin KENDINE ozgu imzasi yalniz `height:8px`
    // (boy olcegine gore degisen satir yuksekligi) — baska hicbir yerde
    // uretilmiyor.
    expect(html).not.toContain('height:8px');
  });
  it('drops the card top border when the band replaces it', () => {
    const withBand = renderSignature(base, 'card-bordered');
    const without = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'card-bordered');
    expect(without).toContain('border-top:1px solid');
    expect(withBand).not.toContain('border-top:1px solid');
  });
  // `colspan: 2` planin "SARTTIR" dedigi sey ve YALNIZ Outlook'ta bozulur:
  // bant satiri tek hucreli, kart satiri iki hucreli (serit + govde). Colspan
  // dusunce Word bandi ilk kolonun (birkac px'lik seridin) genisligine
  // sikistirir. accent.test.ts yalnizca ilkeli dogruluyor (verilirse basiyor);
  // bu test CAGRI YERINI kilitler — biri argumani silerse burasi kirmizi olur.
  it('spans both columns of the card', () => {
    const html = renderSignature(base, 'card-bordered');
    // `font-size:1px` STIL icinde; `colspan` attribute olarak ondan ONCE
    // geliyor (cell() sirasi: align, valign, bgcolor, height, width, colspan,
    // style). Bu yuzden bandin <tr>'sinin BASINA geri sayilir.
    const i = html.indexOf('font-size:1px');
    const band = html.slice(html.lastIndexOf('<tr', i), html.indexOf('</tr>', i));
    expect(band).toContain('colspan="2"');
  });

  it('keeps the logo out of the band', () => {
    const html = renderSignature(
      { ...base, visuals: { ...base.visuals, logoUrl: 'https://cdn.mailmyra.com/l.png' } },
      'card-bordered',
    );
    const band = html.slice(html.indexOf('font-size:1px'));
    const bandEnd = band.indexOf('</tr>');
    expect(band.slice(0, bandEnd)).not.toMatch(/<img/i);
  });
});

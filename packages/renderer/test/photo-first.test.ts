import { describe, it, expect } from 'vitest';
import { photoFirst } from '../src/templates/photo-first';
import { renderSignature } from '../src/render';
import { fixtures } from '../src/fixtures/samples';
import type { SignatureData } from '../src/types';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('photoFirst', () => {
  // ---- Canon coverage (aynı sözleşme, diğer üç şablonla birebir) ----------

  it('renders the full name', () => {
    expect(photoFirst(full)).toContain('Ellen Mercer');
  });
  it('renders the email as a mailto link', () => {
    expect(photoFirst(full)).toContain('href="mailto:ellen@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(photoFirst(full)).toContain('href="https://voldi.net"');
  });
  it('omits any <img> when no avatar, logo, or hand signature is set', () => {
    const noImg = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: undefined,
        logoUrl: undefined,
        handSignatureUrl: undefined,
      },
    };
    expect(photoFirst(noImg)).not.toContain('<img');
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = photoFirst(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const html = photoFirst(full);
    const anchors = html.match(/<a [^>]*>/gi) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toContain('text-decoration:none');
    }
  });
  it('renders the hand signature next to the disclaimer in the bottom row', () => {
    const withSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
    };
    const html = photoFirst(withSig);
    const sigImg = html.match(/<img[^>]*sig\.png[^>]*>/i)![0];
    expect(sigImg).toContain('width="150"');
    expect(html).toContain('This e-mail and any attachments are confidential');
  });
  it('renders the hand signature row even without a disclaimer', () => {
    const noDisc = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
      extras: { ...full.extras, disclaimer: undefined },
    };
    expect(photoFirst(noDisc)).toContain('sig.png');
  });
  it('keeps the plain disclaimer behavior when there is no hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = photoFirst(noSig);
    expect(html).toContain('This e-mail and any attachments are confidential');
    expect(html).not.toContain('sig.png');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = photoFirst(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = photoFirst(full, { iconBaseUrl: 'https://cdn.example.com' });
    // full fixture: linkedin + instagram + behance, iconStyle 'mono', brand #7b9fd3
    expect(html).toContain('src="https://cdn.example.com/icons/mono-7b9fd3/linkedin.png"');
    expect(html).toContain('src="https://cdn.example.com/icons/mono-7b9fd3/instagram.png"');
    expect(html).toContain('src="https://cdn.example.com/icons/mono-7b9fd3/behance.png"');
    const iconImgs = html.match(/<img[^>]*\/icons\/[^>]*>/gi) ?? [];
    expect(iconImgs).toHaveLength(3);
    for (const img of iconImgs) {
      expect(img).toContain('width="24"');
      expect(img).toContain('height="24"');
      expect(img).toContain('border="0"');
    }
    expect(html).not.toContain('>LinkedIn</a>');
  });
  it('maps icon styles to their variant paths (filled static, outline/mono color-keyed)', () => {
    const filled = photoFirst(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');

    const outline = photoFirst(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline-7b9fd3/linkedin.png');

    const mono = photoFirst(
      { ...full, layout: { ...full.layout, iconStyle: 'mono' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(mono).toContain('/icons/mono-7b9fd3/linkedin.png');
  });
  it('keys outline and mono paths off iconColor, independently of brandColor', () => {
    const custom = {
      ...full,
      visuals: { ...full.visuals, brandColor: '#ff0000', iconColor: '#123456' },
      layout: { ...full.layout, iconStyle: 'outline' as const },
    };
    const html = photoFirst(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('strips a trailing slash from iconBaseUrl', () => {
    const html = photoFirst(full, { iconBaseUrl: 'https://cdn.example.com/' });
    expect(html).toContain('src="https://cdn.example.com/icons/');
    expect(html).not.toContain('.com//icons/');
  });
  it('CTA pair contract: label alone renders no button, both label+url render brand background with readable text', () => {
    const labelOnly = photoFirst({
      ...full,
      extras: { ...full.extras, ctaLabel: 'Book a meeting', ctaUrl: undefined },
    });
    expect(labelOnly).not.toContain('Book a meeting');

    const both = photoFirst(full);
    expect(both).toContain('Book a meeting');
    expect(both).toContain('background-color:#7b9fd3');
    // readableTextOn(#7b9fd3) → siyah (daha yüksek kontrast). Anchor'ın
    // kendi parçası üzerinden doğrula (bkz. card-bordered.test.ts) — `full`
    // fixture'ı fotoğraflı, ama monogram hücresi de `color:#000000` yayar;
    // tüm belgede arasak fotoğrafsız bir fixture'a geçildiğinde yanlış
    // sebeple geçen bir test olurduk.
    const ctaAnchor = both.match(/<a[^>]*>Book a meeting<\/a>/i)![0];
    expect(ctaAnchor).toContain('color:#000000');
  });
  it('gives the CTA button cell a bgcolor attribute alongside its background-color style (Outlook Classic ignores CSS-only fills)', () => {
    const html = photoFirst(full);
    // İğne CTA'nın KENDİ `href`'inin hemen ardından gelen <td>'yi hedefler —
    // aynı #7b9fd3 aksan çubuğundan (font-size:2px) ve avatar panelinden
    // (utils/accent.ts, kapsam dışı) de gelebiliyor; href bağlamı üçünü
    // ayırır.
    const m = html.match(/<td([^>]*)><a href="https:\/\/voldi\.net\/meeting"/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('bgcolor="#7b9fd3"');
  });
  it('avatar and logo are independent left/bottom slots (logo-only fixture has no avatar <img>)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = photoFirst(logoOnly);
    expect(html).toContain('src="https://cdn.test/logo.png"');
    const imgs = html.match(/<img[^>]*>/gi) ?? [];
    for (const img of imgs) {
      expect(img).not.toMatch(/avatar/i);
    }
  });
  it('renders avatar alone when there is no logo (independent slots)', () => {
    const avatarOnly = {
      ...full,
      visuals: { ...full.visuals, logoUrl: undefined, avatarUrl: 'https://cdn.test/avatar.png' },
    };
    const html = photoFirst(avatarOnly);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
  });

  // ---- Template-specific mandatory assertions (brief §1.2) ----------------

  it('avatar <img> carries border-radius:50% (Outlook degrades to a square — accepted)', () => {
    const html = photoFirst(full, { iconBaseUrl: undefined });
    const avatarImg = html.match(/<img[^>]*avatar\.png[^>]*>/i)![0];
    expect(avatarImg).toContain('border-radius:50%');
  });

  it('avatar width is size-scaled: 88/104/120 px for small/medium/large', () => {
    const small = photoFirst({ ...full, layout: { ...full.layout, size: 'small' } });
    const medium = photoFirst({ ...full, layout: { ...full.layout, size: 'medium' } });
    const large = photoFirst({ ...full, layout: { ...full.layout, size: 'large' } });

    const avatarImg = (html: string) => html.match(/<img[^>]*avatar\.png[^>]*>/i)![0];

    expect(avatarImg(small)).toContain('width="88"');
    expect(avatarImg(medium)).toContain('width="104"');
    expect(avatarImg(large)).toContain('width="120"');
  });

  it('logo appears AFTER avatar in the output (small bottom row) and carries NO height attribute', () => {
    const both = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: 'https://cdn.test/avatar.png',
        logoUrl: 'https://cdn.test/logo.png',
      },
    };
    const html = photoFirst(both);
    expect(html.indexOf('logo.png')).toBeGreaterThan(html.indexOf('avatar.png'));
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
  });

  it('name font-size is larger than the title font-size', () => {
    const html = photoFirst(full);
    const nameSpan = html.match(/<span[^>]*>Ellen Mercer<\/span>/i)![0];
    const nameSize = Number(nameSpan.match(/font-size:(\d+)px/i)![1]);
    const titleSpan = html.match(
      /<span[^>]*>Founder &amp; Creative Director[^<]*<\/span>/i,
    )![0];
    const titleSize = Number(titleSpan.match(/font-size:(\d+)px/i)![1]);
    expect(nameSize).toBeGreaterThan(titleSize);
  });

  it('title is rendered in brandColor (not mutedColor)', () => {
    const html = photoFirst(full);
    const titleSpan = html.match(
      /<span[^>]*>Founder &amp; Creative Director[^<]*<\/span>/i,
    )![0];
    expect(titleSpan).toContain('color:#7b9fd3');
  });

  it('adds a 40px brandColor accent bar under the name block only when showDividers is true', () => {
    const on = photoFirst({
      ...full,
      layout: { ...full.layout, showDividers: true },
    });
    const off = photoFirst({
      ...full,
      layout: { ...full.layout, showDividers: false },
    });
    expect(on).toContain('width="40"');
    expect(on).toContain('background-color:#7b9fd3');
    expect(off).not.toContain('width="40"');
  });

  it('gives the accent bar a bgcolor attribute alongside its background-color style (Outlook Classic ignores CSS-only fills)', () => {
    const html = photoFirst({ ...full, layout: { ...full.layout, showDividers: true } });
    // DİKKAT: `bgcolor="#7b9fd3"` bu şablonda ÜÇ kaynaktan gelebilir — aksan
    // çubuğu, avatar sütunundaki renk paneli (utils/accent.ts, kapsam dışı)
    // ve CTA butonu. Çubuğu KENDİ imzasıyla (`font-size:2px` — panelde ve
    // CTA'da hiç yok, yalnız çubuğun çökertilmiş 2px satır kutusunda var)
    // izole ederiz.
    const cell = html.match(/<td bgcolor="#7b9fd3"[^>]*font-size:2px[^>]*>/)?.[0];
    expect(cell).toBeTruthy();
    expect(cell).toContain('background-color:#7b9fd3');
  });

  it('scales the name font size with layout.size (one step larger than the other templates)', () => {
    const small = photoFirst({
      ...full,
      layout: { ...full.layout, size: 'small' },
    });
    const large = photoFirst({
      ...full,
      layout: { ...full.layout, size: 'large' },
    });
    expect(small).toContain('font-size:18px');
    expect(large).toContain('font-size:26px');
  });

  it('root table carries a literal pixel width per size — max-width alone is not enough (Outlook Word engine ignores CSS max-width, and this template wraps the logo row and social-icon table in width="100%" nested content that would expand to the full reading pane without a bounded pixel ancestor)', () => {
    const rootWidth = (html: string) => html.match(/^<table[^>]*>/i)![0];

    const small = photoFirst({ ...full, layout: { ...full.layout, size: 'small' } });
    const medium = photoFirst({ ...full, layout: { ...full.layout, size: 'medium' } });
    const large = photoFirst({ ...full, layout: { ...full.layout, size: 'large' } });

    expect(rootWidth(small)).toContain('width="480"');
    expect(rootWidth(medium)).toContain('width="540"');
    expect(rootWidth(large)).toContain('width="600"');

    // max-width stays as a secondary hint for clients that DO honor it —
    // the literal width attribute is what actually bounds Outlook Classic.
    expect(rootWidth(small)).toContain('max-width:480px');
    expect(rootWidth(medium)).toContain('max-width:540px');
    expect(rootWidth(large)).toContain('max-width:600px');
  });
});

describe('photo-first monogram', () => {
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
    layout: { templateId: 'photo-first', size: 'medium' as const, iconStyle: 'mono' as const, showDividers: false },
  };

  it('shows a monogram when there is no photo', () => {
    const html = renderSignature(noPhoto, 'photo-first');
    expect(html).toContain('bgcolor="#7b9fd3"');
    expect(html).toContain('>EK<');
  });
  it('shows the photo and no monogram when a photo exists', () => {
    const html = renderSignature(
      { ...noPhoto, visuals: { ...noPhoto.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' } },
      'photo-first',
    );
    expect(html).toContain('<img');
    expect(html).not.toContain('>EK<');
  });
  it('shows nothing when the monogram is turned off', () => {
    const html = renderSignature(
      { ...noPhoto, layout: { ...noPhoto.layout, monogram: 'off' as const } },
      'photo-first',
    );
    expect(html).not.toContain('>EK<');
  });
  it('uses this template medium avatar box', () => {
    expect(renderSignature(noPhoto, 'photo-first')).toContain('height="104"');
  });
  it('mirrors this template round avatar with a round monogram', () => {
    expect(renderSignature(noPhoto, 'photo-first')).toContain('border-radius:50%');
  });
  it('keeps the logo spanning both columns when a monogram replaces the photo', () => {
    const html = renderSignature(
      { ...noPhoto, visuals: { ...noPhoto.visuals, logoUrl: 'https://cdn.mailmyra.com/l.png' } },
      'photo-first',
    );
    expect(html).toContain('colspan="2"');
  });
});

describe('photo-first name spacing', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: 'photo-first', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  it('adds no tracking by default', () => {
    expect(renderSignature(base, 'photo-first')).not.toContain('letter-spacing:0.04em');
  });
  it('opens the tracking when asked', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, 'photo-first'),
    ).toContain('letter-spacing:0.04em');
  });
  // Versal BIRAKILDI: hicbir ayar ismin harflerine dokunmaz. Bu testin
  // kirmizi olmasi, birinin buyuk harfi geri getirdigi anlamina gelir.
  it('never changes the letters of the name', () => {
    for (const ns of [undefined, 'normal', 'wide'] as const) {
      const html = renderSignature({ ...base, layout: { ...base.layout, nameSpacing: ns } }, 'photo-first');
      expect(html).toContain('>Elif Kaya<');
      expect(html).not.toContain('ELIF');
      expect(html).not.toContain('ELİF');
    }
  });
  it('never uses text-transform', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, 'photo-first'),
    ).not.toMatch(/text-transform/i);
  });
});

describe('photo-first accent panel', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
      avatarUrl: 'https://cdn.mailmyra.com/a.png',
    },
    social: [],
    layout: { templateId: 'photo-first', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  it('paints the avatar column by default', () => {
    expect(renderSignature(base, 'photo-first')).toContain('bgcolor="#7b9fd3"');
  });
  it('leaves the column unpainted when turned off', () => {
    const html = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'photo-first');
    expect(html).not.toContain('bgcolor="#7b9fd3"');
  });
  it('does NOT paint the column when a monogram stands in for the photo (final review ①: panel is for a real photo only)', () => {
    // DIKKAT: monogramin KENDISI de `bgcolor="#7b9fd3"` basiyor, yani varligi
    // olcmek tek basina hicbir sey kanitlamaz — dogru olcum SAYIMDIR. Panel
    // artik monogramla ASLA aynı hücreye eklenmiyor (①): iki hücre de fotoğraf
    // olmadığı için panelsiz, ikisinde de SAYI 1 (yalnız monogramın kendi
    // bgcolor'u). Bu testin adı önceki turda "paints the column..." idi ve
    // SAYI 2 bekliyordu — o davranış BİLEREK tersine çevrildi (bkz.
    // photo-first.ts panel yorumu): panel + monogram aynı `brand` hex'ini
    // basınca fotoğrafsız imzada disk silueti düz bir renk bloğunda kayboluyordu.
    const { avatarUrl: _drop, ...noAvatar } = base.visuals;
    const say = (h: string) => (h.match(/bgcolor="#7b9fd3"/g) ?? []).length;
    const on = renderSignature({ ...base, visuals: noAvatar }, 'photo-first');
    const off = renderSignature(
      { ...base, visuals: noAvatar, layout: { ...base.layout, accentBand: 'off' } },
      'photo-first',
    );
    expect(say(off)).toBe(1);
    expect(say(on)).toBe(1);
  });

  // final review ② (IKI turda): once padding-right boyanan hucrenin icindeydi
  // (oluk marka rengine boyaniyordu), sonra padding tamamen kaldirildi ve bu
  // sefer panel TAM fotografin ayak izi oldu — Outlook Classic border-radius'i
  // yok saydigi icin kisa imzalarda HIC gorunmuyordu. Cozum simetrik cerceve.
  //
  // DIKKAT (igne): asagidaki iddialar sol/sag hucrelerin KENDI acilis
  // etiketlerine cipalanir. Belge geneline `toContain('padding:8px')` demek
  // ISE YARAMAZ — bu sablonda baska hucreler de padding basiyor ve iddia
  // ozellik olmasa da gecebilir (bu projede ayni tuzaga bes kez dusuldu).
  it.each([
    { size: 'small' as const, avatar: 88, gap: 12, frame: 6 },
    { size: 'medium' as const, avatar: 104, gap: 16, frame: 8 },
    { size: 'large' as const, avatar: 120, gap: 20, frame: 10 },
  ])('frames the photo symmetrically at $size without letting the panel grow past the tile', ({ size, avatar, gap, frame }) => {
    const html = renderSignature({ ...base, layout: { ...base.layout, size } }, 'photo-first');

    // 🔴 YUKSEKLIK KILIDI. Panel bir IC TABLO hucresidir; DIS hucrenin zemini
    // DEGILDIR. Renk dis hucreye verilirse zemin SATIR YUKSEKLIGI boyunca
    // uzar ve panel, kare tile olmaktan cikip tam boy marka sutununa doner
    // (Apple Mail'de olculdu). Dis hucrede bgcolor GORULURSE bu geri gelmis
    // demektir.
    const outer = html.match(/<td valign="top" width="\d+"[^>]*>/)![0];
    expect(outer).not.toContain('bgcolor');
    expect(outer).not.toContain('background-color');

    // Dis hucrenin `width`'i ICERIK genisligidir ve icerik artik IC TABLO,
    // yani cerceveyi zaten iceriyor.
    expect(outer).toContain(`width="${avatar + frame * 2}"`);
    // Olugun disardaki, boyanmayan kismi.
    expect(outer).toContain(`padding-right:${gap - frame}px`);

    // Ic panel hucresi: dort yonlu simetrik cerceve + icerik genisligi.
    const inner = html.match(/<td bgcolor="#[0-9a-f]{6}" width="\d+"[^>]*>/i)![0];
    expect(inner).toContain(`width="${avatar}"`);
    // DIKKAT: `toContain('padding:8px')` YETMEZ — `padding:8px 8px 8px 0`
    // (solda cerceve YOK) o alt dizeyi ICERIR. Bildirim sinirlarini esletiyoruz,
    // ve tek yonlu override'lari ayrica yasakliyoruz.
    expect(inner).toMatch(new RegExp(`(^|;|")padding:${frame}px(;|")`));
    expect(inner).not.toMatch(/padding-(top|right|bottom|left)\s*:/);
    // Word CSS background-color'a guvenmez: bgcolor ile CIFT basilmali.
    expect(inner).toContain('background-color:#');

    // Sag hucre HICBIR halde ek stil tasimaz — oluk tamamen sol taraftadir.
    const right = html.match(/<td valign="top">/);
    expect(right).toBeTruthy();

    // Degismez: cerceve + boyanmayan oluk = panel KAPALIYKEN ki bosluk, yani
    // panel acilip kapandiginda avatar ile metin arasi mesafe SABIT kalir.
    // Sagdaki degeri sabit yazmak yerine panel-kapali ciktidan OLCUYORUZ —
    // `expect(frame + (gap - frame)).toBe(gap)` bir totolojidir.
    const off = renderSignature(
      { ...base, layout: { ...base.layout, size, accentBand: 'off' } },
      'photo-first',
    );
    const offLeft = off.match(/<td valign="top" width="\d+" style="padding-right:[^"]*">/)![0];
    const offGap = Number(offLeft.match(/padding-right:(\d+)px/)![1]);
    const onFrame = Number(inner.match(/padding:(\d+)px/)![1]);
    const onGutter = Number(outer.match(/padding-right:(\d+)px/)![1]);
    expect(onFrame + onGutter).toBe(offGap);
  });

  it('keeps the panel-off gap exactly where it always was: padding-right on the left cell, nothing on the right (final review ②, byte-identical guard)', () => {
    const off = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'photo-first');
    expect(off).toContain('<td valign="top" width="104" style="padding-right:16px">');
    expect(off).not.toContain('padding-left:16px');
    // Fotografsiz (monogram) dalinda da panel hic uygulanmadigi icin AYNI
    // yerlesim gecerli — bkz. yukaridaki "does NOT paint the column" testi.
    const { avatarUrl: _drop, ...noAvatar } = base.visuals;
    const monogram = renderSignature({ ...base, visuals: noAvatar }, 'photo-first');
    expect(monogram).toContain('<td valign="top" width="104" style="padding-right:16px">');
    expect(monogram).not.toContain('padding-left:16px');
  });
  // Bu vakada monogram da kapali, yani `bgcolor` hicbir kaynaktan gelmemeli —
  // varligi olcmek burada guvenli.
  it('paints nothing when the column is empty', () => {
    const { avatarUrl: _drop, ...noAvatar } = base.visuals;
    const html = renderSignature(
      { ...base, visuals: noAvatar, identity: { fullName: '   ' }, layout: { ...base.layout, monogram: 'off' } },
      'photo-first',
    );
    expect(html).not.toContain('bgcolor="#7b9fd3"');
  });
  it('keeps the logo out of the painted column', () => {
    const html = renderSignature(
      { ...base, visuals: { ...base.visuals, logoUrl: 'https://cdn.mailmyra.com/l.png' } },
      'photo-first',
    );
    const i = html.indexOf('bgcolor="#7b9fd3"');
    const cellEnd = html.indexOf('</td>', i);
    expect(html.slice(i, cellEnd)).not.toContain('l.png');
  });
});

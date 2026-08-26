import { describe, it, expect } from 'vitest';
import { dividerColumns } from '../src/templates/divider-columns';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('dividerColumns', () => {
  it('renders the full name', () => {
    expect(dividerColumns(full)).toContain('Ellen Mercer');
  });
  it('renders the email as a mailto link', () => {
    expect(dividerColumns(full)).toContain('href="mailto:ellen@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(dividerColumns(full)).toContain('href="https://voldi.net"');
  });
  it('omits the image column when no avatar or logo is set', () => {
    const noImg = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: undefined,
        logoUrl: undefined,
        // handSignatureUrl belirtilmez — bu görsel sol yerine bottom
        // hand-sig/disclaimer desenine ait (bkz. aşağıdaki testler). Sol
        // kolon testini o özellikten izole etmek için burada da kapatılır.
        handSignatureUrl: undefined,
      },
    };
    expect(dividerColumns(noImg)).not.toContain('<img');
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = dividerColumns(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const html = dividerColumns(full);
    const anchors = html.match(/<a [^>]*>/gi) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toContain('text-decoration:none');
    }
  });
  it('scales the name font size with layout.size', () => {
    const small = dividerColumns({
      ...full,
      layout: { ...full.layout, size: 'small' },
    });
    const large = dividerColumns({
      ...full,
      layout: { ...full.layout, size: 'large' },
    });
    expect(small).toContain('font-size:15px');
    expect(large).toContain('font-size:22px');
  });
  it('renders avatar and logo together as two stacked images in the left column, logo ABOVE avatar', () => {
    const both = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: 'https://cdn.test/avatar.png',
        logoUrl: 'https://cdn.test/logo.png',
      },
    };
    const html = dividerColumns(both);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
    expect(html).toContain('src="https://cdn.test/logo.png"');
    // Yapı kimliği (brief §1.1): SOL hücre logo ÜSTTE + avatar ALTTA —
    // classic-horizontal'ın tam tersi sırası.
    expect(html.indexOf('avatar.png')).toBeGreaterThan(html.indexOf('logo.png'));
    // Logo img'i height attribute TAŞIMAZ (oran bilinmiyor — spec kararı)
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
  });
  it('renders logo alone when there is no avatar (independent slots)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = dividerColumns(logoOnly);
    expect(html).toContain('src="https://cdn.test/logo.png"');
    expect(html).not.toContain('avatar');
  });
  it('renders avatar alone when there is no logo (independent slots)', () => {
    const avatarOnly = {
      ...full,
      visuals: { ...full.visuals, logoUrl: undefined, avatarUrl: 'https://cdn.test/avatar.png' },
    };
    const html = dividerColumns(avatarOnly);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
  });
  it('renders the hand signature next to the disclaimer in the bottom row', () => {
    const withSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
    };
    const html = dividerColumns(withSig);
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
    expect(dividerColumns(noDisc)).toContain('sig.png');
  });
  it('keeps the plain disclaimer behavior when there is no hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = dividerColumns(noSig);
    expect(html).toContain('This e-mail and any attachments are confidential');
    expect(html).not.toContain('sig.png');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = dividerColumns(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = dividerColumns(full, { iconBaseUrl: 'https://cdn.example.com' });
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
    const filled = dividerColumns(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');

    const outline = dividerColumns(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline-7b9fd3/linkedin.png');

    const mono = dividerColumns(
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
    const html = dividerColumns(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('strips a trailing slash from iconBaseUrl', () => {
    const html = dividerColumns(full, { iconBaseUrl: 'https://cdn.example.com/' });
    expect(html).toContain('src="https://cdn.example.com/icons/');
    expect(html).not.toContain('.com//icons/');
  });

  // ---- Template-specific mandatory assertions (brief §1.1) ----------------

  it('ALWAYS draws the right-column brand rule (border-left:2px solid <brand>), even with showDividers:false', () => {
    const off = dividerColumns({
      ...full,
      layout: { ...full.layout, showDividers: false },
    });
    // full fixture brandColor = BRAND.primary = #7b9fd3 (see fixtures/samples.ts)
    expect(off).toContain('border-left:2px solid #7b9fd3');

    const on = dividerColumns({
      ...full,
      layout: { ...full.layout, showDividers: true },
    });
    expect(on).toContain('border-left:2px solid #7b9fd3');
  });

  it('draws the brand rule even when there is no left-column image content', () => {
    const noImg = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: undefined },
    };
    expect(dividerColumns(noImg)).toContain('border-left:2px solid #7b9fd3');
  });

  it('adds a thin horizontal divider only when showDividers is true (distinct from the always-on vertical rule)', () => {
    const on = dividerColumns({
      ...full,
      layout: { ...full.layout, showDividers: true },
    });
    const off = dividerColumns({
      ...full,
      layout: { ...full.layout, showDividers: false },
    });
    expect(on).toContain('line-height:1px');
    expect(off).not.toContain('line-height:1px');
    // Ayraç her iki durumda da çizilir — yalnız yatay çizgi kapanır.
    expect(off).toContain('border-left:2px solid #7b9fd3');
  });

  it('avatar and logo are independent left-column slots (logo-only fixture has no avatar <img>)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = dividerColumns(logoOnly);
    expect(html).toContain('src="https://cdn.test/logo.png"');
    const imgs = html.match(/<img[^>]*>/gi) ?? [];
    // Yalnız logo + hand-signature (full fixture'da var) — avatar YOK.
    for (const img of imgs) {
      expect(img).not.toMatch(/avatar/i);
    }
  });

  it('CTA pair contract: label alone renders no button, both label+url render brand background with readable text', () => {
    const labelOnly = dividerColumns({
      ...full,
      extras: { ...full.extras, ctaLabel: 'Book a meeting', ctaUrl: undefined },
    });
    expect(labelOnly).not.toContain('Book a meeting');

    const both = dividerColumns(full);
    expect(both).toContain('Book a meeting');
    expect(both).toContain('background-color:#7b9fd3');
    // readableTextOn(#7b9fd3) → beyaz (bkz. card-bordered.test.ts satır 157, color.test.ts)
    expect(both).toContain('color:#ffffff');
  });

  it('root table carries a literal pixel width per size — max-width alone is not enough (Outlook Word engine ignores CSS max-width, and both columns here wrap width="100%" nested content — the divider line and social-icon tables — that would expand to the full reading pane without a bounded pixel ancestor)', () => {
    const rootWidth = (html: string) => html.match(/^<table[^>]*>/i)![0];

    const small = dividerColumns({ ...full, layout: { ...full.layout, size: 'small' } });
    const medium = dividerColumns({ ...full, layout: { ...full.layout, size: 'medium' } });
    const large = dividerColumns({ ...full, layout: { ...full.layout, size: 'large' } });

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

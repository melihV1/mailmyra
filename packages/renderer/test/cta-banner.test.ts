import { describe, it, expect } from 'vitest';
import { ctaBanner } from '../src/templates/cta-banner';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('ctaBanner', () => {
  // ---- Canon coverage (aynı sözleşme, diğer üç şablonla birebir) ----------

  it('renders the full name', () => {
    expect(ctaBanner(full)).toContain('Ellen Mercer');
  });
  it('renders the email as a mailto link', () => {
    expect(ctaBanner(full)).toContain('href="mailto:ellen@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(ctaBanner(full)).toContain('href="https://voldi.net"');
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
    expect(ctaBanner(noImg)).not.toContain('<img');
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = ctaBanner(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const html = ctaBanner(full);
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
    const html = ctaBanner(withSig);
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
    expect(ctaBanner(noDisc)).toContain('sig.png');
  });
  it('keeps the plain disclaimer behavior when there is no hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = ctaBanner(noSig);
    expect(html).toContain('This e-mail and any attachments are confidential');
    expect(html).not.toContain('sig.png');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = ctaBanner(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = ctaBanner(full, { iconBaseUrl: 'https://cdn.example.com' });
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
    const filled = ctaBanner(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');

    const outline = ctaBanner(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline-7b9fd3/linkedin.png');

    const mono = ctaBanner(
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
    const html = ctaBanner(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('strips a trailing slash from iconBaseUrl', () => {
    const html = ctaBanner(full, { iconBaseUrl: 'https://cdn.example.com/' });
    expect(html).toContain('src="https://cdn.example.com/icons/');
    expect(html).not.toContain('.com//icons/');
  });
  it('scales the name font size with layout.size', () => {
    const small = ctaBanner({ ...full, layout: { ...full.layout, size: 'small' } });
    const large = ctaBanner({ ...full, layout: { ...full.layout, size: 'large' } });
    expect(small).toContain('font-size:14px');
    expect(large).toContain('font-size:19px');
  });
  it('avatar width is size-scaled: 40/48/56 px for small/medium/large (compact block, tuned off classic)', () => {
    const avatarImg = (html: string) => html.match(/<img[^>]*avatar\.png[^>]*>/i)![0];
    expect(avatarImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'small' } }))).toContain(
      'width="40"',
    );
    expect(
      avatarImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'medium' } })),
    ).toContain('width="48"');
    expect(avatarImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'large' } }))).toContain(
      'width="56"',
    );
  });

  it('logo width is size-scaled: 56/68/80 px for small/medium/large', () => {
    const logoImg = (html: string) => html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'small' } }))).toContain(
      'width="56"',
    );
    expect(logoImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'medium' } }))).toContain(
      'width="68"',
    );
    expect(logoImg(ctaBanner({ ...full, layout: { ...full.layout, size: 'large' } }))).toContain(
      'width="80"',
    );
  });

  it('avatar and logo are independent slots (logo-only fixture has no avatar <img>)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = ctaBanner(logoOnly);
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
    const html = ctaBanner(avatarOnly);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
  });

  // ---- Template-specific mandatory assertions (brief §1.3 / spec §1.3) ----

  it('logo carries a width attribute but NO height attribute (unknown aspect ratio — canon rule)', () => {
    const html = ctaBanner(full);
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
  });

  it('the CTA band cell is full/root width (width="100%") AND has brandColor as its background', () => {
    const html = ctaBanner(full);
    // full fixture brandColor = BRAND.primary = #7b9fd3 (see fixtures/samples.ts).
    // Locate the specific <td> that carries both width="100%" and the brand background —
    // the CTA band cell, distinct from any other cell/wrapper table in the output.
    const candidates = html.match(/<td[^>]*>/gi) ?? [];
    const band = candidates.find(
      (td) => /width="100%"/i.test(td) && /background-color:#7b9fd3/i.test(td),
    );
    expect(band).toBeTruthy();
  });

  it('the CTA band renders ctaLabel as a bold link with readableTextOn(brand) text color', () => {
    const html = ctaBanner(full);
    expect(html).toContain('Book a meeting');
    expect(html).toContain('background-color:#7b9fd3');
    // readableTextOn(#7b9fd3) → white (see color.test.ts)
    expect(html).toContain('color:#ffffff');
    const ctaAnchor = html.match(/<a[^>]*>Book a meeting<\/a>/i)![0];
    expect(ctaAnchor).toContain('font-weight:bold');
  });

  it('CTA pair contract: label alone renders no band, both label+url render the full-width band', () => {
    const labelOnly = ctaBanner({
      ...full,
      extras: { ...full.extras, ctaLabel: 'Book a meeting', ctaUrl: undefined },
    });
    expect(labelOnly).not.toContain('Book a meeting');
    expect(labelOnly).not.toContain('background-color:#7b9fd3');

    const urlOnly = ctaBanner({
      ...full,
      extras: { ...full.extras, ctaLabel: undefined, ctaUrl: 'https://voldi.net/meeting' },
    });
    expect(urlOnly).not.toContain('background-color:#7b9fd3');
  });

  it('no brandColor-background band cell exists in the CTA-less fixture (template stands complete without it)', () => {
    const noCta = {
      ...full,
      extras: { ...full.extras, ctaLabel: undefined, ctaUrl: undefined },
    };
    const html = ctaBanner(noCta);
    expect(html).not.toContain('background-color:#7b9fd3');
    // Still a complete signature: name, contact, disclaimer all present.
    expect(html).toContain('Ellen Mercer');
    expect(html).toContain('This e-mail and any attachments are confidential');
  });

  it('root table carries a literal pixel width per size — max-width alone is not enough (Outlook Word engine ignores CSS max-width, so any width:100% nested table, like the CTA band, would expand to the full reading pane without a bounded pixel ancestor)', () => {
    const rootWidth = (html: string) => html.match(/^<table[^>]*>/i)![0];

    const small = ctaBanner({ ...full, layout: { ...full.layout, size: 'small' } });
    const medium = ctaBanner({ ...full, layout: { ...full.layout, size: 'medium' } });
    const large = ctaBanner({ ...full, layout: { ...full.layout, size: 'large' } });

    expect(rootWidth(small)).toContain('width="480"');
    expect(rootWidth(medium)).toContain('width="540"');
    expect(rootWidth(large)).toContain('width="600"');

    // max-width stays as a secondary hint for clients that DO honor it —
    // the literal width attribute is what actually bounds Outlook Classic.
    expect(rootWidth(small)).toContain('max-width:480px');
    expect(rootWidth(medium)).toContain('max-width:540px');
    expect(rootWidth(large)).toContain('max-width:600px');
  });

  it('disclaimer markup appears AFTER the CTA band markup in the output', () => {
    const html = ctaBanner(full);
    const bandIndex = html.indexOf('background-color:#7b9fd3');
    const disclaimerIndex = html.indexOf('This e-mail and any attachments are confidential');
    expect(bandIndex).toBeGreaterThan(-1);
    expect(disclaimerIndex).toBeGreaterThan(-1);
    expect(disclaimerIndex).toBeGreaterThan(bandIndex);
  });

  it('hand signature markup appears AFTER the CTA band markup in the output', () => {
    const withSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
    };
    const html = ctaBanner(withSig);
    const bandIndex = html.indexOf('background-color:#7b9fd3');
    const sigIndex = html.indexOf('sig.png');
    expect(bandIndex).toBeGreaterThan(-1);
    expect(sigIndex).toBeGreaterThan(bandIndex);
  });

  it('adds a thin horizontal divider between identity and contact only when showDividers is true', () => {
    const on = ctaBanner({ ...full, layout: { ...full.layout, showDividers: true } });
    const off = ctaBanner({ ...full, layout: { ...full.layout, showDividers: false } });
    expect(on).toContain('line-height:1px');
    expect(off).not.toContain('line-height:1px');
  });

  it('places the divider AFTER the identity block (name/title/company) and BEFORE contact lines', () => {
    const html = ctaBanner({ ...full, layout: { ...full.layout, showDividers: true } });
    const companyIndex = html.indexOf('Voldi Creative');
    const dividerIndex = html.indexOf('line-height:1px');
    const emailIndex = html.indexOf('href="mailto:ellen@voldi.net"');
    expect(dividerIndex).toBeGreaterThan(companyIndex);
    expect(emailIndex).toBeGreaterThan(dividerIndex);
  });
});

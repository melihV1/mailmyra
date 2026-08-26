import { describe, it, expect } from 'vitest';
import { photoFirst } from '../src/templates/photo-first';
import { fixtures } from '../src/fixtures/samples';

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
    // readableTextOn(#7b9fd3) → beyaz
    expect(both).toContain('color:#ffffff');
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

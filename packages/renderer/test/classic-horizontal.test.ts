import { describe, it, expect } from 'vitest';
import { classicHorizontal } from '../src/templates/classic-horizontal';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('classicHorizontal', () => {
  it('renders the full name', () => {
    expect(classicHorizontal(full)).toContain('Hüseyin Yıldız');
  });
  it('renders the email as a mailto link', () => {
    expect(classicHorizontal(full)).toContain('href="mailto:huseyin@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(classicHorizontal(full)).toContain('href="https://voldi.net"');
  });
  it('omits the image column when no avatar or logo is set', () => {
    const noImg = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: undefined,
        logoUrl: undefined,
        // handSignatureUrl belirtilmez — bu görsel image COLUMN'un değil,
        // alt disclaimer satırının parçası (bkz. "renders the hand signature
        // row even without a disclaimer" testi). Kolon testini o özellikten
        // izole etmek için burada da kapatılır.
        handSignatureUrl: undefined,
      },
    };
    expect(classicHorizontal(noImg)).not.toContain('<img');
  });
  it('includes a 1px divider only when showDividers is true', () => {
    const on = classicHorizontal({
      ...full,
      layout: { ...full.layout, showDividers: true },
    });
    const off = classicHorizontal({
      ...full,
      layout: { ...full.layout, showDividers: false },
    });
    expect(on).toContain('line-height:1px');
    expect(off).not.toContain('line-height:1px');
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = classicHorizontal(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const html = classicHorizontal(full);
    const anchors = html.match(/<a [^>]*>/gi) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toContain('text-decoration:none');
    }
  });
  it('scales the name font size with layout.size', () => {
    const small = classicHorizontal({
      ...full,
      layout: { ...full.layout, size: 'small' },
    });
    const large = classicHorizontal({
      ...full,
      layout: { ...full.layout, size: 'large' },
    });
    expect(small).toContain('font-size:15px');
    expect(large).toContain('font-size:22px');
  });
  it('renders avatar and logo together as two stacked images in the left column', () => {
    const both = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: 'https://cdn.test/avatar.png',
        logoUrl: 'https://cdn.test/logo.png',
      },
    };
    const html = classicHorizontal(both);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
    expect(html).toContain('src="https://cdn.test/logo.png"');
    // Logo avatardan SONRA gelir (altında)
    expect(html.indexOf('logo.png')).toBeGreaterThan(html.indexOf('avatar.png'));
    // Logo img'i height attribute TAŞIMAZ (oran bilinmiyor — spec kararı)
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
  });
  it('renders logo alone when there is no avatar (no ?? fallback anymore)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = classicHorizontal(logoOnly);
    expect(html).toContain('src="https://cdn.test/logo.png"');
  });
  it('renders the hand signature next to the disclaimer in the bottom row', () => {
    const withSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
    };
    const html = classicHorizontal(withSig);
    const sigImg = html.match(/<img[^>]*sig\.png[^>]*>/i)![0];
    expect(sigImg).toContain('width="150"');
    // Disclaimer da aynı çıktıda var (full fixture disclaimer içerir)
    expect(html).toContain('Bu e-posta ve ekleri gizlidir');
  });
  it('renders the hand signature row even without a disclaimer', () => {
    const noDisc = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
      extras: { ...full.extras, disclaimer: undefined },
    };
    expect(classicHorizontal(noDisc)).toContain('sig.png');
  });
  it('keeps the plain disclaimer behavior when there is no hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = classicHorizontal(noSig);
    expect(html).toContain('Bu e-posta ve ekleri gizlidir');
    expect(html).not.toContain('sig.png');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = classicHorizontal(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = classicHorizontal(full, { iconBaseUrl: 'https://cdn.example.com' });
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
    // Metin-link etiketleri artık yok
    expect(html).not.toContain('>LinkedIn</a>');
  });
  it('maps icon styles to their variant paths (filled static, outline/mono color-keyed)', () => {
    const filled = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');

    const outline = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline-7b9fd3/linkedin.png');

    const mono = classicHorizontal(
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
    const html = classicHorizontal(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('strips a trailing slash from iconBaseUrl', () => {
    const html = classicHorizontal(full, { iconBaseUrl: 'https://cdn.example.com/' });
    expect(html).toContain('src="https://cdn.example.com/icons/');
    expect(html).not.toContain('.com//icons/');
  });
});

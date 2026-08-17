import { describe, it, expect } from 'vitest';
import { stackedMinimal } from '../src/templates/stacked-minimal';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;
const minimal = fixtures.find((f) => f.id === 'minimal')!.data;
const longContent = fixtures.find((f) => f.id === 'longContent')!.data;

describe('stackedMinimal', () => {
  it('renders the full name', () => {
    expect(stackedMinimal(full)).toContain('Ellen Mercer');
  });
  it('renders the email as a mailto link', () => {
    expect(stackedMinimal(full)).toContain('href="mailto:ellen@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(stackedMinimal(full)).toContain('href="https://voldi.net"');
  });
  it('renders phone and mobile as tel links on a single line', () => {
    const html = stackedMinimal(full);
    expect(html).toContain('href="tel:+903320000000"');
    expect(html).toContain('href="tel:+905550000000"');
    // İkisi de AYNI <td> içinde: aralarında satır sonu (</td>) olmamalı.
    const between = html.slice(
      html.indexOf('tel:+903320000000'),
      html.indexOf('tel:+905550000000'),
    );
    expect(between).not.toContain('</td>');
  });
  it('stacks the visuals on top: avatar and logo come before the name', () => {
    const html = stackedMinimal(full);
    // DİKKAT: 'Ellen Mercer' avatarın alt metninde de geçiyor — ad satırının
    // gerçek yerini kapanış etiketiyle ararız.
    const nameAt = html.indexOf('>Ellen Mercer</span>');
    expect(nameAt).toBeGreaterThan(-1);
    expect(html.indexOf('avatar.png')).toBeLessThan(nameAt);
    expect(html.indexOf('logo.png')).toBeLessThan(nameAt);
    // Logo avatardan sonra (altında)
    expect(html.indexOf('logo.png')).toBeGreaterThan(html.indexOf('avatar.png'));
    // Logo height TAŞIMAZ (oran bilinmiyor), width taşır
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
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
    expect(stackedMinimal(noImg)).not.toContain('<img');
  });
  it('renders the minimal fixture (name + e-mail only) without empty rows', () => {
    const html = stackedMinimal(minimal);
    expect(html).toContain('Nora Bennett');
    expect(html).toContain('href="mailto:nora@voldi.net"');
    // Boş hücre yok, tek başına ayraç yok
    expect(html).not.toContain('<td></td>');
    expect(html).not.toContain('line-height:2px');
  });
  it('draws the 2px brand accent bar only when showDividers is true', () => {
    const on = stackedMinimal({ ...full, layout: { ...full.layout, showDividers: true } });
    const off = stackedMinimal({ ...full, layout: { ...full.layout, showDividers: false } });
    expect(on).toContain('line-height:2px');
    expect(off).not.toContain('line-height:2px');
    // classic-horizontal'ın tam genişlik 1px çizgisi burada YOK
    expect(on).not.toContain('line-height:1px');
  });
  it('omits the accent bar when there is nothing below the identity block', () => {
    const identityOnly = {
      ...full,
      contact: {},
      social: [],
      extras: undefined,
      layout: { ...full.layout, showDividers: true },
    };
    expect(stackedMinimal(identityOnly)).not.toContain('line-height:2px');
  });
  it('renders a single-column table (no two-column layout row)', () => {
    // Dış tablonun her satırı tek hücreli: iki <td> içeren <tr> olmamalı.
    const html = stackedMinimal(full);
    const twoCellRows = html.match(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?<\/td>\s*<td/gi) ?? [];
    // İstisna: sosyal ikon şeridi (ikon başına bir hücre) — metin-link modunda hiç yok.
    expect(twoCellRows).toHaveLength(0);
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = stackedMinimal(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('renders every anchor without underline (text-decoration:none)', () => {
    const anchors = stackedMinimal(full).match(/<a [^>]*>/gi) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a).toContain('text-decoration:none');
    }
  });
  it('scales the name font size and the signature width with layout.size', () => {
    const small = stackedMinimal({ ...full, layout: { ...full.layout, size: 'small' } });
    const large = stackedMinimal({ ...full, layout: { ...full.layout, size: 'large' } });
    expect(small).toContain('font-size:16px');
    expect(small).toContain('max-width:300px');
    expect(large).toContain('font-size:23px');
    expect(large).toContain('max-width:380px');
  });
  it('stays narrow: never wider than 380px even with long content', () => {
    const html = stackedMinimal(longContent);
    expect(html).toContain('max-width:340px');
    expect(html).toContain('Alexandra Katherine Fitzgerald-Whitmore');
    // Uzun feragatname tek parça basılır, kırpılmaz
    expect(html).toContain('please notify the sender and delete the message');
  });
  it('places the hand signature right below the identity block, above contact', () => {
    const html = stackedMinimal(full);
    expect(html.indexOf('hand-signature.png')).toBeGreaterThan(html.indexOf('Ellen Mercer'));
    expect(html.indexOf('hand-signature.png')).toBeLessThan(
      html.indexOf('mailto:ellen@voldi.net'),
    );
  });
  it('renders the disclaimer last, without a hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = stackedMinimal(noSig);
    expect(html).toContain('This e-mail and any attachments are confidential');
    expect(html).not.toContain('hand-signature.png');
  });
  it('renders a full-width CTA button with readable label colour', () => {
    const html = stackedMinimal(full);
    expect(html).toContain('href="https://voldi.net/meeting"');
    expect(html).toContain('Book a meeting');
    // Düğme metni readableTextOn(brandColor) ile seçilir — #7b9fd3 üstünde beyaz
    expect(html).toContain('color:#ffffff');
    const light = stackedMinimal({
      ...full,
      visuals: { ...full.visuals, brandColor: '#ffee00' },
    });
    expect(light).toContain('color:#000000');
  });
  it('omits the CTA when only one of label/url is set', () => {
    const half = { ...full, extras: { ...full.extras, ctaUrl: undefined } };
    expect(stackedMinimal(half)).not.toContain('Book a meeting');
  });
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = stackedMinimal(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = stackedMinimal(full, { iconBaseUrl: 'https://cdn.example.com/' });
    const iconImgs = html.match(/<img[^>]*\/icons\/[^>]*>/gi) ?? [];
    expect(iconImgs).toHaveLength(3);
    for (const img of iconImgs) {
      expect(img).toContain('width="24"');
      expect(img).toContain('height="24"');
    }
    // Sondaki eğik çizgi tekrarlanmaz
    expect(html).not.toContain('.com//icons/');
    // full fixture: iconStyle 'mono', iconColor #7b9fd3
    expect(html).toContain('/icons/mono-7b9fd3/linkedin.png');
    expect(html).not.toContain('>LinkedIn</a>');
  });
  it('keys outline and mono icon paths off iconColor, not brandColor', () => {
    const custom = {
      ...full,
      visuals: { ...full.visuals, brandColor: '#ff0000', iconColor: '#123456' },
      layout: { ...full.layout, iconStyle: 'outline' as const },
    };
    const html = stackedMinimal(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
  it('renders custom fields with their label', () => {
    expect(stackedMinimal(full)).toContain('Portfolio: ');
  });
  it('drops the whole social row when there are no social links', () => {
    const noSocial = { ...full, social: [] };
    const html = stackedMinimal(noSocial);
    expect(html).not.toContain('LinkedIn');
    expect(html).not.toContain('/icons/');
  });
});

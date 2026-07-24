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
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: undefined },
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
});

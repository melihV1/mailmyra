import { describe, it, expect } from 'vitest';
import { htmlEscape, sanitizeUrl } from '../src/utils/escape';

describe('htmlEscape', () => {
  it("escapes &, <, >, \", and '", () => {
    expect(htmlEscape(`<a href="x">Tom & "Jerry" 'go'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &quot;Jerry&quot; &#39;go&#39;&lt;/a&gt;',
    );
  });
  it('leaves plain unicode text unchanged', () => {
    expect(htmlEscape('Hüseyin Yıldız')).toBe('Hüseyin Yıldız');
  });
});

describe('sanitizeUrl', () => {
  it('allows https, mailto, tel', () => {
    expect(sanitizeUrl('https://voldi.net')).toBe('https://voldi.net');
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(sanitizeUrl('tel:+90123')).toBe('tel:+90123');
  });
  it('blocks javascript: scheme', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });
  it('upgrades protocol-relative to https', () => {
    expect(sanitizeUrl('//cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });
});

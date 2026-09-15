import { describe, it, expect } from 'vitest';
import { shouldShowAccentBand, accentBandRow, accentPanelStyle } from '../src/utils/accent';
import type { SignatureData } from '../src/types';

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

describe('shouldShowAccentBand', () => {
  it('is true when the field is absent', () => {
    expect(shouldShowAccentBand(base)).toBe(true);
  });
  it('is true when explicitly auto', () => {
    expect(shouldShowAccentBand({ ...base, layout: { ...base.layout, accentBand: 'auto' } })).toBe(true);
  });
  it('is false when turned off', () => {
    expect(shouldShowAccentBand({ ...base, layout: { ...base.layout, accentBand: 'off' } })).toBe(false);
  });
});

describe('accentBandRow', () => {
  const html = accentBandRow({ brandHex: '#7b9fd3', height: 8 });

  it('sets the colour with BOTH the attribute and the style', () => {
    expect(html).toContain('bgcolor="#7b9fd3"');
    expect(html).toContain('background-color:#7b9fd3');
  });
  it('is never empty, because Outlook will not paint an empty cell', () => {
    expect(html).toContain('&nbsp;');
  });
  it('collapses its own line box so the height is the height asked for', () => {
    expect(html).toContain('height:8px');
    expect(html).toContain('font-size:1px');
    expect(html).toContain('line-height:1px');
  });
  it('carries no image — a logo would vanish on a dark field', () => {
    expect(html).not.toMatch(/<img/i);
  });
  it('spans the columns it is told to', () => {
    expect(accentBandRow({ brandHex: '#7b9fd3', height: 8, colspan: 2 })).toContain('colspan="2"');
    expect(html).not.toContain('colspan');
  });
  it('emits no forbidden constructs', () => {
    expect(html).not.toMatch(/<div|<style|<svg|position\s*:|display:\s*flex|display:\s*grid|float:|webp|base64/i);
  });
});

describe('accentPanelStyle', () => {
  const panel = accentPanelStyle('#7b9fd3');

  it('gives both the attribute and the style value', () => {
    expect(panel.bgcolor).toBe('#7b9fd3');
    expect(panel.style['background-color']).toBe('#7b9fd3');
  });
  // final review ⑤: eski "picks a readable text colour" testi kaldırıldı.
  // Panel yalnız `photo-first`'in avatar hücresine uygulanıyor, içeriği her
  // zaman bir `<img>` — `color` hiçbir glif tarafından miras alınmıyordu,
  // yani kontrast iddiası ölü koda karşı hiçbir şeyi ısırmıyordu (bkz.
  // accent.ts `accentPanelStyle` yorumu). Bu yüzden panelin metin rengi
  // TAŞIMADIĞINI makine kontrolüne bağlıyoruz.
  it('carries no text colour — the panel never wraps text, only an <img>', () => {
    expect(panel.style.color).toBeUndefined();
  });
});

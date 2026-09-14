import { describe, it, expect } from 'vitest';
import { initialsFrom, shouldShowMonogram, monogramCell } from '../src/utils/monogram';
import type { SignatureData } from '../src/types';

describe('initialsFrom', () => {
  it('takes first and last word initials', () => {
    expect(initialsFrom('Elif Kaya')).toBe('EK');
  });
  it('uses the LAST word, not the second', () => {
    expect(initialsFrom('Ayse Nur Demir')).toBe('AD');
  });
  it('returns one letter for a single word', () => {
    expect(initialsFrom('Cher')).toBe('C');
  });
  it('leaves an already-uppercase Turkish dotted I alone', () => {
    expect(initialsFrom('İlker Yılmaz')).toBe('İY');
  });
  it('uppercases lowercase Turkish i to the dotted capital', () => {
    expect(initialsFrom('ilker yılmaz')).toBe('İY');
  });
  it('leaves an already-uppercase English I alone', () => {
    expect(initialsFrom('Ian Smith')).toBe('IS');
  });
  it('handles particles by taking first and last', () => {
    expect(initialsFrom('van der Berg')).toBe('VB');
  });
  it('keeps punctuation as typed', () => {
    expect(initialsFrom('J. Smith')).toBe('JS');
  });
  it('collapses runs of whitespace', () => {
    expect(initialsFrom('  Elif   Kaya  ')).toBe('EK');
  });
  it('returns empty for an empty or blank name', () => {
    expect(initialsFrom('')).toBe('');
    expect(initialsFrom('   ')).toBe('');
  });
  it('passes through scripts without case', () => {
    expect(initialsFrom('田中 太郎')).toBe('田太');
  });
  it('is code-point safe for astral characters', () => {
    expect(initialsFrom('🙂 Kaya')).toBe('🙂K');
  });
});

const base: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: {},
  visuals: {
    brandColor: '#7b9fd3',
    // brief bunu içermiyordu: `iconColor` bu alanların yazılmasından SONRA
    // zorunlu hale geldi (8dfd702). brandColor ile aynı tutuldu — bu
    // testler ikon rengini kullanmıyor, yalnız tip için gerekli.
    iconColor: '#7b9fd3',
    textColor: '#111827',
    mutedColor: '#6b7280',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  social: [],
  layout: { templateId: 'classic-horizontal', size: 'medium', iconStyle: 'mono', showDividers: false },
};

describe('shouldShowMonogram', () => {
  it('is true when there is no avatar and no explicit choice', () => {
    expect(shouldShowMonogram(base)).toBe(true);
  });
  it('is false when an avatar exists', () => {
    expect(shouldShowMonogram({ ...base, visuals: { ...base.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' } })).toBe(false);
  });
  it('is false when explicitly turned off', () => {
    expect(shouldShowMonogram({ ...base, layout: { ...base.layout, monogram: 'off' } })).toBe(false);
  });
  it('is true when explicitly auto', () => {
    expect(shouldShowMonogram({ ...base, layout: { ...base.layout, monogram: 'auto' } })).toBe(true);
  });
  it('is false when the name yields no initials', () => {
    expect(shouldShowMonogram({ ...base, identity: { fullName: '   ' } })).toBe(false);
  });
});

describe('monogramCell', () => {
  const html = monogramCell({
    initials: 'EK', size: 90, brandHex: '#7b9fd3',
    fontFamily: 'Arial, Helvetica, sans-serif', borderRadius: '4px',
  });

  it('sets the background with BOTH the attribute and the style', () => {
    expect(html).toContain('bgcolor="#7b9fd3"');
    expect(html).toContain('background-color:#7b9fd3');
  });
  it('picks a readable text colour for the brand', () => {
    expect(html).toContain('color:#000000');
  });
  it('sizes the box on both the attribute and the style', () => {
    expect(html).toContain('width="90"');
    expect(html).toContain('height="90"');
    expect(html).toContain('width:90px');
    expect(html).toContain('height:90px');
  });
  it('centres vertically the way the Word engine needs', () => {
    expect(html).toContain('valign="middle"');
    expect(html).toContain('mso-line-height-rule:exactly');
    expect(html).toContain('line-height:90px');
  });
  it('uses 40% of the box for the font size', () => {
    expect(html).toContain('font-size:36px');
  });
  it('uses the signature font, not a hardcoded one', () => {
    expect(html).toContain('Arial, Helvetica, sans-serif');
  });
  it('mirrors the radius it was given', () => {
    expect(html).toContain('border-radius:4px');
    expect(monogramCell({ initials: 'EK', size: 120, brandHex: '#7b9fd3', fontFamily: 'Arial, Helvetica, sans-serif', borderRadius: '50%' })).toContain('border-radius:50%');
  });
  it('escapes the initials', () => {
    expect(monogramCell({ initials: '<&', size: 90, brandHex: '#7b9fd3', fontFamily: 'Arial, Helvetica, sans-serif', borderRadius: '4px' })).toContain('&lt;&amp;');
  });
  it('emits no forbidden constructs', () => {
    expect(html).not.toMatch(
      /<div|<style|<svg|position:|display:\s*flex|display:\s*grid|float:|<img|webp|base64/i,
    );
  });
});

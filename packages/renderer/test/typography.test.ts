import { describe, it, expect } from 'vitest';
import { displayName, nameLetterSpacing } from '../src/utils/typography';

describe('displayName', () => {
  it('passes the name through unchanged by default', () => {
    expect(displayName('Elif Kaya', undefined)).toBe('Elif Kaya');
  });
  it('passes the name through unchanged when normal', () => {
    expect(displayName('Elif Kaya', 'normal')).toBe('Elif Kaya');
  });
  it('uppercases when upper', () => {
    expect(displayName('Elif Kaya', 'upper')).toBe('ELİF KAYA');
  });
  it('uses Turkish casing for a lowercase dotted i', () => {
    expect(displayName('ilker yılmaz', 'upper')).toBe('İLKER YILMAZ');
  });
  it('leaves an already-uppercase Turkish name alone', () => {
    expect(displayName('İLKER', 'upper')).toBe('İLKER');
  });
  it('expands the German sharp s, which is correct here', () => {
    // initialsFrom had to guard against this because it promises at most two
    // characters; a full name has no such limit and SS is the right capital.
    // The leading 'i' also picks up the same Turkish dotting verified above
    // ('ilker' -> 'İlker') — toLocaleUpperCase('tr-TR') applies that rule to
    // every 'i' in the string, sharp-s or not, so 'İ' here is correct too.
    expect(displayName('Weiß', 'upper')).toBe('WEİSS');
  });
  it('returns empty for an empty name', () => {
    expect(displayName('', 'upper')).toBe('');
  });
});

describe('nameLetterSpacing', () => {
  it('is undefined by default', () => {
    expect(nameLetterSpacing(undefined)).toBeUndefined();
  });
  it('is undefined when normal', () => {
    expect(nameLetterSpacing('normal')).toBeUndefined();
  });
  it('opens the tracking when upper', () => {
    expect(nameLetterSpacing('upper')).toBe('0.04em');
  });
});

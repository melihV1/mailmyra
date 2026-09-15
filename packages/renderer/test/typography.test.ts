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
    // Also an instance of the accepted limit below: the lowercase i in
    // 'Elif' loses its dot under the default rule, same as 'ilker yılmaz'.
    expect(displayName('Elif Kaya', 'upper')).toBe('ELIF KAYA');
  });
  it('keeps a properly written Turkish name correct', () => {
    // Turkish users write their own name with the dotted capital already
    // there, and the dotless i uppercases to I under the default locale too —
    // so the default rule gets this right without Turkish casing.
    expect(displayName('İlker Yılmaz', 'upper')).toBe('İLKER YILMAZ');
  });
  it('does NOT dot the i of a non-Turkish name', () => {
    // This is why the default locale is used here and tr-TR is not: Turkish
    // casing dots EVERY i, so Smith becomes SMİTH and Martin MARTİN.
    expect(displayName('Ian Smith', 'upper')).toBe('IAN SMITH');
    expect(displayName('Christina Martin', 'upper')).toBe('CHRISTINA MARTIN');
  });
  it('accepts the known limit: an all-lowercase Turkish name loses its dot', () => {
    // The same limit initialsFrom accepts, in the opposite direction. Costed
    // and chosen: tr-TR would fix this one name and break every name with an i.
    expect(displayName('ilker yılmaz', 'upper')).toBe('ILKER YILMAZ');
  });
  it('expands the German sharp s, which is correct here', () => {
    // initialsFrom had to guard against this because it promises at most two
    // characters; a full name has no such limit and SS is the right capital.
    expect(displayName('Weiß', 'upper')).toBe('WEISS');
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

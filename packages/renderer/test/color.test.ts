import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex, readableTextOn, contrastRatio } from '../src/utils/color';

describe('isValidHex', () => {
  it('accepts #abc and #aabbcc', () => {
    expect(isValidHex('#abc')).toBe(true);
    expect(isValidHex('#719ad1')).toBe(true);
  });
  it('rejects missing hash or bad chars', () => {
    expect(isValidHex('719ad1')).toBe(false);
    expect(isValidHex('#12g')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('expands shorthand', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });
  it('lowercases', () => {
    expect(normalizeHex('#719AD1')).toBe('#719ad1');
  });
  it('throws on invalid input', () => {
    expect(() => normalizeHex('nope')).toThrow();
  });
});

describe('readableTextOn', () => {
  it('returns white text on a dark background', () => {
    expect(readableTextOn('#1a1a1a')).toBe('#ffffff');
  });
  it('returns black text on a light background', () => {
    expect(readableTextOn('#ffffff')).toBe('#000000');
  });
  it('returns black text on the brand blue (higher contrast)', () => {
    expect(readableTextOn('#719ad1')).toBe('#000000');
  });
  it('chooses the color with higher contrast', () => {
    // Brand blue: white gives ~2.7 contrast, black gives ~6.0+
    const textOnBrandBlue = readableTextOn('#719ad1');
    const contrastWhite = contrastRatio('#ffffff', '#719ad1');
    const contrastBlack = contrastRatio('#000000', '#719ad1');
    expect(contrastRatio(textOnBrandBlue, '#719ad1')).toBe(Math.max(contrastWhite, contrastBlack));
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('is 1 for identical colors', () => {
    expect(contrastRatio('#719ad1', '#719ad1')).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#1a1a1a', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#1a1a1a'),
      5,
    );
  });
  it('brand blue on white is below 4.5 (known mid-contrast)', () => {
    const r = contrastRatio('#719ad1', '#ffffff');
    expect(r).toBeGreaterThan(2);
    expect(r).toBeLessThan(4.5);
  });
});

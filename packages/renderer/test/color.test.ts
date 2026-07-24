import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex, readableTextOn } from '../src/utils/color';

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
  it('returns white text on the brand blue', () => {
    expect(readableTextOn('#719ad1')).toBe('#ffffff');
  });
});

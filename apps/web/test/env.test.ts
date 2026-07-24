import { describe, it, expect } from 'vitest';
import { envInt } from '../lib/env';

describe('envInt', () => {
  it('parses a valid numeric string', () => {
    expect(envInt('42', 10)).toBe(42);
  });
  it('returns the fallback for undefined', () => {
    expect(envInt(undefined, 10)).toBe(10);
  });
  it('returns the fallback for a garbage/non-numeric string', () => {
    expect(envInt('abc', 10)).toBe(10);
  });
  it('returns the fallback for an explicit "NaN" string', () => {
    expect(envInt('NaN', 10)).toBe(10);
  });
  it('returns the fallback for "Infinity" (finite check, not just NaN check)', () => {
    expect(envInt('Infinity', 10)).toBe(10);
    expect(envInt('-Infinity', 10)).toBe(10);
  });
  it('parses zero as a legitimate value, not a falsy fallback trigger', () => {
    expect(envInt('0', 10)).toBe(0);
  });
});

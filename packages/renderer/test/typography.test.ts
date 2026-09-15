import { describe, it, expect } from 'vitest';
import { nameLetterSpacing } from '../src/utils/typography';

describe('nameLetterSpacing', () => {
  it('is undefined by default', () => {
    expect(nameLetterSpacing(undefined)).toBeUndefined();
  });
  it('is undefined when normal', () => {
    expect(nameLetterSpacing('normal')).toBeUndefined();
  });
  it('opens the tracking when wide', () => {
    expect(nameLetterSpacing('wide')).toBe('0.04em');
  });
});

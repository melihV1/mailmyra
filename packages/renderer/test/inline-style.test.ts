import { describe, it, expect } from 'vitest';
import { styleToString } from '../src/utils/inline-style';

describe('styleToString', () => {
  it('joins properties with semicolons', () => {
    expect(styleToString({ color: 'red', 'font-size': '12px' })).toBe(
      'color:red;font-size:12px',
    );
  });
  it('skips undefined and empty values', () => {
    expect(
      styleToString({ color: 'red', 'font-weight': undefined, margin: '' }),
    ).toBe('color:red');
  });
  it('accepts numeric values', () => {
    expect(styleToString({ opacity: 1 })).toBe('opacity:1');
  });
});

import { describe, it, expect } from 'vitest';
import { TEMPLATE_IDS, TEMPLATE_ACCENT_SURFACE } from '../src/index';

describe('TEMPLATE_ACCENT_SURFACE', () => {
  it('covers exactly the templates the renderer knows about', () => {
    // `satisfies` bunu derlemede tutuyor; bu test çalışma zamanında da tutar,
    // çünkü TEMPLATE_IDS `Object.keys` ile üretiliyor ve tip bilgisi taşımıyor.
    expect(Object.keys(TEMPLATE_ACCENT_SURFACE).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('marks exactly the two templates that draw an accent surface', () => {
    // DİKKAT: `toBe(true)` tek başına yetmez — dördünün false olduğunu da
    // iddia etmezsek "hepsi true" diyen bir regresyon bu testi geçer.
    const accent = Object.entries(TEMPLATE_ACCENT_SURFACE)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort();
    expect(accent).toEqual(['card-bordered', 'photo-first']);
  });
});

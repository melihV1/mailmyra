import { describe, it, expect } from 'vitest';
import { TEMPLATE_IDS, TEMPLATE_ACCENT_SURFACE, accentSurfaceAvailable } from '../src/index';
import type { SignatureData } from '../src/types';

const base: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: { email: 'elif@voldi.net' },
  visuals: {
    brandColor: '#7b9fd3',
    iconColor: '#7b9fd3',
    textColor: '#111827',
    mutedColor: '#6b7280',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  social: [],
  layout: { templateId: '', size: 'medium', iconStyle: 'mono', showDividers: false },
};

function withTemplate(templateId: string, avatarUrl?: string): SignatureData {
  return {
    ...base,
    visuals: { ...base.visuals, avatarUrl },
    layout: { ...base.layout, templateId },
  };
}

describe('TEMPLATE_ACCENT_SURFACE', () => {
  it('covers exactly the templates the renderer knows about', () => {
    // `render.ts`'teki `_accentCoverage` iddiası bunu derlemede tutuyor; bu
    // test çalışma zamanında da tutar, çünkü TEMPLATE_IDS `Object.keys` ile
    // üretiliyor ve tip bilgisi taşımıyor.
    expect(Object.keys(TEMPLATE_ACCENT_SURFACE).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('marks exactly the two templates that draw an accent surface', () => {
    // DİKKAT: `toBeTruthy()` tek başına yetmez — dördünün `null` olduğunu da
    // iddia etmezsek "hepsi dolu" diyen bir regresyon bu testi geçer.
    const withRequirement = Object.entries(TEMPLATE_ACCENT_SURFACE)
      .filter(([, v]) => v !== null)
      .map(([k]) => k)
      .sort();
    expect(withRequirement).toEqual(['card-bordered', 'photo-first']);
  });
});

describe('accentSurfaceAvailable', () => {
  it('is always true for card-bordered, avatar or not', () => {
    expect(accentSurfaceAvailable(withTemplate('card-bordered'), 'card-bordered')).toBe(true);
    expect(
      accentSurfaceAvailable(withTemplate('card-bordered', 'https://cdn.mailmyra.com/a.png'), 'card-bordered'),
    ).toBe(true);
  });

  it('is true for photo-first only when there is an avatar', () => {
    expect(accentSurfaceAvailable(withTemplate('photo-first'), 'photo-first')).toBe(false);
    expect(
      accentSurfaceAvailable(withTemplate('photo-first', 'https://cdn.mailmyra.com/a.png'), 'photo-first'),
    ).toBe(true);
  });

  it('is false for the four templates with no accent surface', () => {
    for (const templateId of ['classic-horizontal', 'stacked-minimal', 'divider-columns', 'cta-banner']) {
      expect(accentSurfaceAvailable(withTemplate(templateId), templateId)).toBe(false);
      expect(
        accentSurfaceAvailable(withTemplate(templateId, 'https://cdn.mailmyra.com/a.png'), templateId),
      ).toBe(false);
    }
  });

  it('is false, not thrown or true, for an unknown templateId', () => {
    expect(accentSurfaceAvailable(withTemplate('deleted-template'), 'deleted-template')).toBe(false);
  });

  it('is false for a JS prototype key masquerading as a templateId', () => {
    // `ACCENT_SURFACE.constructor` gerçekten var — `Object.prototype`'dan
    // miras alınır ve bir FONKSİYONDUR (truthy). Gevşek bir kontrol
    // (`?? null` ya da salt truthy testi) bunu yakalamaz; yalnız `===`
    // karşılaştırması güvenli. Bkz. `capabilities.ts`.
    expect(accentSurfaceAvailable(withTemplate('constructor'), 'constructor')).toBe(false);
    expect(accentSurfaceAvailable(withTemplate('toString'), 'toString')).toBe(false);
  });
});

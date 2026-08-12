import { describe, expect, it } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';

import { applyBrand, seedBrandDefaults } from '../lib/brand-apply';
import type { BrandDocument } from '../lib/brand-doc';

function data(over: Partial<SignatureData['visuals']> = {}): SignatureData {
  return {
    identity: { fullName: 'Ali Yılmaz' },
    contact: {},
    visuals: {
      brandColor: '#111111',
      iconColor: '#111111',
      textColor: '#222222',
      mutedColor: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
      ...over,
    },
    social: [],
    layout: { templateId: 'classic-horizontal', size: 'medium', iconStyle: 'mono', showDividers: true },
  } as SignatureData;
}

describe('applyBrand', () => {
  it('is the identity function without a brand', () => {
    const d = data();
    expect(applyBrand(d, null)).toEqual(d);
  });

  it('overlays every locked field onto its SignatureData path', () => {
    const brand: BrandDocument = {
      brandColor: { value: '#7b9fd3', mode: 'locked' },
      fontFamily: { value: 'Georgia, serif', mode: 'locked' },
      cta: { value: { label: 'Book', url: 'https://voldi.net' }, mode: 'locked' },
      disclaimer: { value: 'Legal.', mode: 'locked' },
    };
    const out = applyBrand(data(), brand);
    expect(out.visuals.brandColor).toBe('#7b9fd3');
    expect(out.visuals.fontFamily).toBe('Georgia, serif');
    expect(out.extras?.ctaLabel).toBe('Book');
    expect(out.extras?.ctaUrl).toBe('https://voldi.net');
    expect(out.extras?.disclaimer).toBe('Legal.');
  });

  it('does NOT overlay default-mode fields — kişi kazanır', () => {
    const out = applyBrand(data(), { brandColor: { value: '#7b9fd3', mode: 'default' } });
    expect(out.visuals.brandColor).toBe('#111111');
  });

  it('leaves unmanaged fields untouched', () => {
    const out = applyBrand(data(), { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(out.visuals.textColor).toBe('#222222');
    expect(out.layout.templateId).toBe('classic-horizontal');
  });

  it('does not mutate the input — kilit kalkınca kişisel değer geri gelir', () => {
    const d = data();
    applyBrand(d, { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(d.visuals.brandColor).toBe('#111111');
  });
});

describe('seedBrandDefaults', () => {
  it('seeds BOTH locked and default values into a fresh signature', () => {
    const out = seedBrandDefaults(data(), {
      brandColor: { value: '#7b9fd3', mode: 'locked' },
      textColor: { value: '#333333', mode: 'default' },
    });
    expect(out.visuals.brandColor).toBe('#7b9fd3');
    expect(out.visuals.textColor).toBe('#333333');
  });

  it('leaves unmanaged fields at their empty defaults', () => {
    const out = seedBrandDefaults(data(), { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(out.visuals.mutedColor).toBe('#666666');
  });
});

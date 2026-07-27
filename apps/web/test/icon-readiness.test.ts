import { describe, it, expect } from 'vitest';
import { createEmptyData } from '../app/builder/reducer';
import { needsGeneratedIcons } from '../lib/icon-readiness';

const social = [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }] as const;

describe('needsGeneratedIcons', () => {
  it('requires a colour-keyed style AND at least one social entry', () => {
    const base = createEmptyData(); // iconStyle: 'mono', social: []
    expect(needsGeneratedIcons(base)).toBe(false);
    expect(needsGeneratedIcons({ ...base, social: [...social] })).toBe(true);
  });
  it('is true for outline as well as mono — both are generated per colour', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'outline' } })).toBe(true);
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'mono' } })).toBe(true);
  });
  it('is false for filled — platform colours are static, nothing to generate', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'filled' } })).toBe(false);
  });
});

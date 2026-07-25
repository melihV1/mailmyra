import { describe, it, expect } from 'vitest';
import { createEmptyData } from '../app/builder/reducer';
import { needsMonoIcons } from '../lib/icon-readiness';

const social = [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }] as const;

describe('needsMonoIcons', () => {
  it('requires mono icon style AND at least one social entry', () => {
    const base = createEmptyData(); // iconStyle: 'mono', social: []
    expect(needsMonoIcons(base)).toBe(false);
    expect(needsMonoIcons({ ...base, social: [...social] })).toBe(true);
  });
  it('is false for filled/outline regardless of social entries (static, deploy-time)', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsMonoIcons({ ...base, layout: { ...base.layout, iconStyle: 'filled' } })).toBe(false);
    expect(needsMonoIcons({ ...base, layout: { ...base.layout, iconStyle: 'outline' } })).toBe(false);
  });
});

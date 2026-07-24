import { describe, it, expect } from 'vitest';
import { builderReducer, createEmptyData } from '../app/builder/reducer';

describe('createEmptyData', () => {
  it('starts with brand defaults and classic-horizontal', () => {
    const d = createEmptyData();
    expect(d.visuals.brandColor).toBe('#719ad1');
    expect(d.layout.templateId).toBe('classic-horizontal');
    expect(d.identity.fullName).toBe('');
  });
});

describe('builderReducer', () => {
  it('patches sections without touching others', () => {
    const s0 = createEmptyData();
    const s1 = builderReducer(s0, { type: 'patchIdentity', value: { fullName: 'Ayşe' } });
    expect(s1.identity.fullName).toBe('Ayşe');
    expect(s1.contact).toEqual(s0.contact);
    expect(s0.identity.fullName).toBe(''); // immutable
  });
  it('replaces social list', () => {
    const s = builderReducer(createEmptyData(), {
      type: 'setSocial',
      value: [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }],
    });
    expect(s.social).toHaveLength(1);
  });
  it('load replaces the whole state, reset returns to empty', () => {
    const s1 = builderReducer(createEmptyData(), { type: 'patchIdentity', value: { fullName: 'X' } });
    const s2 = builderReducer(s1, { type: 'load', value: createEmptyData() });
    expect(s2.identity.fullName).toBe('');
    const s3 = builderReducer(s1, { type: 'reset' });
    expect(s3).toEqual(createEmptyData());
  });
});

import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { builderReducer, createEmptyData, mergeWithEmpty } from '../app/builder/reducer';

describe('createEmptyData', () => {
  it('starts with brand defaults and classic-horizontal', () => {
    const d = createEmptyData();
    expect(d.visuals.brandColor).toBe('#719ad1');
    expect(d.visuals.textColor).toBe('#333333');
    expect(d.visuals.mutedColor).toBe('#666666');
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

describe('mergeWithEmpty', () => {
  it('fills a partial/corrupt draft into a complete SignatureData', () => {
    const d = mergeWithEmpty({ identity: { fullName: 'x' } });
    expect(d.identity.fullName).toBe('x');
    expect(d.layout.templateId).toBe('classic-horizontal');
    expect(d.visuals.brandColor).toBe('#719ad1');
    expect(d.visuals.textColor).toBe('#333333');
    expect(d.visuals.mutedColor).toBe('#666666');
    expect(d.social).toEqual([]);
    expect(d.contact).toEqual({});
  });
  it('returns the equivalent of createEmptyData() for an empty partial', () => {
    expect(mergeWithEmpty({})).toEqual(createEmptyData());
  });
  it('does not let a partial section shadow the whole section — merges field by field', () => {
    // `Partial<SignatureData>` yalnızca ÜST düzeyde (hangi bölümler mevcut)
    // partial'dır; bir bölümün İÇİNDEKİ alanlar tip sisteminde tam zorunludur.
    // Ama gerçek dünyada (bozuk localStorage taslağı) bir bölüm eksik alanla
    // gelebilir — tip sistemi bunu görmez, `mergeWithEmpty` runtime'da korur.
    // Bu satır tam olarak o kaçağı simüle eder.
    const corrupt = { visuals: { brandColor: '#000000' } } as unknown as Partial<SignatureData>;
    const d = mergeWithEmpty(corrupt);
    expect(d.visuals.brandColor).toBe('#000000');
    // Diğer visuals alanları boş veriden gelmeye devam etmeli (kısmi obje
    // bütün bölümün yerini almamalı).
    expect(d.visuals.textColor).toBe('#333333');
    expect(d.visuals.fontFamily).toBe('Arial, Helvetica, sans-serif');
  });
  it('preserves a provided social list instead of defaulting to empty', () => {
    const d = mergeWithEmpty({ social: [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }] });
    expect(d.social).toHaveLength(1);
  });
  it('guards social against garbage input and defaults to empty array', () => {
    const d = mergeWithEmpty({ social: 'garbage' } as unknown as Partial<SignatureData>);
    expect(d.social).toEqual([]);
  });
});

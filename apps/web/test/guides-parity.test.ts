import { describe, expect, it } from 'vitest';

import { getExportChain, getGuides } from '../app/(app)/app/guides/guides.data';

/** Çeviri adım atlayamaz: iki dil aynı iskeleti taşır (spec §6). */
describe('guides içerik eşliği', () => {
  const en = getGuides('en');
  const tr = getGuides('tr');

  it('aynı slug listesi, aynı sırada', () => {
    expect(tr.map((g) => g.slug)).toEqual(en.map((g) => g.slug));
  });

  it('grup, adım ve not sayıları birebir', () => {
    en.forEach((guide, i) => {
      const t = tr[i]!;
      expect(t.groups.length).toBe(guide.groups.length);
      guide.groups.forEach((group, j) => {
        expect(t.groups[j]!.steps.length).toBe(group.steps.length);
      });
      expect((t.notes ?? []).length).toBe((guide.notes ?? []).length);
    });
  });

  it('ikon ve fidelity çeviride değişmez', () => {
    en.forEach((guide, i) => {
      expect(tr[i]!.icon).toBe(guide.icon);
      expect(tr[i]!.fidelity).toBe(guide.fidelity);
    });
  });

  it('export zinciri aynı uzunlukta', () => {
    expect(getExportChain('tr').length).toBe(getExportChain('en').length);
  });
});

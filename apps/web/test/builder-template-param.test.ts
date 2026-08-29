import { describe, expect, it } from 'vitest';

import { templateFromParam } from '../app/builder/template-param';

describe('templateFromParam', () => {
  it('geçerli id aynen döner', () => {
    expect(templateFromParam('classic-horizontal')).toBe('classic-horizontal');
    expect(templateFromParam('cta-banner')).toBe('cta-banner');
    expect(templateFromParam('photo-first')).toBe('photo-first');
  });

  it('geçersiz, boş, tanımsız veya dizi girdi undefined döner — 404 YOK', () => {
    // Galeri linki bayatlarsa ziyaretçi yine builder'a girsin; hata sayfası
    // görmesi için bir sebep yok.
    expect(templateFromParam('modern-split')).toBeUndefined();
    expect(templateFromParam('')).toBeUndefined();
    expect(templateFromParam(undefined)).toBeUndefined();
    expect(templateFromParam(['classic-horizontal'])).toBeUndefined();
  });
});

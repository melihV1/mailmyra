import { describe, expect, it } from 'vitest';

import { darkPreviewNote } from '../app/builder/Preview';

/**
 * Koyu zemin önizlemesinin bilgi notu. StyleStep'ten kaldırılmış kalıcı
 * koyu-zemin uyarısının (bkz. contrast-warnings.test.ts baş yorumu) geri
 * gelişi DEĞİL: bu not yalnız kullanıcı koyu önizlemeye BAKARKEN, baktığı
 * kutunun neden boş göründüğünü açıklar.
 */
describe('darkPreviewNote', () => {
  it('explains the empty-looking box for the default dark ink (#333333)', () => {
    expect(darkPreviewNote('#333333')).toMatch(/dark background/i);
  });

  it('appears for near-black text, the worst case (#1a1a1a on #1a1a1a)', () => {
    expect(darkPreviewNote('#1a1a1a')).not.toBeNull();
  });

  it('stays quiet for light text that actually reads on dark (#ffffff)', () => {
    expect(darkPreviewNote('#ffffff')).toBeNull();
  });

  it('stays quiet for a mid tone that clears the readable line (#9aa4b0)', () => {
    // #9aa4b0 koyu zeminde ~5.3:1 — okunur; not gereksiz yere çıkmamalı.
    expect(darkPreviewNote('#9aa4b0')).toBeNull();
  });

  it('stays quiet for an invalid hex instead of throwing', () => {
    expect(darkPreviewNote('not-a-color')).toBeNull();
  });
});

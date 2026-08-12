import { describe, expect, it } from 'vitest';

import { wrapPreviewDoc } from '../components/preview-doc';

describe('wrapPreviewDoc', () => {
  it('carries the fragment and the background color', () => {
    const doc = wrapPreviewDoc('<table>imza</table>', '#1a1a1a');
    expect(doc).toContain('<table>imza</table>');
    expect(doc).toContain('background:#1a1a1a');
  });

  it('keeps the signature at desktop e-posta width instead of squeezing it', () => {
    // İmza şablonu max-width:600px — dar panelde tablo küçülüp satırlar
    // yapay biçimde kırılıyordu ("dar sütun" şikâyeti). Sarmalayıcı 600px
    // taban genişliği garanti eder; dar panel sıkıştırmak yerine kaydırır.
    const doc = wrapPreviewDoc('<table>imza</table>', '#ffffff');
    expect(doc).toContain('min-width:600px');
  });

  it('lets a narrow pane scroll instead of clipping', () => {
    expect(wrapPreviewDoc('x', '#ffffff')).toContain('overflow:auto');
  });
});

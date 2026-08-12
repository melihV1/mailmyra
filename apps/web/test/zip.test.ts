import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { buildZip } from '../lib/zip';

describe('buildZip', () => {
  it('round-trips every file byte for byte', async () => {
    const buffer = await buildZip([
      { filename: 'ali-yilmaz.htm', content: '<!doctype html>A' },
      { filename: 'veli.htm', content: '<!doctype html>V' },
    ]);

    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files).sort()).toEqual(['ali-yilmaz.htm', 'veli.htm']);
    expect(await zip.file('ali-yilmaz.htm')!.async('string')).toBe('<!doctype html>A');
    expect(await zip.file('veli.htm')!.async('string')).toBe('<!doctype html>V');
  });
});

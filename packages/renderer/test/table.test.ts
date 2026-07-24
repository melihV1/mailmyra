import { describe, it, expect } from 'vitest';
import { table, row, cell } from '../src/utils/table';

describe('table', () => {
  it('always includes border="0" and border:none (Outlook 2512)', () => {
    const html = table(row(cell('x')));
    expect(html).toContain('border="0"');
    expect(html).toContain('border:none');
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
    expect(html).toContain('role="presentation"');
  });
  it('merges user style onto the base style', () => {
    expect(table('', { style: { 'background-color': '#fff' } })).toContain(
      'background-color:#fff',
    );
  });
});

describe('cell', () => {
  it('renders content with align', () => {
    expect(cell('hi', { align: 'center' })).toBe('<td align="center">hi</td>');
  });
  it('renders width and style', () => {
    expect(cell('x', { width: 90, style: { color: 'red' } })).toBe(
      '<td width="90" style="color:red">x</td>',
    );
  });
  it('renders bare content when no options', () => {
    expect(cell('a')).toBe('<td>a</td>');
  });
});

describe('row', () => {
  it('wraps cells in a tr', () => {
    expect(row('<td>a</td>')).toBe('<tr><td>a</td></tr>');
  });
});

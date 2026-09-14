import { styleToString, type StyleMap } from './inline-style';

export interface CellOptions {
  style?: StyleMap;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  /** Word motoru CSS zeminini her zaman uygulamıyor; attribute ile birlikte verilir. */
  bgcolor?: string;
  /** Sabit kutu boyu — Word `height` stilini tek başına tanımıyor. */
  height?: number | string;
  width?: number | string;
  colspan?: number;
}

export function cell(content: string, opts: CellOptions = {}): string {
  const attrs: string[] = [];
  if (opts.align) attrs.push(`align="${opts.align}"`);
  if (opts.valign) attrs.push(`valign="${opts.valign}"`);
  if (opts.bgcolor) attrs.push(`bgcolor="${opts.bgcolor}"`);
  if (opts.height !== undefined) attrs.push(`height="${opts.height}"`);
  if (opts.width !== undefined) attrs.push(`width="${opts.width}"`);
  if (opts.colspan) attrs.push(`colspan="${opts.colspan}"`);
  const style = opts.style ? styleToString(opts.style) : '';
  if (style) attrs.push(`style="${style}"`);
  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
  return `<td${attrStr}>${content}</td>`;
}

export function row(cells: string, opts: { style?: StyleMap } = {}): string {
  const style = opts.style ? styleToString(opts.style) : '';
  const styleAttr = style ? ` style="${style}"` : '';
  return `<tr${styleAttr}>${cells}</tr>`;
}

export interface TableOptions {
  style?: StyleMap;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export function table(rows: string, opts: TableOptions = {}): string {
  const attrs = ['border="0"', 'cellpadding="0"', 'cellspacing="0"', 'role="presentation"'];
  if (opts.width !== undefined) attrs.push(`width="${opts.width}"`);
  if (opts.align) attrs.push(`align="${opts.align}"`);
  // Outlook 2512: kenarlığı hem attribute hem style ile açıkça sıfırla.
  const style = styleToString({
    'border-collapse': 'collapse',
    border: 'none',
    'mso-table-lspace': '0pt',
    'mso-table-rspace': '0pt',
    ...opts.style,
  });
  attrs.push(`style="${style}"`);
  return `<table ${attrs.join(' ')}>${rows}</table>`;
}

import { BRAND } from '@mailmyra/renderer';

import { escapeHtml } from '../mail/templates/layout';
import type { MailBody } from '../mail/types';
import type { ReportResult, ReportTable } from './types';
import { windowLabel } from './window';

/**
 * Rapor digest'i de e-posta HTML'idir: layout.ts'in kurallarının aynısı —
 * tablo tabanlı yerleşim, bütün CSS satır içi, `<style>` yok, web-safe font,
 * `border="0"` her tabloda (Outlook 2512 kenarlık bug'ı). Gmail clipping'e
 * karşı satır tavanı: digest tabloda en çok DIGEST_TABLE_MAX_ROWS satır
 * gösterilir, kalanına not düşülür; CSV eki daima tamdır.
 */
export const DIGEST_TABLE_MAX_ROWS = 30;

/**
 * Marka paleti (Hüseyin, 2026-08-21: işlemsel şablonların krem kabuğu değil,
 * marka kimliği istendi — koyu lacivert başlık bandı + iki tonlu mavi).
 * E-postada CSS değişkeni çalışmaz: yüzey değerleri tokens.css'ten literal
 * kopya, mavi/turuncu tek kaynaktan (BRAND) gelir. Logo görseli bilinçli
 * yok: e-posta görselleri yalnız cdn.mailmyra.com'dan gidebilir ve logo
 * henüz orada değil — kelime markası metin olarak yazılır.
 */
const FONT = 'Arial, Helvetica, sans-serif';
const NAVY = '#0d1b2e'; // tokens.css --dark-bg — pazarlama kimliği
const NAVY_TEXT = '#eef3fa'; // --dark-text
const NAVY_MUTED = '#9db0c9'; // --dark-text-muted
const BLUE = BRAND.strong; // beyaz zeminde AA (5.45) — bölüm başlıkları
const ORANGE = BRAND.secondary; // koyu zeminde güçlü (8.11) — bant vurgusu
const SURFACE = '#f6f8fb'; // tokens.css --surface — dış zemin
const BORDER = '#dfe5ee'; // --border
const INK = '#333333'; // --text
const MUTED = '#666666'; // --text-muted

export function formatCents(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function sectionHtml(report: ReportResult): string {
  return report.sections
    .map(
      (s) => `<tr><td style="padding:24px 32px 0 32px;font:700 13px/1.3 ${FONT};color:${BLUE};letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(s.heading)}</td></tr>
<tr><td style="padding:8px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border:none;">
${s.items
  .map(
    (i) => `<tr>
<td style="padding:4px 0;font:400 14px/1.5 ${FONT};color:${MUTED};">${escapeHtml(i.label)}</td>
<td align="right" style="padding:4px 0;font:700 14px/1.5 ${FONT};color:${INK};">${escapeHtml(i.value)}</td>
</tr>`,
  )
  .join('')}
</table>
</td></tr>`,
    )
    .join('');
}

function tableHtml(table: ReportTable, csvAttached: boolean): string {
  const shown = table.rows.slice(0, DIGEST_TABLE_MAX_ROWS);
  const hidden = table.rows.length - shown.length;

  const head = table.columns
    .map(
      (c) =>
        `<td style="padding:6px 8px;font:700 12px/1.4 ${FONT};color:${MUTED};border-bottom:1px solid ${BORDER};">${escapeHtml(c)}</td>`,
    )
    .join('');
  const body = shown
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 8px;font:400 13px/1.4 ${FONT};color:${INK};border-bottom:1px solid ${BORDER};">${escapeHtml(String(cell))}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  // Kapak notu dürüst olmalı: CSV eki varsa satırlar orada tam duruyor,
  // yoksa gerçekten bu digest'ten atılmışlar.
  const noteText = csvAttached
    ? `+${hidden} more row${hidden === 1 ? '' : 's'} in the CSV attachment.`
    : `+${hidden} more row${hidden === 1 ? '' : 's'} omitted from this digest.`;
  const note =
    hidden > 0
      ? `<tr><td colspan="${table.columns.length}" style="padding:8px;font:400 12px/1.4 ${FONT};color:${MUTED};">${noteText}</td></tr>`
      : '';

  return `<tr><td style="padding:20px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border:none;">
<tr>${head}</tr>${body}${note}
</table>
</td></tr>`;
}

export function renderDigest(report: ReportResult, options?: { csvAttached?: boolean }): MailBody {
  const csvAttached = options?.csvAttached ?? false;
  const label = windowLabel(report.window);
  const subject = `[Mailmyra] ${report.title} — ${label}`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)}</title>
</head><body style="margin:0;padding:0;background-color:${SURFACE};">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:${SURFACE};margin:0;padding:0;border:none;">
<tr><td align="center" style="padding:32px 16px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${BORDER};">
<tr><td bgcolor="${BLUE}" style="background-color:${BLUE};height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td bgcolor="${NAVY}" style="background-color:${NAVY};padding:24px 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border:none;">
<tr>
<td style="font:700 18px/1.2 ${FONT};color:#ffffff;letter-spacing:-0.01em;">Mailmyra</td>
<td align="right" style="font:700 11px/1.2 ${FONT};color:${ORANGE};letter-spacing:0.14em;">STAFF REPORT</td>
</tr>
<tr><td colspan="2" style="padding:18px 0 0 0;font:700 24px/1.3 ${FONT};color:${NAVY_TEXT};">${escapeHtml(report.title)}</td></tr>
<tr><td colspan="2" style="padding:4px 0 0 0;font:400 13px/1.6 ${FONT};color:${NAVY_MUTED};">${escapeHtml(label)}</td></tr>
</table>
</td></tr>
${sectionHtml(report)}
${report.table ? tableHtml(report.table, csvAttached) : ''}
<tr><td style="padding:24px 32px 28px 32px;font:400 13px/1.6 ${FONT};color:${MUTED};border-top:1px solid ${BORDER};">Automated staff report. Generated by the Mailmyra report runner.</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const lines = [`${report.title} — ${label}`, ''];
  for (const s of report.sections) {
    lines.push(s.heading);
    for (const i of s.items) lines.push(`  ${i.label}: ${i.value}`);
    lines.push('');
  }
  if (report.table) lines.push(`Table: ${report.table.rows.length} rows (see the panel or the CSV attachment).`, '');

  return { subject, html, text: [...lines, '— Mailmyra'].join('\n') };
}

export function renderCsv(table: ReportTable): string {
  const cell = (v: string | number): string => {
    // Formül enjeksiyonu koruması: org adı kullanıcı yazımı; personel CSV'yi
    // Excel'de açar. `=`, `+`, `-`, `@`, TAB veya CR ile başlayan hücre
    // Excel'de formül olarak yorumlanır — başına `'` koyarak metne sabitliyoruz.
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (row: Array<string | number>) => row.map(cell).join(',');
  return [line(table.columns), ...table.rows.map(line)].join('\r\n') + '\r\n';
}

export function csvFilename(reportId: string, end: Date): string {
  return `${reportId}-${end.toISOString().slice(0, 10)}.csv`;
}

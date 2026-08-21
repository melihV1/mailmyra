import { BRAND } from '@mailmyra/renderer';

/**
 * İşlemsel e-postaların ortak kabuğu.
 *
 * Bunlar da e-posta HTML'i: imzalarımıza uyguladığımız kısıtların aynısı
 * geçerli. Tablo tabanlı yerleşim, bütün CSS satır içi, `<style>` yok, web
 * fontu yok, `border="0"` her tabloda açıkça yazılı (Outlook 2512 aksi hâlde
 * istenmeyen kenarlık ekliyor).
 *
 * Sağlayıcıdan tamamen bağımsız — üretilen tek şey bir metin parçası.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Org adı gibi kullanıcı yazımı değerler için. `&` önce gelmeli. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

const FONT = 'Arial, Helvetica, sans-serif';
const INK = '#00102b';
const MUTED = '#5b6472';
const LINE = '#e4ddd2';
const PAPER = '#f4efe8';

/** Rapor digest'i gibi diğer e-posta üreticileri aynı evi kullansın diye. */
export const EMAIL_PALETTE = {
  font: FONT,
  ink: INK,
  muted: MUTED,
  line: LINE,
  paper: PAPER,
} as const;

export interface LayoutInput {
  heading: string;
  /** Zaten kaçırılmış HTML parçacıkları. */
  paragraphs: string[];
  actionUrl: string;
  actionLabel: string;
  /** Linkin ne kadar geçerli olduğu gibi küçük punto kapanış notu. */
  footnote: string;
}

export function renderLayout(input: LayoutInput): string {
  const { heading, paragraphs, actionUrl, actionLabel, footnote } = input;
  const url = escapeHtml(actionUrl);

  const body = paragraphs
    .map(
      (p) =>
        `<tr><td style="padding:0 0 16px 0;font:400 16px/1.6 ${FONT};color:${INK};">${p}</td></tr>`,
    )
    .join('');

  // `<meta charset>` belgenin içinde de duruyor: MIME başlığı zaten söylüyor
  // ama onu yok sayan istemciler var ve müşteri org adları "Şişli Ajans"
  // olacak. `viewport` mobilde metnin küçülmemesi için.
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head><body style="margin:0;padding:0;background-color:${PAPER};">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:${PAPER};margin:0;padding:0;">
<tr><td align="center" style="padding:32px 16px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${LINE};">
<tr><td style="padding:28px 32px 0 32px;font:700 18px/1.2 ${FONT};color:${INK};letter-spacing:-0.01em;">Mailmyra</td></tr>
<tr><td style="padding:20px 32px 0 32px;font:700 24px/1.3 ${FONT};color:${INK};">${heading}</td></tr>
<tr><td style="padding:20px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">${body}</table>
</td></tr>
<tr><td style="padding:8px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation">
<tr><td bgcolor="${BRAND.strong}" style="background-color:${BRAND.strong};padding:14px 28px;">
<a href="${url}" style="font:700 16px/1 ${FONT};color:#ffffff;text-decoration:none;display:inline-block;">${escapeHtml(actionLabel)}</a>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;font:400 13px/1.6 ${FONT};color:${MUTED};">
If the button does not work, copy this address into your browser:<br>${url}
</td></tr>
<tr><td style="padding:20px 32px 28px 32px;font:400 13px/1.6 ${FONT};color:${MUTED};border-top:1px solid ${LINE};">${footnote}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/** Düz metin karşılığı. HTML okumayan istemciler ve spam puanı için şart. */
export function renderText(lines: string[], actionUrl: string, footnote: string): string {
  return [...lines, '', actionUrl, '', footnote, '', '— Mailmyra'].join('\n');
}

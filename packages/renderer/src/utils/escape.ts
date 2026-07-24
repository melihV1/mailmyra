export function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Yalnızca güvenli şemalara izin verir (http/https/mailto/tel). Protokol-göreli
 * URL'leri https'e yükseltir. Bilinmeyen şema (ör. javascript:) '#' döner.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return htmlEscape(trimmed);
  if (/^\/\//.test(trimmed)) return htmlEscape(`https:${trimmed}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '#';
  return htmlEscape(trimmed);
}

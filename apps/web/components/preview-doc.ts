/**
 * İmza fragment'ini iframe srcDoc dokümanına sarar.
 * Hafta 1 gözlemi: ilk satır kırpılabiliyordu — body'de yeterli üst padding
 * ve içerik akışını bozan margin bırakılmaz.
 *
 * min-width:600px — imza şablonu max-width:600px; sarmalayıcı olmadan dar
 * panel tabloyu küçültüp satırları yapay biçimde kırıyordu ("dar sütun").
 * Taban genişliği masaüstü e-posta istemcisinin gösterdiği hâldir; dar panel
 * sıkıştırmak yerine yatay kaydırır (body'de overflow:auto zaten var).
 */
export function wrapPreviewDoc(fragment: string, bg: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    `<body style="margin:0;padding:20px 16px;background:${bg};overflow:auto;">` +
    `<div style="min-width:600px">${fragment}</div></body></html>`
  );
}

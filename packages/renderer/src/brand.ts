/**
 * Marka renkleri — TEK KAYNAK (spec: 2026-07-27-brand-identity-design.md).
 *
 * Renderer paketinde durur çünkü hem apps/web hem fixture'lar bunu paylaşır
 * ve bu değerler `SignatureData`'ya giren alan verisidir. Sabittir, davranış
 * içermez — renderer saf kalır.
 *
 * Site arayüzü bunları `apps/web/app/tokens.css` üzerinden CSS değişkeni
 * olarak kullanır. E-posta HTML'inde CSS değişkeni ÇALIŞMAZ; orada daima
 * literal hex gider.
 */
export const BRAND = {
  primary: '#7b9fd3',
  secondary: '#e0a66c',
} as const;

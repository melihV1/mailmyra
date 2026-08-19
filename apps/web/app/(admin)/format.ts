/** Admin ekranlarının ortak biçimleyicileri — tek yerde, sayfalar kopyalamaz. */

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 10);
}

/** Cent → "12.00 USD". Kayan noktalı para yok; bölme yalnız gösterimde. */
export function fmtMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export const STATE_BADGE: Record<string, string> = {
  trial: 'bg-label-info',
  active: 'bg-label-success',
  past_due: 'bg-label-warning',
  cancelled: 'bg-label-secondary',
};

export const INVOICE_BADGE: Record<string, string> = {
  due: 'bg-label-warning',
  paid: 'bg-label-success',
  void: 'bg-label-secondary',
};

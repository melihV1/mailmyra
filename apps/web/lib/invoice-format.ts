import type { InvoiceRow, InvoiceStatus } from './repo/invoices';

/** Cent → "$1.00". USD dışında sembol uydurmayız, kod + tutar yazarız. */
export function money(cents: number, currency: string): string {
  const value = (cents / 100).toFixed(2);
  return currency === 'USD' ? `$${value}` : `${value} ${currency}`;
}

/** Fatura tarihi — panel dili EN, "25 Apr 2026". */
export function invoiceDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { label: string; cls: string }> = {
  due: { label: 'Due', cls: 'bg-label-warning' },
  paid: { label: 'Paid', cls: 'bg-label-success' },
  void: { label: 'Void', cls: 'bg-label-secondary' },
};

/**
 * Kalem satırı + toplamlar. `amountCents` gerçeğin kaynağı — koltuk×birim
 * toplamından saparsa fark "Adjustment" satırı olarak görünür (manuel
 * pazarlıkların izi kaybolmasın).
 */
export function invoiceTotals(inv: InvoiceRow): {
  lineTotalCents: number;
  adjustmentCents: number;
} {
  const lineTotalCents = inv.seats * inv.unitCents;
  return { lineTotalCents, adjustmentCents: inv.amountCents - lineTotalCents };
}

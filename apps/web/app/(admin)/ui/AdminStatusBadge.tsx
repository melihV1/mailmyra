/**
 * Durum rozeti — plan/fatura durumlarının TEK görsel sözlüğü. Sayfalara
 * ton haritası kopyalanmaz; renk kararı değişirse tek yerden değişir.
 */
const TONES: Record<string, string> = {
  // entitlement
  trial: 'bg-label-info',
  active: 'bg-label-success',
  past_due: 'bg-label-warning',
  cancelled: 'bg-label-secondary',
  // invoice
  due: 'bg-label-warning',
  paid: 'bg-label-success',
  void: 'bg-label-secondary',
  // sender
  live: 'bg-label-success',
  draft: 'bg-label-info',
  inactive: 'bg-label-secondary',
};

export function AdminStatusBadge({ value }: { value: string }) {
  return <span className={`badge ${TONES[value] ?? 'bg-label-secondary'}`}>{value}</span>;
}

import type { AdminOrgRow, AdminQueues } from '../../lib/repo/admin';

/**
 * Komuta merkezinin TEK kuyruk yüzeyinin veri modeli (redesign brief §5.3):
 * dört ayrı kuyruk kartı yerine önem + vadeye göre sıralanmış tek liste,
 * segment kontrolüyle süzülür.
 *
 * Saf fonksiyonlar — DOM yok, DB yok: sıralama ve segment kuralları
 * `admin-queue-model.test.ts`te sınanıyor. Kural ekranda değil burada
 * yaşar ki mobil/masaüstü aynı sırayı göstersin.
 */

export type QueueCategory = 'trial' | 'entitlement' | 'billing' | 'activation';
export type QueueSegment = 'all' | QueueCategory;

export interface QueueRow {
  key: string;
  orgId: string;
  orgName: string;
  category: QueueCategory;
  /** İnsan-okur sebep — "Trial ends in 3 days", "2 seats over" gibi. */
  reason: string;
  /** Yaş/vade etiketi — sağ sütunda küçük gösterilir. */
  when: string;
  /** 3 = bugün eylem (danger) · 2 = bu hafta (warning) · 1 = takip (info). */
  severity: 1 | 2 | 3;
  /** Sıralama anahtarı: küçük = daha acil (ms cinsinden vade/yaş). */
  deadlineMs: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Aktivasyon eşiği: bu yaştan eski VE hiç canlı göndericisi olmayan
 *  müşteri "takıldı" sayılır. 3 gün — ilk gün kurcalama normal, hafta değil. */
export const ACTIVATION_STALE_DAYS = 3;

export function buildQueueRows(
  orgs: readonly AdminOrgRow[],
  queues: Pick<AdminQueues, 'trialsEnding' | 'overEntitlement' | 'expiredTrials' | 'overdueInvoices'>,
  now: number,
): QueueRow[] {
  const rows: QueueRow[] = [];

  for (const o of queues.expiredTrials) {
    const days = Math.floor((now - (o.trialEndsAt?.getTime() ?? now)) / DAY);
    rows.push({
      key: `trial-expired:${o.id}`,
      orgId: o.id,
      orgName: o.name,
      category: 'trial',
      reason: 'Trial expired but still marked trial',
      when: `${days}d ago`,
      severity: 3,
      deadlineMs: o.trialEndsAt?.getTime() ?? 0,
    });
  }

  for (const o of queues.trialsEnding) {
    const end = o.trialEndsAt?.getTime() ?? now;
    const days = Math.max(0, Math.ceil((end - now) / DAY));
    rows.push({
      key: `trial-ending:${o.id}`,
      orgId: o.id,
      orgName: o.name,
      category: 'trial',
      reason: days <= 1 ? 'Trial ends today/tomorrow' : `Trial ends in ${days} days`,
      when: `in ${days}d`,
      severity: days <= 2 ? 3 : 2,
      deadlineMs: end,
    });
  }

  for (const o of queues.overEntitlement) {
    const over = o.activeSeats - o.entitledSeats;
    rows.push({
      key: `entitlement:${o.id}`,
      orgId: o.id,
      orgName: o.name,
      category: 'entitlement',
      reason: `${over} seat${over === 1 ? '' : 's'} over entitlement (${o.activeSeats}/${o.entitledSeats})`,
      when: 'now',
      severity: 3,
      deadlineMs: 0,
    });
  }

  for (const inv of queues.overdueInvoices) {
    rows.push({
      key: `billing:${inv.id}`,
      orgId: inv.orgId,
      orgName: inv.orgName,
      category: 'billing',
      reason: `Invoice ${inv.number} overdue`,
      when: `${inv.overdueDays}d overdue`,
      severity: inv.overdueDays > 14 ? 3 : 2,
      deadlineMs: inv.dueAt.getTime(),
    });
  }

  /* Aktivasyon kuyruğu türetilir, repo'dan gelmez: canlı koltuğu 0 olan ve
     eşikten eski müşteri. `cancelled` hariç — gitmiş müşteriyi kovalamayız. */
  for (const o of orgs) {
    if (o.activeSeats > 0) continue;
    if (o.entitlementState === 'cancelled') continue;
    const age = now - o.createdAt.getTime();
    if (age < ACTIVATION_STALE_DAYS * DAY) continue;
    rows.push({
      key: `activation:${o.id}`,
      orgId: o.id,
      orgName: o.name,
      category: 'activation',
      reason: 'No live sender yet',
      when: `${Math.floor(age / DAY)}d old`,
      severity: 1,
      deadlineMs: o.createdAt.getTime(),
    });
  }

  // Önem önce (acil üstte), eşitse vadesi yakın/yaşı büyük üstte.
  return rows.sort((a, b) => b.severity - a.severity || a.deadlineMs - b.deadlineMs);
}

export function filterQueue(rows: readonly QueueRow[], segment: QueueSegment): QueueRow[] {
  return segment === 'all' ? [...rows] : rows.filter((r) => r.category === segment);
}

export const QUEUE_SEGMENTS: ReadonlyArray<{ value: QueueSegment; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'trial', label: 'Trial' },
  { value: 'entitlement', label: 'Entitlement' },
  { value: 'billing', label: 'Billing' },
  { value: 'activation', label: 'Activation' },
];

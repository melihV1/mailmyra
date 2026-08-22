import type { ReportBuilder } from '../types';

/**
 * Destek operasyonları — anlık kuyruk fotoğrafı (customer-health emsali):
 * TEK sorgu, geri kalan her şey JS'te türetilir. Status/priority kırılımı
 * KOŞU ANINA göre; pencere yalnız "bu aralıkta açılan" ve SLA aşımı için
 * kullanılır (`slaDueAt < window.end && status !== 'resolved'` — tam o anda
 * biten vaka AŞILMIŞ SAYILMAZ, sınır kesin küçüktür).
 *
 * İÇERİK SINIRI: `requesterEmail` ASLA seçilmez (activation-builder select
 * disiplini) — tabloya yalnız referans, org adı, kategori, öncelik, durum
 * ve türetilmiş vade etiketi girer.
 */
const DAY = 24 * 60 * 60 * 1000;

const CASE_STATUSES = ['open', 'waiting_customer', 'escalated', 'resolved'] as const;
const CASE_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

const STATUS_LABEL: Record<(typeof CASE_STATUSES)[number], string> = {
  open: 'Open',
  waiting_customer: 'Waiting on customer',
  escalated: 'Escalated',
  resolved: 'Resolved',
};

const PRIORITY_LABEL: Record<(typeof CASE_PRIORITIES)[number], string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

/** `Xd left` / `Xd overdue` — pencere sonuna göre; küsurat bile 1 gün sayılır. */
function dueLabel(slaDueAt: Date, end: Date): string {
  const diffMs = slaDueAt.getTime() - end.getTime();
  if (diffMs >= 0) return `${Math.floor(diffMs / DAY)}d left`;
  return `${Math.ceil(-diffMs / DAY)}d overdue`;
}

export const buildSupportOperations: ReportBuilder = async (db, window) => {
  const cases = await db.supportCase.findMany({
    select: {
      reference: true,
      orgName: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      slaDueAt: true,
    },
  });

  const byStatus = new Map<string, number>();
  const byPriorityUnresolved = new Map<string, number>();
  let openedInWindow = 0;
  let slaBreaches = 0;

  for (const c of cases) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
    if (c.status !== 'resolved') {
      byPriorityUnresolved.set(c.priority, (byPriorityUnresolved.get(c.priority) ?? 0) + 1);
      if (c.slaDueAt.getTime() < window.end.getTime()) slaBreaches += 1;
    }
    if (c.createdAt.getTime() >= window.start.getTime() && c.createdAt.getTime() < window.end.getTime()) {
      openedInWindow += 1;
    }
  }

  const unresolved = cases
    .filter((c) => c.status !== 'resolved')
    .sort((a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime());

  return {
    reportId: 'support-operations',
    title: 'Support operations',
    window,
    sections: [
      {
        heading: 'Open cases',
        items: CASE_STATUSES.map((status) => ({
          label: STATUS_LABEL[status],
          value: String(byStatus.get(status) ?? 0),
        })),
      },
      {
        heading: 'Priority pressure',
        items: CASE_PRIORITIES.map((priority) => ({
          label: PRIORITY_LABEL[priority],
          value: String(byPriorityUnresolved.get(priority) ?? 0),
        })),
      },
      {
        heading: 'Window',
        items: [
          { label: 'Opened in window', value: String(openedInWindow) },
          { label: 'Escalated', value: String(byStatus.get('escalated') ?? 0) },
          { label: 'SLA breaches', value: String(slaBreaches) },
        ],
      },
    ],
    table: {
      columns: ['Reference', 'Customer', 'Category', 'Priority', 'Status', 'Due'],
      rows: unresolved.map((c) => [
        c.reference,
        c.orgName || '—',
        c.category,
        c.priority,
        c.status,
        dueLabel(c.slaDueAt, window.end),
      ]),
    },
  };
};

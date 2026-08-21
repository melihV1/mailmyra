import type { ReportBuilder } from '../types';

/**
 * Müşteri sağlığı — anlık portföy fotoğrafı; "inactive days" pencere sonuna
 * (koşu anına) göre. İÇERİK SINIRI: org adı + sayımlar; üye/gönderici kişi
 * verisi sorgulanmaz (groupBy yalnız orgId döndürür). KPI hizası:
 * seat-utilization (payda >0 şartı — 0 koltuk '—' gösterir).
 */
const DAY = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 14;

export const buildCustomerHealth: ReportBuilder = async (db, window) => {
  const [orgs, seatGroups, lastActivity, overdueGroups] = await Promise.all([
    db.organization.findMany({
      select: { id: true, name: true, entitledSeats: true, entitlementState: true },
      orderBy: { name: 'asc' },
    }),
    db.senderIdentity.groupBy({
      by: ['orgId'],
      where: { publishedAt: { not: null }, deactivatedAt: null },
      _count: { _all: true },
    }),
    db.activityEvent.groupBy({ by: ['orgId'], _max: { createdAt: true } }),
    db.invoice.groupBy({
      by: ['orgId'],
      where: { status: 'due', dueAt: { lt: window.end } },
      _count: { _all: true },
    }),
  ]);

  const seatByOrg = new Map(seatGroups.map((g) => [g.orgId, g._count._all]));
  const lastByOrg = new Map(lastActivity.map((g) => [g.orgId, g._max.createdAt]));
  const overdueByOrg = new Map(overdueGroups.map((g) => [g.orgId, g._count._all]));

  const rows = orgs.map((o) => {
    const active = seatByOrg.get(o.id) ?? 0;
    const util = o.entitledSeats > 0 ? `${Math.round((active / o.entitledSeats) * 100)}%` : '—';
    const last = lastByOrg.get(o.id) ?? null;
    const inactive = last
      ? String(Math.max(0, Math.floor((window.end.getTime() - last.getTime()) / DAY)))
      : '—';
    return [o.name, o.entitlementState, active, o.entitledSeats, util, inactive, overdueByOrg.get(o.id) ?? 0];
  });

  const over80 = orgs.filter(
    (o) => o.entitledSeats > 0 && (seatByOrg.get(o.id) ?? 0) / o.entitledSeats >= 0.8,
  ).length;
  const inactive14 = orgs.filter((o) => {
    const last = lastByOrg.get(o.id);
    return !last || window.end.getTime() - last.getTime() >= INACTIVE_DAYS * DAY;
  }).length;

  return {
    reportId: 'customer-health',
    title: 'Customer health',
    window,
    sections: [
      {
        heading: 'Portfolio',
        items: [
          { label: 'Customers', value: String(orgs.length) },
          { label: 'At ≥80% seat utilization', value: String(over80) },
          { label: 'With overdue invoices', value: String(overdueGroups.length) },
          { label: `Inactive ≥${INACTIVE_DAYS} days (or never)`, value: String(inactive14) },
        ],
      },
    ],
    table: {
      columns: ['Organization', 'State', 'Active seats', 'Entitled seats', 'Utilization', 'Inactive days', 'Overdue invoices'],
      rows,
    },
  };
};

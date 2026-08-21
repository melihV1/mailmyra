import { formatCents } from '../render';
import type { ReportBuilder } from '../types';

/**
 * Yönetici özeti — İÇERİK SINIRI: yalnız agregalar, org adı bile yok.
 * Formüller reporting-model.ts KPI tanımlarıyla hizalı: active-seats
 * (taslak/pasif hariç), billed-revenue (para birimleri asla tek toplamda
 * karışmaz — para birimi başına ayrı kalem).
 */
export const buildCommandCenter: ReportBuilder = async (db, window) => {
  const inWindow = { gte: window.start, lt: window.end };

  const [
    orgTotal,
    orgActive,
    orgTrial,
    orgNew,
    activeSeats,
    entitled,
    outstanding,
    overdue,
    publishedInWindow,
    failedJobs,
    newErrorGroups,
    openErrorGroups,
  ] = await Promise.all([
    db.organization.count(),
    db.organization.count({ where: { entitlementState: 'active' } }),
    db.organization.count({ where: { entitlementState: 'trial' } }),
    db.organization.count({ where: { createdAt: inWindow } }),
    db.senderIdentity.count({ where: { publishedAt: { not: null }, deactivatedAt: null } }),
    db.organization.aggregate({ _sum: { entitledSeats: true } }),
    db.invoice.groupBy({
      by: ['currency'],
      where: { status: 'due' },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    db.invoice.groupBy({
      by: ['currency'],
      where: { status: 'due', dueAt: { lt: window.end } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    db.senderIdentity.count({ where: { publishedAt: inWindow } }),
    db.jobRun.count({ where: { state: 'failed', scheduledAt: inWindow } }),
    db.errorGroup.count({ where: { firstSeenAt: inWindow } }),
    db.errorGroup.count({ where: { state: 'open' } }),
  ]);

  type MoneyGroup = { currency: string; _sum: { amountCents: number | null }; _count: { _all: number } };
  const money = (groups: MoneyGroup[]): string =>
    groups.length
      ? groups
          .map((g) => `${formatCents(g._sum.amountCents ?? 0, g.currency)} (${g._count._all})`)
          .join(' · ')
      : '0';

  return {
    reportId: 'command-center',
    title: 'Executive command center',
    window,
    sections: [
      {
        heading: 'Customers',
        items: [
          { label: 'Total workspaces', value: String(orgTotal) },
          { label: 'Active', value: String(orgActive) },
          { label: 'On trial', value: String(orgTrial) },
          { label: 'New in window', value: String(orgNew) },
        ],
      },
      {
        heading: 'Seats',
        items: [
          { label: 'Active seats', value: String(activeSeats) },
          { label: 'Entitled seats', value: String(entitled._sum.entitledSeats ?? 0) },
        ],
      },
      {
        heading: 'Receivables',
        items: [
          { label: 'Outstanding', value: money(outstanding as MoneyGroup[]) },
          { label: 'Overdue', value: money(overdue as MoneyGroup[]) },
        ],
      },
      {
        heading: 'Product',
        items: [{ label: 'Senders published in window', value: String(publishedInWindow) }],
      },
      {
        heading: 'Open risks',
        items: [
          { label: 'Failed jobs in window', value: String(failedJobs) },
          { label: 'New error groups in window', value: String(newErrorGroups) },
          { label: 'Open error groups', value: String(openErrorGroups) },
        ],
      },
    ],
  };
};

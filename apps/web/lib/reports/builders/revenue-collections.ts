import { formatCents } from '../render';
import type { ReportBuilder } from '../types';

/**
 * Gelir & tahsilat — pencere `issuedAt` üstünde. İÇERİK SINIRI: org adı +
 * tutarlar (Voldi'nin kendi ticari kaydı, listLeads emsali); üye/kişi verisi
 * SORGULANMAZ. KPI hizası: billed-revenue (void hariç, para birimi asla
 * karışmaz), collection-rate (paid/billed, payda void'siz).
 */
interface Bucket {
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

export const buildRevenueCollections: ReportBuilder = async (db, window) => {
  const invoices = await db.invoice.findMany({
    where: { issuedAt: { gte: window.start, lt: window.end } },
    select: {
      amountCents: true,
      currency: true,
      status: true,
      dueAt: true,
      org: { select: { name: true } },
    },
  });

  const zero = (): Bucket => ({ billed: 0, collected: 0, outstanding: 0, overdue: 0 });
  const add = (b: Bucket, inv: (typeof invoices)[number]) => {
    if (inv.status === 'void') return;
    b.billed += inv.amountCents;
    if (inv.status === 'paid') b.collected += inv.amountCents;
    if (inv.status === 'due') {
      b.outstanding += inv.amountCents;
      if (inv.dueAt && inv.dueAt < window.end) b.overdue += inv.amountCents;
    }
  };

  const byCurrency = new Map<string, Bucket>();
  const byOrg = new Map<string, Bucket & { name: string; currency: string }>();
  for (const inv of invoices) {
    const c = byCurrency.get(inv.currency) ?? zero();
    add(c, inv);
    byCurrency.set(inv.currency, c);

    const key = `${inv.org.name}|${inv.currency}`;
    const o = byOrg.get(key) ?? { ...zero(), name: inv.org.name, currency: inv.currency };
    add(o, inv);
    byOrg.set(key, o);
  }

  const sections = [...byCurrency.entries()]
    .filter(([, b]) => b.billed > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, b]) => ({
      heading: `Totals (${currency})`,
      items: [
        { label: 'Billed', value: formatCents(b.billed, currency) },
        { label: 'Collected', value: formatCents(b.collected, currency) },
        { label: 'Outstanding', value: formatCents(b.outstanding, currency) },
        { label: 'Overdue', value: formatCents(b.overdue, currency) },
        {
          label: 'Collection rate',
          value: b.billed > 0 ? `${Math.round((b.collected / b.billed) * 100)}%` : '—',
        },
      ],
    }));

  const money = (cents: number) => (cents / 100).toFixed(2);
  const tableRows = [...byOrg.values()]
    .filter((b) => b.billed > 0)
    .sort((a, b) => b.billed - a.billed || a.name.localeCompare(b.name))
    .map((b) => [b.name, b.currency, money(b.billed), money(b.collected), money(b.outstanding), money(b.overdue)]);

  return {
    reportId: 'revenue-collections',
    title: 'Revenue & collections',
    window,
    sections: sections.length
      ? sections
      : [{ heading: 'Totals', items: [{ label: 'Invoices in window', value: '0' }] }],
    table: {
      columns: ['Organization', 'Currency', 'Billed', 'Collected', 'Outstanding', 'Overdue'],
      rows: tableRows,
    },
  };
};

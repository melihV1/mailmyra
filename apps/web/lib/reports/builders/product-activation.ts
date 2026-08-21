import type { ReportBuilder } from '../types';

/**
 * Aktivasyon hunisi — kohort: pencerede AÇILAN org'lar; payda SABİT kalır
 * (KPI: activation-rate). Export kanıtı ActivityEvent `export.*` tipleri
 * (KPI: export-evidence — Mailmyra dışı elle kurulum gözlemlenemez, payda
 * aktive olanlar). İÇERİK SINIRI: SenderIdentity'den YALNIZ orgId çekilir —
 * gönderici e-postası/adı bu rapora asla giremez.
 */
export const buildProductActivation: ReportBuilder = async (db, window) => {
  const cohort = await db.organization.findMany({
    where: { createdAt: { gte: window.start, lt: window.end } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const ids = cohort.map((o) => o.id);

  const [withSignature, published, withExport] = ids.length
    ? await Promise.all([
        db.signature.findMany({
          where: { orgId: { in: ids } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
        db.senderIdentity.findMany({
          where: { orgId: { in: ids }, publishedAt: { not: null } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
        db.activityEvent.findMany({
          where: { orgId: { in: ids }, type: { startsWith: 'export.' } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
      ])
    : [[], [], []];

  const sigSet = new Set(withSignature.map((r) => r.orgId));
  const pubSet = new Set(published.map((r) => r.orgId));
  const expSet = new Set(withExport.map((r) => r.orgId));

  const pct = (num: number, den: number): string =>
    den > 0 ? `${Math.round((num / den) * 100)}%` : '—';
  const yn = (b: boolean) => (b ? 'yes' : 'no');

  return {
    reportId: 'product-activation',
    title: 'Product activation',
    window,
    sections: [
      {
        heading: 'Cohort (workspaces created in window)',
        items: [
          { label: 'Workspaces created', value: String(cohort.length) },
          { label: 'With saved signature', value: String(sigSet.size) },
          { label: 'With published sender', value: String(pubSet.size) },
          { label: 'With export evidence', value: String(expSet.size) },
          { label: 'Activation rate', value: pct(sigSet.size, cohort.length) },
          { label: 'Export evidence rate', value: pct(expSet.size, sigSet.size) },
        ],
      },
    ],
    table: {
      columns: ['Organization', 'Created', 'Signature', 'Published', 'Export'],
      rows: cohort.map((o) => [
        o.name,
        o.createdAt.toISOString().slice(0, 10),
        yn(sigSet.has(o.id)),
        yn(pubSet.has(o.id)),
        yn(expSet.has(o.id)),
      ]),
    },
  };
};

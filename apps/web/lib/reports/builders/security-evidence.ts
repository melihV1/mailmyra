import type { ReportBuilder } from '../types';

/**
 * Güvenlik kanıt paketi — pencere içindeki StaffAccess/AdminAction sayımları.
 * İÇERİK SINIRI: yalnız Voldi personel e-postası + sayımlar; müşteri org
 * ADI bile gerekmez (orgId yalnız gruplama anahtarı, rapora yazılmaz).
 * KPI: sensitive-read-burst — aynı personel + aynı org, 15 dakikada ≥5
 * okuma. Sinyal = eşiği en az bir kez aşan (personel, org) çifti; "sinyal
 * kanıt değildir" guardrail'i digest metnine değil sayıya bağlıdır.
 */
export const BURST_READS = 5;
export const BURST_WINDOW_MS = 15 * 60 * 1000;

export const buildSecurityEvidence: ReportBuilder = async (db, window) => {
  const createdAt = { gte: window.start, lt: window.end };

  const [reads, writes, accessRows] = await Promise.all([
    db.staffAccess.groupBy({ by: ['staffEmail'], where: { createdAt }, _count: { _all: true } }),
    db.adminAction.groupBy({ by: ['staffEmail'], where: { createdAt }, _count: { _all: true } }),
    db.staffAccess.findMany({
      where: { createdAt },
      select: { staffEmail: true, orgId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const byPair = new Map<string, number[]>();
  for (const r of accessRows) {
    const key = `${r.staffEmail}|${r.orgId}`;
    const arr = byPair.get(key) ?? [];
    arr.push(r.createdAt.getTime());
    byPair.set(key, arr);
  }
  let burstSignals = 0;
  for (const times of byPair.values()) {
    for (let i = 0; i + BURST_READS - 1 < times.length; i++) {
      const first = times[i];
      const last = times[i + BURST_READS - 1];
      if (first !== undefined && last !== undefined && last - first <= BURST_WINDOW_MS) {
        burstSignals += 1;
        break;
      }
    }
  }

  const readByEmail = new Map(reads.map((g) => [g.staffEmail, g._count._all]));
  const writeByEmail = new Map(writes.map((g) => [g.staffEmail, g._count._all]));
  const emails = [...new Set([...readByEmail.keys(), ...writeByEmail.keys()])].sort();

  const totalReads = [...readByEmail.values()].reduce((n, c) => n + c, 0);
  const totalWrites = [...writeByEmail.values()].reduce((n, c) => n + c, 0);

  return {
    reportId: 'security-evidence',
    title: 'Security evidence pack',
    window,
    sections: [
      {
        heading: 'Window totals',
        items: [
          { label: 'Sensitive reads', value: String(totalReads) },
          { label: 'Privileged writes', value: String(totalWrites) },
          { label: 'Read-burst review signals', value: String(burstSignals) },
        ],
      },
    ],
    table: {
      columns: ['Staff', 'Sensitive reads', 'Privileged writes'],
      rows: emails.map((e) => [e, readByEmail.get(e) ?? 0, writeByEmail.get(e) ?? 0]),
    },
  };
};

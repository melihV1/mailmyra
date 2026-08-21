import { describe, expect, it } from 'vitest';

import {
  BURST_READS,
  BURST_WINDOW_MS,
  buildSecurityEvidence,
} from '../lib/reports/builders/security-evidence';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};
const T0 = WINDOW.start.getTime();
const MIN = 60 * 1000;

function fakeDb(accessRows: Array<{ staffEmail: string; orgId: string; createdAt: Date }>) {
  const reads = new Map<string, number>();
  for (const r of accessRows) {
    const current = reads.get(r.staffEmail) ?? 0;
    reads.set(r.staffEmail, current + 1);
  }
  return {
    staffAccess: {
      groupBy: () =>
        Promise.resolve([...reads.entries()].map(([staffEmail, n]) => ({ staffEmail, _count: { _all: n } }))),
      findMany: () => Promise.resolve(accessRows),
    },
    adminAction: {
      groupBy: () => Promise.resolve([{ staffEmail: 'huseyin@voldi.net', _count: { _all: 3 } }]),
    },
  } as unknown as ReportsDb;
}

/** i dakikada bir okuma — aynı personel + org. */
const burst = (n: number, stepMs: number): Array<{ staffEmail: string; orgId: string; createdAt: Date }> =>
  Array.from({ length: n }, (_, i) => ({
    staffEmail: 'huseyin@voldi.net',
    orgId: 'org1',
    createdAt: new Date(T0 + i * stepMs),
  }));

describe('buildSecurityEvidence', () => {
  it('counts a burst signal for ≥5 reads on one org within 15 minutes', async () => {
    const report = await buildSecurityEvidence(fakeDb(burst(BURST_READS, MIN)), WINDOW);
    expect(report.sections[0]!.items).toContainEqual({ label: 'Read-burst review signals', value: '1' });
  });

  it('spread-out reads produce no signal', async () => {
    const report = await buildSecurityEvidence(
      fakeDb(burst(BURST_READS, BURST_WINDOW_MS)), // her okuma 15 dk arayla
      WINDOW,
    );
    expect(report.sections[0]!.items).toContainEqual({ label: 'Read-burst review signals', value: '0' });
  });

  it('a pair counts once no matter how long the burst is', async () => {
    const report = await buildSecurityEvidence(fakeDb(burst(20, MIN)), WINDOW);
    expect(report.sections[0]!.items).toContainEqual({ label: 'Read-burst review signals', value: '1' });
  });

  it('tabulates reads and writes per staff member', async () => {
    const rows = [
      ...burst(2, MIN),
      { staffEmail: 'destek@voldi.net', orgId: 'org2', createdAt: new Date(T0) },
    ];
    const report = await buildSecurityEvidence(fakeDb(rows), WINDOW);

    expect(report.table?.columns).toEqual(['Staff', 'Sensitive reads', 'Privileged writes']);
    expect(report.table?.rows).toEqual([
      ['destek@voldi.net', 1, 0],
      ['huseyin@voldi.net', 2, 3],
    ]);
    const items = report.sections[0]!.items;
    expect(items).toContainEqual({ label: 'Sensitive reads', value: '3' });
    expect(items).toContainEqual({ label: 'Privileged writes', value: '3' });
  });
});

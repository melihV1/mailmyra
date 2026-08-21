import { describe, expect, it } from 'vitest';

import {
  ACTIVATION_STALE_DAYS,
  buildQueueRows,
  filterQueue,
} from '../app/(admin)/queue-model';
import type { AdminOrgRow } from '../lib/repo/admin';

/**
 * Tek kuyruk yüzeyinin kuralları (redesign brief §5.3): önem + vade sırası,
 * segment süzgeci, aktivasyon türetmesi. Ekran değil model sınanıyor.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 19); // 2026-08-19

function org(partial: Partial<AdminOrgRow> & { id: string; name: string }): AdminOrgRow {
  return {
    createdAt: new Date(NOW - 30 * DAY),
    priceVersion: '2026-08-07-usd-1-year',
    entitlementState: 'active',
    entitledSeats: 5,
    activeSeats: 3,
    trialEndsAt: null,
    memberCount: 1,
    childCount: 0,
    lastActivityAt: null,
    ...partial,
  };
}

const EMPTY = { trialsEnding: [], overEntitlement: [], expiredTrials: [], overdueInvoices: [] };

describe('buildQueueRows', () => {
  it('önem önce, eşit önemde yakın vade üstte', () => {
    const rows = buildQueueRows(
      [],
      {
        ...EMPTY,
        trialsEnding: [
          org({ id: 'uzak', name: 'Uzak', trialEndsAt: new Date(NOW + 6 * DAY) }),
          org({ id: 'yarin', name: 'Yarın', trialEndsAt: new Date(NOW + 1 * DAY) }),
        ],
        overdueInvoices: [
          {
            id: 'i1',
            number: 'MM-1',
            orgId: 'o1',
            orgName: 'Borçlu',
            amountCents: 500,
            currency: 'USD',
            dueAt: new Date(NOW - 20 * DAY),
            overdueDays: 20,
          },
        ],
      },
      NOW,
    );

    // 20 gün gecikmiş fatura (sev 3) ve yarın biten deneme (sev 3) üstte;
    // aralarında vade sırası: fatura vadesi daha eski → daha üstte.
    expect(rows.map((r) => r.key)).toEqual([
      'billing:i1',
      'trial-ending:yarin',
      'trial-ending:uzak',
    ]);
    expect(rows[0]!.severity).toBe(3);
    expect(rows[2]!.severity).toBe(2);
  });

  it('süresi geçmiş deneme her zaman sev 3 ve "trial" segmentinde', () => {
    const rows = buildQueueRows(
      [],
      { ...EMPTY, expiredTrials: [org({ id: 'e1', name: 'Ex', trialEndsAt: new Date(NOW - 3 * DAY), entitlementState: 'trial' })] },
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.severity).toBe(3);
    expect(rows[0]!.category).toBe('trial');
    expect(rows[0]!.when).toBe('3d ago');
  });

  it('aktivasyon: canlı koltuğu 0 + eşikten eski olan girer; yeni ve cancelled girmez', () => {
    const rows = buildQueueRows(
      [
        org({ id: 'stuck', name: 'Takıldı', activeSeats: 0, createdAt: new Date(NOW - 10 * DAY) }),
        org({ id: 'fresh', name: 'Yeni', activeSeats: 0, createdAt: new Date(NOW - (ACTIVATION_STALE_DAYS - 1) * DAY) }),
        org({ id: 'gone', name: 'Gitti', activeSeats: 0, entitlementState: 'cancelled', createdAt: new Date(NOW - 90 * DAY) }),
        org({ id: 'fine', name: 'Aktif', activeSeats: 2 }),
      ],
      EMPTY,
      NOW,
    );
    expect(rows.map((r) => r.orgId)).toEqual(['stuck']);
    expect(rows[0]!.category).toBe('activation');
    expect(rows[0]!.severity).toBe(1);
  });

  it('koltuk aşımı sebep metninde farkı söyler', () => {
    const rows = buildQueueRows(
      [],
      { ...EMPTY, overEntitlement: [org({ id: 'o', name: 'A', activeSeats: 7, entitledSeats: 5 })] },
      NOW,
    );
    expect(rows[0]!.reason).toContain('2 seats over');
  });
});

describe('filterQueue', () => {
  const rows = buildQueueRows(
    [org({ id: 's', name: 'S', activeSeats: 0, createdAt: new Date(NOW - 10 * DAY) })],
    {
      ...EMPTY,
      overEntitlement: [org({ id: 'o', name: 'O', activeSeats: 7, entitledSeats: 5 })],
    },
    NOW,
  );

  it('all hepsini, segment yalnız kendini verir', () => {
    expect(filterQueue(rows, 'all')).toHaveLength(2);
    expect(filterQueue(rows, 'entitlement').map((r) => r.orgId)).toEqual(['o']);
    expect(filterQueue(rows, 'activation').map((r) => r.orgId)).toEqual(['s']);
    expect(filterQueue(rows, 'billing')).toHaveLength(0);
  });
});

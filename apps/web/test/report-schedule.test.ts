import { describe, expect, it } from 'vitest';

import { nextPlannedRun } from '../lib/report-schedule';

/** Zamanlama matematiği — deterministik, DB'siz. */
describe('nextPlannedRun', () => {
  const wed = new Date(Date.UTC(2026, 7, 19, 15, 30)); // Çarşamba

  it('daily: yarın 07:00 UTC', () => {
    expect(nextPlannedRun('daily', wed).toISOString()).toBe('2026-08-20T07:00:00.000Z');
  });

  it('weekly: gelecek Pazartesi', () => {
    expect(nextPlannedRun('weekly', wed).toISOString()).toBe('2026-08-24T07:00:00.000Z');
  });

  it('weekly: Pazartesi günü bile BİR SONRAKİ Pazartesi', () => {
    const mon = new Date(Date.UTC(2026, 7, 17, 9));
    expect(nextPlannedRun('weekly', mon).toISOString()).toBe('2026-08-24T07:00:00.000Z');
  });

  it('monthly: gelecek ayın 1\'i', () => {
    expect(nextPlannedRun('monthly', wed).toISOString()).toBe('2026-09-01T07:00:00.000Z');
  });

  it('yıl devri: Aralık → Ocak', () => {
    const dec = new Date(Date.UTC(2026, 11, 15));
    expect(nextPlannedRun('monthly', dec).toISOString()).toBe('2027-01-01T07:00:00.000Z');
  });
});

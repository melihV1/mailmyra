import { describe, expect, it } from 'vitest';

import { countRows } from '../lib/reports/types';
import { reportWindow, windowLabel } from '../lib/reports/window';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15)); // 2026-08-21 07:15Z

describe('reportWindow', () => {
  it('daily = last 24 hours', () => {
    const w = reportWindow('daily', END);
    expect(w.start.toISOString()).toBe('2026-08-20T07:15:00.000Z');
    expect(w.end.toISOString()).toBe(END.toISOString());
  });

  it('weekly = last 7 days', () => {
    expect(reportWindow('weekly', END).start.toISOString()).toBe('2026-08-14T07:15:00.000Z');
  });

  it('monthly = one UTC month back', () => {
    expect(reportWindow('monthly', END).start.toISOString()).toBe('2026-07-21T07:15:00.000Z');
  });

  it('unknown cadence behaves like monthly (nextPlannedRun ile aynı tavır)', () => {
    expect(reportWindow('yearly', END).start.toISOString()).toBe('2026-07-21T07:15:00.000Z');
  });

  it('does not mutate the given end date', () => {
    const end = new Date(END);
    reportWindow('daily', end);
    expect(end.toISOString()).toBe(END.toISOString());
  });

  it('month-end rollover is the known JS behavior', () => {
    // 31 Mar − 1 ay → JS "31 Şub"u 3 Mart'a taşırır. Bilinçli kabul (spec).
    const w = reportWindow('monthly', new Date(Date.UTC(2026, 2, 31)));
    expect(w.start.toISOString()).toBe('2026-03-03T00:00:00.000Z');
  });
});

describe('windowLabel', () => {
  it('renders UTC-day ISO range', () => {
    expect(windowLabel(reportWindow('weekly', END))).toBe('2026-08-14 → 2026-08-21');
  });
});

describe('countRows', () => {
  const base = {
    reportId: 'x',
    title: 'X',
    window: reportWindow('daily', END),
    sections: [{ heading: 'S', items: [{ label: 'a', value: '1' }, { label: 'b', value: '2' }] }],
  };

  it('prefers the table row count', () => {
    expect(countRows({ ...base, table: { columns: ['c'], rows: [['x'], ['y'], ['z']] } })).toBe(3);
  });

  it('falls back to total section items', () => {
    expect(countRows(base)).toBe(2);
  });
});

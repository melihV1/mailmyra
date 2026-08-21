import { describe, expect, it } from 'vitest';

import {
  DAY_MS,
  describeTrialWindow,
  getTrialTimeline,
  matchesTrialFocus,
  sortTrialRows,
  summarizeTrials,
  type TrialEntitlementRow,
} from '../app/(admin)/trials-model';

const NOW = Date.UTC(2026, 7, 20, 9, 0);

function row(overrides: Partial<TrialEntitlementRow> = {}): TrialEntitlementRow {
  return {
    id: 'org-1',
    name: 'Northwind',
    entitlementState: 'active',
    activeSeats: 3,
    entitledSeats: 5,
    trialEndsAt: null,
    memberCount: 2,
    childCount: 0,
    lastActivityAt: new Date(NOW - DAY_MS).toISOString(),
    createdAt: new Date(NOW - 30 * DAY_MS).toISOString(),
    ...overrides,
  };
}

describe('trial and entitlement model', () => {
  it('summarizes active, ending, expired, over-seat and missing-date records independently', () => {
    const rows = [
      row({ id: 'ending', entitlementState: 'trial', trialEndsAt: new Date(NOW + 3 * DAY_MS).toISOString() }),
      row({ id: 'expired', entitlementState: 'trial', trialEndsAt: new Date(NOW - 2 * DAY_MS).toISOString() }),
      row({ id: 'missing', entitlementState: 'trial' }),
      row({ id: 'over', activeSeats: 7, entitledSeats: 5 }),
    ];

    expect(summarizeTrials(rows, NOW)).toEqual({
      activeTrials: 2,
      endingSoon: 1,
      expired: 1,
      overEntitlement: 1,
      missingEndDate: 1,
    });
  });

  it('filters operational focus without hiding over-seat non-trial customers', () => {
    const over = row({ activeSeats: 8, entitledSeats: 5 });
    const ending = row({ entitlementState: 'trial', trialEndsAt: new Date(NOW + DAY_MS).toISOString() });

    expect(matchesTrialFocus(over, 'over', NOW)).toBe(true);
    expect(matchesTrialFocus(over, 'active', NOW)).toBe(false);
    expect(matchesTrialFocus(ending, 'ending', NOW)).toBe(true);
  });

  it('puts expired and over-entitlement records before routine trials', () => {
    const routine = row({ id: 'routine', entitlementState: 'trial', trialEndsAt: new Date(NOW + 20 * DAY_MS).toISOString() });
    const over = row({ id: 'over', activeSeats: 7, entitledSeats: 5 });
    const expired = row({ id: 'expired', entitlementState: 'trial', trialEndsAt: new Date(NOW - DAY_MS).toISOString() });

    expect(sortTrialRows([routine, over, expired], 'attention', NOW).map((item) => item.id)).toEqual([
      'expired',
      'over',
      'routine',
    ]);
  });

  it('describes trial timing with an operational label', () => {
    expect(
      describeTrialWindow(
        row({ entitlementState: 'trial', trialEndsAt: new Date(NOW + 2 * DAY_MS).toISOString() }),
        NOW,
      ),
    ).toMatchObject({ label: 'Ends in 2d', tone: 'warning' });

    expect(describeTrialWindow(row({ entitlementState: 'trial' }), NOW)).toEqual({
      label: 'End date missing',
      tone: 'warning',
      date: null,
    });
  });

  it('turns a trial period into a bounded timeline', () => {
    const timeline = getTrialTimeline(
      row({
        entitlementState: 'trial',
        createdAt: new Date(NOW - 7 * DAY_MS).toISOString(),
        trialEndsAt: new Date(NOW + 7 * DAY_MS).toISOString(),
      }),
      NOW,
    );

    expect(timeline).toEqual({
      elapsedDays: 7,
      totalDays: 14,
      remainingDays: 7,
      percent: 50,
      tone: 'warning',
    });
  });

  it('caps expired trials at a complete timeline', () => {
    expect(
      getTrialTimeline(
        row({
          entitlementState: 'trial',
          createdAt: new Date(NOW - 15 * DAY_MS).toISOString(),
          trialEndsAt: new Date(NOW - DAY_MS).toISOString(),
        }),
        NOW,
      ),
    ).toMatchObject({ elapsedDays: 14, totalDays: 14, remainingDays: 0, percent: 100, tone: 'danger' });
  });

  it('does not invent a timeline when dates are incomplete', () => {
    expect(getTrialTimeline(row({ entitlementState: 'trial' }), NOW)).toBeNull();
    expect(getTrialTimeline(row(), NOW)).toBeNull();
  });
});

import { describe, expect, test } from 'vitest';

import { PRICING, annualTotalCents } from '../src/pricing';

describe('the locked price model', () => {
  test('has one explicit version key for new organization assignments', () => {
    expect(PRICING.version).toBe('2026-08-07-usd-1-year');
  });

  test('one dollar, per active sender, per year', () => {
    expect(PRICING.perSeatYearCents).toBe(100);
    expect(PRICING.currency).toBe('USD');
  });

  test('one seat is enough — there is no minimum team size', () => {
    expect(PRICING.minSeats).toBe(1);
  });

  test('a trial starts with five seats, not a wall after the first publish', () => {
    expect(PRICING.trialSeats).toBe(5);
  });

  test('the trial runs seven days and asks for no card', () => {
    expect(PRICING.trialDays).toBe(7);
    expect(PRICING.trialRequiresCard).toBe(false);
  });

  test('there is no free plan', () => {
    expect(PRICING.hasFreePlan).toBe(false);
  });
});

describe('annual total', () => {
  test('scales linearly — there are no volume tiers', () => {
    expect(annualTotalCents(1)).toBe(100);
    expect(annualTotalCents(10)).toBe(1_000);
    expect(annualTotalCents(200)).toBe(20_000);
  });

  test('below the minimum still bills the minimum', () => {
    expect(annualTotalCents(0)).toBe(100);
    expect(annualTotalCents(-4)).toBe(100);
  });

  test('a fractional seat count is a bug, not a discount', () => {
    expect(() => annualTotalCents(2.5)).toThrow(/whole/i);
  });
});

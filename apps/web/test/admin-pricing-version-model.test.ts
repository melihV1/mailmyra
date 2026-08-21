import { describe, expect, it } from 'vitest';

import {
  getPricingVersionFacts,
  getPricingVersionRows,
  sortPricingAssignments,
  type PricingOrganizationRow,
  type PricingPolicy,
} from '../app/(admin)/pricing-version-model';

const policy: PricingPolicy = {
  version: 'current',
  perSeatYearCents: 100,
  currency: 'USD',
  minSeats: 1,
  trialDays: 7,
  trialSeats: 5,
  trialRequiresCard: false,
  hasFreePlan: false,
};

const row = (overrides: Partial<PricingOrganizationRow> = {}): PricingOrganizationRow => ({
  id: 'o1',
  name: 'Northwind',
  priceVersion: 'current',
  entitlementState: 'active',
  entitledSeats: 10,
  activeSeats: 8,
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('pricing version model', () => {
  it('separates current and grandfathered customers without inferring legacy prices', () => {
    const facts = getPricingVersionFacts([
      row(),
      row({ id: 'o2', priceVersion: 'legacy', entitledSeats: 20 }),
    ], policy);
    expect(facts).toMatchObject({ customers: 2, currentCustomers: 1, legacyCustomers: 1, coverage: 50, versions: 2 });
  });

  it('aggregates assignments by stored version', () => {
    const versions = getPricingVersionRows([
      row(),
      row({ id: 'o2', entitledSeats: 5 }),
      row({ id: 'o3', priceVersion: 'legacy', entitledSeats: 20, activeSeats: 18 }),
    ], policy);
    expect(versions[0]).toMatchObject({ version: 'current', current: true, customers: 2, entitledSeats: 15 });
    expect(versions[1]).toMatchObject({ version: 'legacy', current: false, customers: 1, activeSeats: 18 });
  });

  it('puts grandfathered assignments first for review', () => {
    const assignments = sortPricingAssignments([
      row(),
      row({ id: 'o2', name: 'Legacy account', priceVersion: 'legacy' }),
    ], policy);
    expect(assignments[0]?.priceVersion).toBe('legacy');
  });
});

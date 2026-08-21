export interface PricingOrganizationRow {
  id: string;
  name: string;
  priceVersion: string;
  entitlementState: string;
  entitledSeats: number;
  activeSeats: number;
  createdAt: string;
}

export interface PricingPolicy {
  version: string;
  perSeatYearCents: number;
  currency: string;
  minSeats: number;
  trialDays: number;
  trialSeats: number;
  trialRequiresCard: boolean;
  hasFreePlan: boolean;
}

export function getPricingVersionFacts(
  rows: readonly PricingOrganizationRow[],
  policy: PricingPolicy,
) {
  const current = rows.filter((row) => row.priceVersion === policy.version);
  const legacy = rows.filter((row) => row.priceVersion !== policy.version);
  const currentSeats = current.reduce((sum, row) => sum + row.entitledSeats, 0);
  const legacySeats = legacy.reduce((sum, row) => sum + row.entitledSeats, 0);

  return {
    customers: rows.length,
    currentCustomers: current.length,
    legacyCustomers: legacy.length,
    currentSeats,
    legacySeats,
    coverage: rows.length ? Math.round((current.length / rows.length) * 100) : 0,
    versions: new Set(rows.map((row) => row.priceVersion)).size,
  };
}

export function getPricingVersionRows(
  rows: readonly PricingOrganizationRow[],
  policy: PricingPolicy,
) {
  const grouped = new Map<string, PricingOrganizationRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.priceVersion) ?? [];
    group.push(row);
    grouped.set(row.priceVersion, group);
  }

  return [...grouped.entries()]
    .map(([version, organizations]) => ({
      version,
      current: version === policy.version,
      customers: organizations.length,
      entitledSeats: organizations.reduce((sum, row) => sum + row.entitledSeats, 0),
      activeSeats: organizations.reduce((sum, row) => sum + row.activeSeats, 0),
      activeCustomers: organizations.filter((row) => row.entitlementState === 'active').length,
      firstAssignedAt: organizations
        .map((row) => row.createdAt)
        .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null,
      latestAssignedAt: organizations
        .map((row) => row.createdAt)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.customers - a.customers);
}

export function sortPricingAssignments(
  rows: readonly PricingOrganizationRow[],
  policy: PricingPolicy,
) {
  return [...rows].sort((a, b) =>
    Number(a.priceVersion === policy.version) - Number(b.priceVersion === policy.version) ||
    b.entitledSeats - a.entitledSeats ||
    a.name.localeCompare(b.name),
  );
}

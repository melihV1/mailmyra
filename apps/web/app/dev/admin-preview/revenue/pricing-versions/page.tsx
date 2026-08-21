import { PRICING } from '@mailmyra/core';
import { notFound } from 'next/navigation';

import type { PricingOrganizationRow } from '../../../../(admin)/pricing-version-model';
import { AdminPageHeader } from '../../../../(admin)/ui/AdminPageHeader';
import { PricingVersionsView } from '../../../../(admin)/ui/RevenueOperationsViews';
import { PreviewFrame } from '../../PreviewFrame';
import { previewOrganizations } from '../../operations-fixtures';

const versionByOrganization: Record<string, string> = {
  o2: '2026-05-pilot-usd-1-year',
  o5: '2026-07-founder-usd-1-year',
};

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();

  const rows: PricingOrganizationRow[] = previewOrganizations.map((row) => ({
    id: row.id,
    name: row.name,
    priceVersion: versionByOrganization[row.id] ?? PRICING.version,
    entitlementState: row.entitlementState,
    entitledSeats: row.entitledSeats,
    activeSeats: row.activeSeats,
    createdAt: row.createdAt,
  }));

  return <PreviewFrame><section>
    <AdminPageHeader crumb="Revenue / Pricing versions" title="Pricing versions" support="Review the live sender policy, grandfathered customers and the exact version stored on every billing organization." />
    <PricingVersionsView rows={rows} policy={PRICING} preview />
  </section></PreviewFrame>;
}

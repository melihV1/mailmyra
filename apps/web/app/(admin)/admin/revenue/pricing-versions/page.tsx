import { PRICING } from '@mailmyra/core';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { PricingOrganizationRow } from '../../../pricing-version-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { PricingVersionsView } from '../../../ui/RevenueOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Pricing versions — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function PricingVersionsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/pricing-versions');

  let source;
  try {
    source = await listOrganizations(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const rows: PricingOrganizationRow[] = source.map((row) => ({
    id: row.id,
    name: row.name,
    priceVersion: row.priceVersion,
    entitlementState: row.entitlementState,
    entitledSeats: row.entitledSeats,
    activeSeats: row.activeSeats,
    createdAt: row.createdAt.toISOString(),
  }));

  return <section>
    <AdminPageHeader crumb="Revenue / Pricing versions" title="Pricing versions" support="Review the live sender policy, grandfathered customers and the exact version stored on every billing organization." right={<RefreshButton />} />
    <PricingVersionsView rows={rows} policy={PRICING} />
  </section>;
}

import { PRICING } from '@mailmyra/core';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { PricingOrganizationRow } from '../../../pricing-version-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { PricingVersionsView } from '../../../ui/RevenueOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.revenuePricingVersions} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function PricingVersionsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/revenue/pricing-versions');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminRevenue[lang].pages.pricingVersions;

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
    <AdminPageHeader crumb={`${nav.revenue} / ${nav.revenuePricingVersions}`} title={nav.revenuePricingVersions} support={t.support} right={<RefreshButton />} />
    <PricingVersionsView rows={rows} policy={PRICING} />
  </section>;
}

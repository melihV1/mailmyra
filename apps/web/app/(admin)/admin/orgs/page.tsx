import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { getLang } from '../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../lib/i18n/dict/admin-nav';
import { adminCustomers } from '../../../../lib/i18n/dict/admin-customers';
import { listOrganizations, NotStaffError } from '../../../../lib/repo/admin';
import { fmtDate } from '../../format';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { CustomerTable, type CustomerRow } from '../../ui/CustomerTable';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.customersOrganizations} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

/** Müşteri dizini — komuta merkezindeki tabloyla AYNI bileşen, tam sayfa. */
export default async function OrganizationsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/orgs');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminCustomers[lang].pages.organizations;

  let orgs;
  try {
    orgs = await listOrganizations(session.user.id);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  const rows: CustomerRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    entitlementState: o.entitlementState,
    activeSeats: o.activeSeats,
    entitledSeats: o.entitledSeats,
    trialEndsAt: o.trialEndsAt ? fmtDate(o.trialEndsAt) : null,
    memberCount: o.memberCount,
    childCount: o.childCount,
    lastActivityAt: o.lastActivityAt ? fmtDate(o.lastActivityAt) : null,
    createdAt: fmtDate(o.createdAt),
  }));

  return (
    <section>
      <AdminPageHeader
        crumb={nav.customersOrganizations}
        title={nav.customersOrganizations}
        support={t.support}
      />
      <CustomerTable rows={rows} now={Date.now()} />
    </section>
  );
}

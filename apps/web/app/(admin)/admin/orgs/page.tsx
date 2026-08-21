import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listOrganizations, NotStaffError } from '../../../../lib/repo/admin';
import { fmtDate } from '../../format';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { CustomerTable, type CustomerRow } from '../../ui/CustomerTable';

export const metadata = { title: 'Organizations — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** Müşteri dizini — komuta merkezindeki tabloyla AYNI bileşen, tam sayfa. */
export default async function OrganizationsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/orgs');

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
        crumb="Organizations"
        title="Organizations"
        support="Every root billing organization, with search and state filters."
      />
      <CustomerTable rows={rows} now={Date.now()} />
    </section>
  );
}

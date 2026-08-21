import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listOrganizations, NotStaffError } from '../../../../../lib/repo/admin';
import type { TrialEntitlementRow } from '../../../trials-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { RefreshButton } from '../../../ui/RefreshButton';
import { TrialsEntitlementsView } from '../../../ui/TrialsEntitlementsView';

export const metadata = { title: 'Trials & entitlements — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function TrialsEntitlementsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/customers/trials');

  let organizations;
  try {
    organizations = await listOrganizations(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const rows: TrialEntitlementRow[] = organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    entitlementState: organization.entitlementState,
    activeSeats: organization.activeSeats,
    entitledSeats: organization.entitledSeats,
    trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
    memberCount: organization.memberCount,
    childCount: organization.childCount,
    lastActivityAt: organization.lastActivityAt?.toISOString() ?? null,
    createdAt: organization.createdAt.toISOString(),
  }));

  const now = Date.now();

  return (
    <section>
      <AdminPageHeader
        crumb="Customers / Trials & entitlements"
        title="Trials & entitlements"
        support="Follow trial deadlines and seat exceptions without changing customer data from the list."
        right={
          <>
            <Link href="/admin/orgs" className="btn btn-label-secondary btn-sm">
              <i className="icon-base ti tabler-building-community me-2" aria-hidden="true" />
              Organizations
            </Link>
            <RefreshButton />
          </>
        }
      />
      <TrialsEntitlementsView rows={rows} now={now} />
    </section>
  );
}

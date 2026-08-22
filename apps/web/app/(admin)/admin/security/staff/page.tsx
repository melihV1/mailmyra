import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listStaffAccounts, listStaffChangeRequests, NotStaffError } from '../../../../../lib/repo/admin';
import type { StaffAccountRow, StaffChangeRequestRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { StaffRolesView } from '../../../ui/GovernanceOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';
import { RequestStaffChangeButton } from '../../../ui/StaffFlagActions';

export const metadata = { title: 'Staff and roles — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Staff bayrağı artık YAZILABİLİR — ama doğrudan değil: talep (bu sayfadaki
 * `RequestStaffChangeButton`, Security → Approvals'a düşer) → karar (mevcut
 * onay akışı) → icra (`ExecuteStaffChangeButton`, bu sayfada satır başına).
 * `listStaffChangeRequests` kişisel veri taşımaz (personel e-postaları) —
 * günlüksüz, CALLS'a girer.
 */
export default async function StaffRolesPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/staff');
  let source, requestSource;
  try {
    source = await listStaffAccounts(session.user.id);
    requestSource = await listStaffChangeRequests(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }
  const rows: StaffAccountRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt?.toISOString() ?? null }));
  const requests: StaffChangeRequestRow[] = requestSource.map((row) => ({ ...row }));
  return (
    <section>
      <AdminPageHeader
        crumb="Security & governance / Staff"
        title="Staff and roles"
        support="Review control-plane accounts and the current permission boundary."
        right={
          <>
            <RequestStaffChangeButton />
            <RefreshButton />
          </>
        }
      />
      <StaffRolesView rows={rows} requests={requests} />
    </section>
  );
}

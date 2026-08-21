import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listStaffAccounts, NotStaffError } from '../../../../../lib/repo/admin';
import type { StaffAccountRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { StaffRolesView } from '../../../ui/GovernanceOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Staff and roles — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function StaffRolesPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/staff');
  let source;
  try { source = await listStaffAccounts(session.user.id); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: StaffAccountRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt?.toISOString() ?? null }));
  return <section><AdminPageHeader crumb="Security & governance / Staff" title="Staff and roles" support="Review control-plane accounts and the current permission boundary." right={<RefreshButton />} /><StaffRolesView rows={rows} /></section>;
}

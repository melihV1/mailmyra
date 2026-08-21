import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listAdminActions, NotStaffError } from '../../../../lib/repo/admin';
import type { AdminActionLogRow } from '../../action-log-model';
import { AdminActionLogView } from '../../ui/AdminActionLogView';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';

export const metadata = { title: 'Admin action log — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function ActionLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/actions');

  let actions;
  try {
    actions = await listAdminActions(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const rows: AdminActionLogRow[] = actions.map((action) => ({
    ...action,
    createdAt: action.createdAt.toISOString(),
  }));

  return (
    <section>
      <AdminPageHeader
        crumb="Security & governance / Admin action log"
        title="Admin action log"
        support="Review every staff write with its customer, mandatory reason and immutable before/after snapshot."
        right={<RefreshButton />}
      />
      <AdminActionLogView rows={rows} now={Date.now()} />
    </section>
  );
}

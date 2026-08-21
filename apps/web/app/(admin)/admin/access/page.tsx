import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listStaffAccess, NotStaffError } from '../../../../lib/repo/admin';
import type { StaffAccessLogRow } from '../../access-log-model';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';
import { StaffAccessLogView } from '../../ui/StaffAccessLogView';

export const metadata = { title: 'Access log — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** KVKK sorusu: "bu müşteriye kim baktı". Cevabı yalnız burada. */
export default async function AccessLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/access');

  let accessRows;
  try {
    accessRows = await listStaffAccess(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const rows: StaffAccessLogRow[] = accessRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <section>
      <AdminPageHeader
        crumb="Security & governance / Staff access log"
        title="Staff access log"
        support="Trace every sensitive customer read without changing the immutable audit record."
        right={<RefreshButton />}
      />
      <StaffAccessLogView rows={rows} now={Date.now()} />
    </section>
  );
}

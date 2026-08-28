import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { getLang } from '../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../lib/i18n/dict/admin-nav';
import { adminSecurity } from '../../../../lib/i18n/dict/admin-security';
import { listStaffAccess, NotStaffError } from '../../../../lib/repo/admin';
import type { StaffAccessLogRow } from '../../access-log-model';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';
import { StaffAccessLogView } from '../../ui/StaffAccessLogView';

/** Task 12: sekme başlığı "Access log" (kısa form) — sayfa başlığı "Staff access log" ile aynı METİN DEĞİL, bkz. admin-security `pages.accessLog.metaTitle`. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminSecurity[lang].pages.accessLog.metaTitle} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

/** KVKK sorusu: "bu müşteriye kim baktı". Cevabı yalnız burada. */
export default async function AccessLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/access');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSecurity[lang].pages.accessLog;

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
        crumb={`${nav.security} / ${nav.securityAccessLog}`}
        title={nav.securityAccessLog}
        support={t.support}
        right={<RefreshButton />}
      />
      <StaffAccessLogView rows={rows} now={Date.now()} />
    </section>
  );
}

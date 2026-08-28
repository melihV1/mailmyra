import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { getLang } from '../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../lib/i18n/dict/admin-nav';
import { adminSecurity } from '../../../../lib/i18n/dict/admin-security';
import { listAdminActions, NotStaffError } from '../../../../lib/repo/admin';
import type { AdminActionLogRow } from '../../action-log-model';
import { AdminActionLogView } from '../../ui/AdminActionLogView';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.securityActionLog} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function ActionLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/actions');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSecurity[lang].pages.actionLog;

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
        crumb={`${nav.security} / ${nav.securityActionLog}`}
        title={nav.securityActionLog}
        support={t.support}
        right={<RefreshButton />}
      />
      <AdminActionLogView rows={rows} now={Date.now()} />
    </section>
  );
}

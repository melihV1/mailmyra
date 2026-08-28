import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminCustomers } from '../../../../../lib/i18n/dict/admin-customers';
import { listCustomerUsers, NotStaffError } from '../../../../../lib/repo/admin';
import type { CustomerUserRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { CustomerUsersView } from '../../../ui/CustomerOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminCustomers[lang].pages.users.title} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function CustomerUsersPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/customers/users');
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminCustomers[lang].pages.users;
  const headerList = await headers();
  let source;
  try { source = await listCustomerUsers(session.user.id, { ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined, userAgent: headerList.get('user-agent') ?? undefined }); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: CustomerUserRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt?.toISOString() ?? null, emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null, memberships: row.memberships.map((membership) => ({ ...membership, joinedAt: membership.joinedAt.toISOString() })) }));
  return <section><AdminPageHeader crumb={`${nav.customers} / ${nav.customersUsers}`} title={t.title} support={t.support} right={<RefreshButton />} /><CustomerUsersView rows={rows} /></section>;
}

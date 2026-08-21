import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentSession } from '../../../../../lib/auth/current';
import { listCustomerUsers, NotStaffError } from '../../../../../lib/repo/admin';
import type { CustomerUserRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { CustomerUsersView } from '../../../ui/CustomerOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Customer users — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function CustomerUsersPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/customers/users');
  const headerList = await headers();
  let source;
  try { source = await listCustomerUsers(session.user.id, { ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined, userAgent: headerList.get('user-agent') ?? undefined }); } catch (error) { if (error instanceof NotStaffError) redirect('/app'); throw error; }
  const rows: CustomerUserRow[] = source.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt?.toISOString() ?? null, emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null, memberships: row.memberships.map((membership) => ({ ...membership, joinedAt: membership.joinedAt.toISOString() })) }));
  return <section><AdminPageHeader crumb="Customers / Users" title="Customer users" support="Find customer identities and workspace membership without exposing edit controls." right={<RefreshButton />} /><CustomerUsersView rows={rows} /></section>;
}

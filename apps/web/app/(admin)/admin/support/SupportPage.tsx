import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { getProductAnalyticsAdmin, NotStaffError } from '../../../../lib/repo/admin';
import type { ProductAnalyticsSnapshot } from '../../product-analytics-model';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';

export async function SupportPage({
  path,
  crumb,
  title,
  support,
  render,
}: {
  path: string;
  crumb: string;
  title: string;
  support: string;
  render: (source: ProductAnalyticsSnapshot, now: number) => ReactNode;
}) {
  const session = await currentSession();
  if (!session) redirect(`/login?next=${path}`);
  let source: ProductAnalyticsSnapshot;
  try {
    source = await getProductAnalyticsAdmin(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }
  return <section><AdminPageHeader crumb={crumb} title={title} support={support} right={<RefreshButton />} />{render(source, Date.now())}</section>;
}

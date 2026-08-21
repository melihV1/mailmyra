import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { listLeads, NotStaffError } from '../../../../../lib/repo/admin';
import type { GrowthLeadRow } from '../../../growth-analytics-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { LeadsView } from '../../../ui/GrowthOperationsViews';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'Leads — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** Gerçek lead defteri — otomatik kaynak yok, satırlar elle açılır. */
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/growth/leads');

  let source;
  try {
    source = await listLeads(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const asStage = (v: string): GrowthLeadRow['stage'] =>
    v === 'qualified' || v === 'scheduled' || v === 'won' ? v : 'new';
  const rows: GrowthLeadRow[] = source.map((r) => ({
    id: r.id,
    company: r.company,
    contact: r.contact,
    source: r.source,
    seats: r.seats,
    stage: asStage(r.stage),
    createdAt: r.createdAt.toISOString(),
    nextStep: r.nextStep,
  }));

  return (
    <section>
      <AdminPageHeader
        crumb="Growth & content / Leads"
        title="Leads"
        support="Manually curated pipeline — no tracking source is connected."
        right={<RefreshButton />}
      />
      <LeadsView rows={rows} />
    </section>
  );
}

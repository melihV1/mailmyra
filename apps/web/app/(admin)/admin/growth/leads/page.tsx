import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminGrowth } from '../../../../../lib/i18n/dict/admin-growth';
import { listLeads, NotStaffError } from '../../../../../lib/repo/admin';
import type { GrowthLeadRow } from '../../../growth-analytics-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { LeadsView } from '../../../ui/GrowthOperationsViews';
import { NewLeadButton } from '../../../ui/LeadActions';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.growthLeads} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

/**
 * Gerçek lead defteri — otomatik kaynak yok, ama artık elle SQL yerine
 * bu sayfadan (`NewLeadButton`/`LeadUpdateButton`, bkz. `ui/LeadActions.tsx`)
 * açılır ve güncellenir.
 */
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/growth/leads');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminGrowth[lang].pages.leads;

  let source;
  try {
    source = await listLeads(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const asStage = (v: string): GrowthLeadRow['stage'] =>
    v === 'qualified' || v === 'scheduled' || v === 'won' || v === 'lost' ? v : 'new';
  const rows: GrowthLeadRow[] = source.map((r) => ({
    id: r.id,
    company: r.company,
    contact: r.contact,
    source: r.source,
    seats: r.seats,
    stage: asStage(r.stage),
    createdAt: r.createdAt.toISOString(),
    nextStep: r.nextStep,
    note: r.note,
  }));

  return (
    <section>
      <AdminPageHeader
        crumb={`${nav.growth} / ${nav.growthLeads}`}
        title={nav.growthLeads}
        support={t.support}
        right={
          <>
            <NewLeadButton />
            <RefreshButton />
          </>
        }
      />
      <LeadsView rows={rows} />
    </section>
  );
}

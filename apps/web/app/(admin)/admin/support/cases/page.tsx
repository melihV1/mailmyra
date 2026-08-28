import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { currentSession } from '../../../../../lib/auth/current';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminSupport } from '../../../../../lib/i18n/dict/admin-support';
import { listSupportCases, NotStaffError } from '../../../../../lib/repo/admin';
import type { SupportCaseRow } from '../../../support-operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { SupportCasesView } from '../../../ui/SupportOperationsViews';
import { NewSupportCaseButton } from '../../../ui/SupportActions';
import { RefreshButton } from '../../../ui/RefreshButton';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.supportCases} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

/**
 * Gerçek vaka defteri. `requesterEmail` kişisel veri — sayfayı açmak
 * StaffAccess'e düşer, günlük yazılamazsa sayfa açılmaz (repo sözleşmesi).
 * Yaşam döngüsü yazmaları artık VAR: oluşturma, durum, sahip ve öncelik —
 * `NewSupportCaseButton`/`SupportActionButtons` (bkz. `ui/SupportActions.tsx`),
 * her biri yetki + kalıcılık + denetim + hata yolunu aynı transaction'da
 * taşıyan `lib/repo/admin.ts` fonksiyonlarına gider.
 */
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/support/cases');

  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminSupport[lang].pages.cases;

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  };

  let source;
  try {
    source = await listSupportCases(session.user.id, ctx);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const asChannel = (v: string): SupportCaseRow['channel'] =>
    v === 'form' || v === 'staff' ? v : 'email';
  const asCategory = (v: string): SupportCaseRow['category'] =>
    v === 'builder' || v === 'export' || v === 'access' || v === 'account' ? v : 'billing';
  const asPriority = (v: string): SupportCaseRow['priority'] =>
    v === 'urgent' || v === 'high' || v === 'low' ? v : 'normal';
  const asStatus = (v: string): SupportCaseRow['status'] =>
    v === 'waiting_customer' || v === 'escalated' || v === 'resolved' ? v : 'open';
  const rows: SupportCaseRow[] = source.map((r) => ({
    id: r.id,
    reference: r.reference,
    subject: r.subject,
    customer: r.customer,
    requester: r.requesterEmail,
    channel: asChannel(r.channel),
    category: asCategory(r.category),
    priority: asPriority(r.priority),
    status: asStatus(r.status),
    owner: r.owner,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    slaDueAt: r.slaDueAt.toISOString(),
    summary: r.summary,
  }));

  return (
    <section>
      <AdminPageHeader
        crumb={`${nav.support} / ${nav.supportCases}`}
        title={nav.supportCases}
        support={t.support}
        right={
          <>
            <Suspense fallback={null}>
              <NewSupportCaseButton />
            </Suspense>
            <RefreshButton />
          </>
        }
      />
      <SupportCasesView rows={rows} now={Date.now()} />
    </section>
  );
}

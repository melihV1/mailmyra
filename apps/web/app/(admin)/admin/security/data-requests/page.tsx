import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { currentSession } from '../../../../../lib/auth/current';
import { listKvkkRequests, NotStaffError } from '../../../../../lib/repo/admin';
import type { DataRequestRow } from '../../../operations-model';
import { AdminPageHeader } from '../../../ui/AdminPageHeader';
import { DataRequestsView } from '../../../ui/GovernanceOperationsViews';
import { NewKvkkButton } from '../../../ui/KvkkActions';
import { RefreshButton } from '../../../ui/RefreshButton';

export const metadata = { title: 'KVKK requests — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Yasal KVKK defteri (KvkkRequest). `subjectEmail` kişisel veri: bu sayfayı
 * AÇMAK `StaffAccess`e düşer ve günlük yazılamazsa repo fırlatır — sayfa
 * açılmaz (kapalıya düşme). Yaşam döngüsü yazmaları artık VAR: kimlik
 * doğrulama, sahip atama, kanıt ekleme, durum geçişi ve kapatma —
 * `KvkkRowActions` (bkz. `ui/KvkkActions.tsx`), her biri yetki + kalıcılık +
 * denetim + hata yolunu aynı transaction'da taşıyan `lib/repo/admin.ts`
 * fonksiyonlarına gider.
 */
export default async function DataRequestsPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/security/data-requests');

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  };

  let source;
  try {
    source = await listKvkkRequests(session.user.id, ctx);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const asType = (v: string): DataRequestRow['type'] =>
    v === 'erasure' || v === 'correction' || v === 'portability' ? v : 'access';
  const asStatus = (v: string): DataRequestRow['status'] =>
    v === 'identity_check' || v === 'in_progress' || v === 'legal_review' || v === 'completed'
      ? v
      : 'intake';
  const rows: DataRequestRow[] = source.map((r) => ({
    id: r.id,
    reference: r.reference,
    subjectEmail: r.subjectEmail,
    customer: r.customer || '—',
    type: asType(r.type),
    status: asStatus(r.status),
    receivedAt: r.receivedAt.toISOString(),
    dueAt: r.dueAt.toISOString(),
    owner: r.owner,
    evidenceCount: r.evidenceCount,
    identityVerified: r.identityVerified,
  }));

  return (
    <section>
      <AdminPageHeader
        crumb="Security & governance / KVKK requests"
        title="KVKK requests"
        support="Statutory data-subject work with ownership, due dates and evidence. Opening this register is logged."
        right={
          <>
            <Suspense fallback={null}>
              <NewKvkkButton />
            </Suspense>
            <RefreshButton />
          </>
        }
      />
      <DataRequestsView rows={rows} now={Date.now()} />
    </section>
  );
}

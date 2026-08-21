import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import {
  listAdminActions,
  listAdminQueues,
  listInvoicesAdmin,
  listOrganizations,
  listStaffAccess,
  NotStaffError,
} from '../../../lib/repo/admin';
import { fmtDate } from '../format';
import { buildQueueRows } from '../queue-model';
import { CommandCenterView } from '../ui/CommandCenterView';
import { type CustomerRow } from '../ui/CustomerTable';

export const metadata = { title: 'Command center — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Komuta merkezi — redesign brief §5 sözleşmesi. İlk ekran dört soruyu
 * cevaplar: kaç faturalanabilir koltuk var · bugün kim eylem istiyor ·
 * ne kadar para gecikmiş · onboarding nerede takıldı.
 *
 * KPI bandı DÖRT FARKLI kompozisyon (brief §5.2 — "aynı ağırlıkta dört
 * ikiz kart" reddedildi): koltuk = başlık+değer+progress · müşteri =
 * rozet-ikon + durum kırılımı · deneme = sayı + EN YAKIN bitiş tarihi ·
 * gecikmiş = tutar + adet. Uyarı/tehlike tonu YALNIZ sıfırdan büyükken.
 * Sahte grafik yok — geçmiş verisi olmayan yerde eğilim çizilmez.
 */
export default async function CommandCenterPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin');

  let orgs, queues, invoices, accessRows, actionRows;
  try {
    [orgs, queues, invoices, accessRows, actionRows] = await Promise.all([
      listOrganizations(session.user.id),
      listAdminQueues(session.user.id),
      listInvoicesAdmin(session.user.id),
      listStaffAccess(session.user.id),
      listAdminActions(session.user.id),
    ]);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  const now = Date.now();
  const activeSeats = orgs.reduce((sum, o) => sum + o.activeSeats, 0);
  const entitledSeats = orgs.reduce((sum, o) => sum + o.entitledSeats, 0);
  const seatPct = entitledSeats > 0 ? Math.min(100, (activeSeats / entitledSeats) * 100) : 0;
  const activityCoverage = orgs.filter((o) => o.lastActivityAt !== null).length;
  const workspaceCount = orgs.reduce((sum, o) => sum + 1 + o.childCount, 0);
  const nextTrialEnd = queues.trialsEnding
    .map((o) => o.trialEndsAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const queueRows = buildQueueRows(orgs, queues, now);

  const currencies = [...new Set(invoices.map((invoice) => invoice.currency))];
  const displayCurrency = currencies.includes('USD') ? 'USD' : (currencies[0] ?? 'USD');
  const currencyInvoices = invoices.filter((invoice) => invoice.currency === displayCurrency);
  const billedInvoices = currencyInvoices.filter((invoice) => invoice.status !== 'void');
  const paidInvoices = currencyInvoices.filter((invoice) => invoice.status === 'paid');
  const dueInvoices = currencyInvoices.filter((invoice) => invoice.status === 'due');
  const voidInvoices = currencyInvoices.filter((invoice) => invoice.status === 'void');

  const dayAgo = now - 24 * 60 * 60 * 1000;
  const reads24h = accessRows.filter((row) => row.createdAt.getTime() >= dayAgo).length;
  const writes24h = actionRows.filter((row) => row.createdAt.getTime() >= dayAgo).length;
  const auditEvents = [
    ...accessRows.slice(0, 8).map((row) => ({
      id: `read:${row.id}`,
      kind: 'read' as const,
      staffEmail: row.staffEmail,
      orgName: row.orgName,
      label: `Viewed ${humanize(row.scope)}`,
      detail: row.targetId ? `target ${row.targetId}` : 'customer data',
      createdAt: row.createdAt.getTime(),
    })),
    ...actionRows.slice(0, 8).map((row) => ({
      id: `write:${row.id}`,
      kind: 'write' as const,
      staffEmail: row.staffEmail,
      orgName: row.orgName,
      label: humanize(row.action),
      detail: row.reason,
      createdAt: row.createdAt.getTime(),
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  const tableRows: CustomerRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    entitlementState: o.entitlementState,
    activeSeats: o.activeSeats,
    entitledSeats: o.entitledSeats,
    trialEndsAt: o.trialEndsAt ? fmtDate(o.trialEndsAt) : null,
    memberCount: o.memberCount,
    childCount: o.childCount,
    lastActivityAt: o.lastActivityAt ? fmtDate(o.lastActivityAt) : null,
    createdAt: fmtDate(o.createdAt),
  }));

  return (
    <CommandCenterView
      customerCount={orgs.length}
      queueRows={queueRows}
      tableRows={tableRows}
      totals={{
        activeSeats,
        entitledSeats,
        seatPct,
        listPriceCents: activeSeats * 100,
        workspaceCount,
        activityCoverage,
        activityCoveragePct: orgs.length ? (activityCoverage / orgs.length) * 100 : 0,
      }}
      customerStates={{
        active: orgs.filter((o) => o.entitlementState === 'active').length,
        trial: orgs.filter((o) => o.entitlementState === 'trial').length,
        pastDue: orgs.filter((o) => o.entitlementState === 'past_due').length,
        cancelled: orgs.filter((o) => o.entitlementState === 'cancelled').length,
      }}
      financials={{
        currency: displayCurrency,
        billedCents: billedInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0),
        collectedCents: paidInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0),
        outstandingCents: dueInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0),
        invoiceCount: billedInvoices.length,
        paidCount: paidInvoices.length,
        dueCount: dueInvoices.length,
        voidCount: voidInvoices.length,
        excludedCurrencyRows: invoices.length - currencyInvoices.length,
      }}
      audit={{ reads24h, writes24h, events: auditEvents }}
      trialsEndingCount={queues.trialsEnding.length}
      overdueCount={queues.overdueInvoices.length}
      nextTrialEnd={nextTrialEnd ? fmtDate(nextTrialEnd) : null}
      now={now}
    />
  );
}

function humanize(value: string) {
  return value.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

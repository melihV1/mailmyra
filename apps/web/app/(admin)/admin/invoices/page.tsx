import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listInvoicesAdmin, NotStaffError } from '../../../../lib/repo/admin';
import { getLang } from '../../../../lib/i18n/lang.server';
import { adminRevenue } from '../../../../lib/i18n/dict/admin-revenue';
import type { InvoiceWorkbenchRow } from '../../invoice-workbench-model';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { InvoiceWorkbenchView } from '../../ui/InvoiceWorkbenchView';
import { RefreshButton } from '../../ui/RefreshButton';

export const metadata = { title: 'Invoices — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default async function AdminInvoicesPage() {
  const lang = await getLang();
  const t = adminRevenue[lang].invoicesPage;
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/invoices');

  let invoices;
  try {
    invoices = await listInvoicesAdmin(session.user.id);
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }

  const rows: InvoiceWorkbenchRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    orgId: invoice.orgId,
    orgName: invoice.orgName,
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt?.toISOString() ?? null,
    seats: invoice.seats,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    paymentMethod: invoice.paymentMethod,
    paymentReference: invoice.paymentReference,
    note: invoice.note,
  }));

  return (
    <section>
      <AdminPageHeader
        crumb="Revenue / Invoices"
        title="Invoices"
        support="Track authoritative billing records, collection windows and overdue balances by currency."
        right={
          <>
            <Link href="/admin/orgs" className="btn btn-primary btn-sm">
              <i className="icon-base ti tabler-file-plus me-2" aria-hidden="true" />
              {t.issueFromCustomer}
            </Link>
            <RefreshButton />
          </>
        }
      />
      <InvoiceWorkbenchView rows={rows} now={Date.now()} />
    </section>
  );
}

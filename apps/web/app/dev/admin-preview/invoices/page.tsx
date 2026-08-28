import { notFound } from 'next/navigation';

import { AdminShell } from '../../../(admin)/AdminShell';
import type { InvoiceWorkbenchRow } from '../../../(admin)/invoice-workbench-model';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { InvoiceWorkbenchView } from '../../../(admin)/ui/InvoiceWorkbenchView';
import { LangProvider } from '../../../../lib/i18n/LangProvider';
import { getLang } from '../../../../lib/i18n/lang.server';
import '../../../(app)/panel-overrides.css';

export default async function InvoicesPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const lang = await getLang();

  const now = Date.UTC(2026, 7, 20, 9, 0);
  const day = 24 * 60 * 60 * 1000;
  const iso = (time: number) => new Date(time).toISOString();
  const rows: InvoiceWorkbenchRow[] = [
    {
      id: 'invoice-1', number: 'MM-2026-0142', orgId: 'org-1', orgName: 'Bristol Metalworks',
      issuedAt: iso(now - 37 * day), dueAt: iso(now - 7 * day), seats: 48, amountCents: 4800,
      currency: 'USD', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null,
      note: 'Renewal invoice. Procurement contact confirmed by support.',
    },
    {
      id: 'invoice-2', number: 'MM-2026-0141', orgId: 'org-2', orgName: 'Harbor & Lane Agency',
      issuedAt: iso(now - 18 * day), dueAt: iso(now + 12 * day), seats: 120, amountCents: 12000,
      currency: 'USD', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null,
      note: 'Pooled senders across six client workspaces.',
    },
    {
      id: 'invoice-3', number: 'MM-2026-0139', orgId: 'org-3', orgName: 'Northwind Studio',
      issuedAt: iso(now - 46 * day), dueAt: iso(now - 16 * day), seats: 25, amountCents: 2500,
      currency: 'USD', status: 'paid', paidAt: iso(now - 20 * day), paymentMethod: 'bank_transfer',
      paymentReference: 'TRX-804922', note: null,
    },
    {
      id: 'invoice-4', number: 'MM-2026-0137', orgId: 'org-4', orgName: 'Quiet Coast Consulting',
      issuedAt: iso(now - 75 * day), dueAt: iso(now - 45 * day), seats: 8, amountCents: 800,
      currency: 'USD', status: 'void', paidAt: null, paymentMethod: null, paymentReference: null,
      note: 'Voided after duplicate manual issue.',
    },
    {
      id: 'invoice-5', number: 'MM-2026-0136', orgId: 'org-5', orgName: 'Atlas Field Services',
      issuedAt: iso(now - 88 * day), dueAt: null, seats: 60, amountCents: 6000,
      currency: 'USD', status: 'paid', paidAt: iso(now - 80 * day), paymentMethod: 'cash',
      paymentReference: 'CASH-2026-19', note: null,
    },
    {
      id: 'invoice-6', number: 'MM-EU-2026-003', orgId: 'org-6', orgName: 'Fieldnote Publishing',
      issuedAt: iso(now - 12 * day), dueAt: iso(now + 18 * day), seats: 40, amountCents: 4000,
      currency: 'EUR', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null,
      note: 'Euro ledger example for currency isolation.',
    },
  ];

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <LangProvider lang={lang}>
      <AdminShell email="staff@voldi.net">
        <section>
          <AdminPageHeader
            crumb="Revenue / Invoices"
            title="Invoices"
            support="Track authoritative billing records, collection windows and overdue balances by currency."
            right={
              <button type="button" className="btn btn-primary btn-sm">
                <i className="icon-base ti tabler-file-plus me-2" aria-hidden="true" />
                Issue from customer
              </button>
            }
          />
          <InvoiceWorkbenchView rows={rows} now={now} mutationsEnabled={false} />
        </section>
      </AdminShell>
      </LangProvider>
    </>
  );
}

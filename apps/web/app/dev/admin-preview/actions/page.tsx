import { notFound } from 'next/navigation';

import { AdminShell } from '../../../(admin)/AdminShell';
import type { AdminActionLogRow } from '../../../(admin)/action-log-model';
import { AdminActionLogView } from '../../../(admin)/ui/AdminActionLogView';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { LangProvider } from '../../../../lib/i18n/LangProvider';
import { getLang } from '../../../../lib/i18n/lang.server';
import '../../../(app)/panel-overrides.css';

export default async function AdminActionsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const lang = await getLang();

  const now = Date.UTC(2026, 7, 20, 9, 30);
  const minute = 60 * 1000;
  const day = 24 * 60 * minute;
  const iso = (value: number) => new Date(value).toISOString();
  const client = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139.0 Safari/537.36';
  const rows: AdminActionLogRow[] = [
    {
      id: 'action-1', staffEmail: 'support@mailmyra.com', orgId: 'org-1', orgName: 'Bristol Metalworks',
      action: 'entitlement.set', targetId: null,
      before: { entitledSeats: 40, entitlementState: 'trial', trialEndsAt: '2026-08-22T00:00:00.000Z' },
      after: { entitledSeats: 55, entitlementState: 'active', trialEndsAt: null },
      reason: 'Approved annual plan after procurement confirmation and updated the contracted seat allowance.',
      ip: '192.0.2.18', userAgent: client, createdAt: iso(now - 18 * minute),
    },
    {
      id: 'action-2', staffEmail: 'billing@mailmyra.com', orgId: 'org-2', orgName: 'Harbor & Lane Agency',
      action: 'invoice.created', targetId: 'invoice-0142', before: {},
      after: { number: 'MM-2026-0142', seats: 120, amountCents: 12000, currency: 'USD' },
      reason: 'Issued the annual invoice for the confirmed pooled sender count across client workspaces.',
      ip: '192.0.2.22', userAgent: client, createdAt: iso(now - 73 * minute),
    },
    {
      id: 'action-3', staffEmail: 'billing@mailmyra.com', orgId: 'org-3', orgName: 'Northwind Studio',
      action: 'invoice.status_set', targetId: 'invoice-0139', before: { status: 'due' },
      after: { status: 'paid', paidAt: iso(now - 2 * 60 * minute), method: 'bank_transfer', reference: 'TRX-804922' },
      reason: 'Matched the bank transfer to the invoice and recorded the payment reference supplied by finance.',
      ip: '192.0.2.22', userAgent: client, createdAt: iso(now - 2 * 60 * minute),
    },
    {
      id: 'action-4', staffEmail: 'support@mailmyra.com', orgId: 'org-4', orgName: 'Quiet Coast Consulting',
      action: 'invoice.status_set', targetId: 'invoice-0137', before: { status: 'due' }, after: { status: 'void' },
      reason: 'Voided a duplicate manual invoice after confirming the original record remains authoritative.',
      ip: '192.0.2.18', userAgent: client, createdAt: iso(now - day),
    },
    {
      id: 'action-5', staffEmail: 'melih@mailmyra.com', orgId: 'org-5', orgName: 'Atlas Field Services',
      action: 'entitlement.set', targetId: null,
      before: { entitledSeats: 50, entitlementState: 'active', trialEndsAt: null },
      after: { entitledSeats: 65, entitlementState: 'active', trialEndsAt: null },
      reason: 'Applied the signed seat amendment supplied by the customer success owner.',
      ip: '198.51.100.7', userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', createdAt: iso(now - 3 * day),
    },
    {
      id: 'action-6', staffEmail: 'support@mailmyra.com', orgId: 'org-6', orgName: 'Fieldnote Publishing',
      action: 'entitlement.set', targetId: null,
      before: { entitledSeats: 20, entitlementState: 'trial', trialEndsAt: '2026-08-19T00:00:00.000Z' },
      after: { entitledSeats: 20, entitlementState: 'trial', trialEndsAt: '2026-08-26T00:00:00.000Z' },
      reason: 'Extended the evaluation window by seven days while the customer completes inbox verification.',
      ip: null, userAgent: null, createdAt: iso(now - 8 * day),
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
            crumb="Security & governance / Admin action log"
            title="Admin action log"
            support="Review every staff write with its customer, mandatory reason and immutable before/after snapshot."
          />
          <AdminActionLogView rows={rows} now={now} />
        </section>
      </AdminShell>
      </LangProvider>
    </>
  );
}

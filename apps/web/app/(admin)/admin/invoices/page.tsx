import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listInvoicesAdmin, NotStaffError } from '../../../../lib/repo/admin';
import { fmtDate, fmtMoney, INVOICE_BADGE } from '../../format';
import { InvoiceRowActions } from '../orgs/[id]/InvoiceRowActions';

export const metadata = { title: 'Invoices — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** "Kim ödemedi" — müşteri fark etmeksizin tek liste. Kesme org sayfasında. */
export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/invoices');
  const params = await searchParams;
  const filter = typeof params.status === 'string' ? params.status : '';

  let invoices;
  try {
    invoices = await listInvoicesAdmin(session.user.id);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  const rows = filter ? invoices.filter((i) => i.status === filter) : invoices;
  const outstanding = invoices
    .filter((i) => i.status === 'due')
    .reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <section>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-1">Invoices</h4>
          <p className="text-body-secondary mb-0">
            Outstanding: <strong>{fmtMoney(outstanding, 'USD')}</strong>
          </p>
        </div>
        <div className="btn-group ms-auto" role="group" aria-label="Status filter">
          {['', 'due', 'paid', 'void'].map((s) => (
            <Link
              key={s || 'all'}
              href={s ? `/admin/invoices?status=${s}` : '/admin/invoices'}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-label-secondary'}`}
            >
              {s || 'all'}
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-responsive text-nowrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-body-secondary">
                    {filter ? `No ${filter} invoices.` : 'No invoices yet — issue the first one from a customer page.'}
                  </td>
                </tr>
              )}
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="fw-medium">{inv.number}</td>
                  <td>
                    <Link href={`/admin/orgs/${inv.orgId}`}>{inv.orgName}</Link>
                  </td>
                  <td className="small">{fmtDate(inv.issuedAt)}</td>
                  <td className="small">{fmtDate(inv.dueAt)}</td>
                  <td>{inv.seats}</td>
                  <td>{fmtMoney(inv.amountCents, inv.currency)}</td>
                  <td>
                    <span className={`badge ${INVOICE_BADGE[inv.status] ?? 'bg-label-secondary'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="small text-body-secondary">
                    {inv.paidAt ? `${fmtDate(inv.paidAt)} · ${inv.paymentMethod ?? ''}` : '—'}
                  </td>
                  <td className="text-end">
                    <InvoiceRowActions id={inv.id} number={inv.number} status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

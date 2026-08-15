import { notFound, redirect } from 'next/navigation';

import { AutoPrint } from '../../../../../../AutoPrint';
import { currentSession } from '../../../../../../../../lib/auth/current';
import { invoiceDate, invoiceTotals, money } from '../../../../../../../../lib/invoice-format';
import { getInvoiceAs } from '../../../../../../../../lib/repo/invoices';

export const metadata = { title: 'Print invoice — Mailmyra' };

/** Temanın `app-invoice-print` sayfası — beyaz sayfa, açılınca yazdırır. */
export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const inv = await getInvoiceAs(session.user.id, id);
  if (!inv) notFound();

  const { lineTotalCents, adjustmentCents } = invoiceTotals(inv);

  return (
    <div className="invoice-print p-12">
      <AutoPrint />
      <div className="d-flex justify-content-between flex-row">
        <div className="mb-6">
          <div className="d-flex svg-illustration mb-6 gap-2 align-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Mailmyra" height={28} />
          </div>
          <p className="mb-1">Mailmyra — a Voldi Creative product</p>
          <p className="mb-1">Konya, Türkiye</p>
          <p className="mb-0">mailmyra.com</p>
        </div>
        <div>
          <h5 className="mb-6">INVOICE {inv.number}</h5>
          <div className="mb-1">
            <span>Date issued: </span>
            <span>{invoiceDate(inv.issuedAt)}</span>
          </div>
          {inv.dueAt && (
            <div>
              <span>Date due: </span>
              <span>{invoiceDate(inv.dueAt)}</span>
            </div>
          )}
        </div>
      </div>

      <hr className="mb-6" />

      <div className="row d-flex justify-content-between mb-6">
        <div className="col-sm-6 w-50">
          <h6>Invoice to:</h6>
          <p className="mb-1">{inv.orgName}</p>
          <p className="mb-0">Mailmyra workspace</p>
        </div>
        <div className="col-sm-6 w-50">
          <h6>Details:</h6>
          <table>
            <tbody>
              <tr>
                <td className="pe-4">Total due:</td>
                <td>{money(inv.amountCents, inv.currency)}</td>
              </tr>
              <tr>
                <td className="pe-4">Seats:</td>
                <td>{inv.seats}</td>
              </tr>
              <tr>
                <td className="pe-4">Price:</td>
                <td>{money(inv.unitCents, inv.currency)} per active sender / year</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-responsive border border-bottom-0 border-top-0 rounded">
        <table className="table m-0">
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Cost</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mailmyra seat</td>
              <td>Active sender · 1 year</td>
              <td>{money(inv.unitCents, inv.currency)}</td>
              <td>{inv.seats}</td>
              <td>{money(lineTotalCents, inv.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-responsive">
        <table className="table m-0 table-borderless">
          <tbody>
            <tr>
              <td className="align-top pe-6 ps-0 py-6">
                <p className="mb-1">
                  <span className="me-2 fw-medium">Issued by:</span>
                  <span>Voldi Creative</span>
                </p>
                <span>Thanks for your business!</span>
              </td>
              <td className="px-0 py-6 w-px-100">
                <p className="mb-2">Subtotal:</p>
                {adjustmentCents !== 0 && <p className="mb-2">Adjustment:</p>}
                <p className="mb-0 border-top pt-2">Total:</p>
              </td>
              <td className="text-end px-0 py-6 w-px-100">
                <p className="mb-2">{money(lineTotalCents, inv.currency)}</p>
                {adjustmentCents !== 0 && (
                  <p className="mb-2">{money(adjustmentCents, inv.currency)}</p>
                )}
                <p className="mb-0 border-top pt-2">{money(inv.amountCents, inv.currency)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {inv.note && (
        <>
          <hr className="mt-0 mb-6" />
          <div>
            <span className="fw-medium">Note: </span>
            <span>{inv.note}</span>
          </div>
        </>
      )}
    </div>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { currentSession } from '../../../../../../../lib/auth/current';
import { account as accountDict } from '../../../../../../../lib/i18n/dict/account';
import { getLang } from '../../../../../../../lib/i18n/lang.server';
import { invoiceDate, INVOICE_STATUS_BADGE, invoiceTotals, money } from '../../../../../../../lib/invoice-format';
import { getInvoiceAs } from '../../../../../../../lib/repo/invoices';

export async function generateMetadata() {
  return { title: accountDict[await getLang()].pageTitles.invoice };
}

/**
 * Fatura görüntüleme — temanın `app-invoice-preview` düzeni: solda fatura
 * kartı (satıcı/alıcı, kalem tablosu, toplamlar, not), sağda aksiyon kartı.
 * Send/Download/Payment alınmadı — faturalar manuel kesiliyor; Print
 * yeni sekmede chrome'suz yazdırma sayfasını açar (tarayıcının PDF'e
 * yazdırması "download"ın kendisi).
 *
 * Tarih/tutar/durum rozeti `lib/invoice-format.ts`'ten geliyor — bu
 * görevin dosya listesinde YOK, (admin) raporlarıyla paylaşılıyor,
 * kasıtlı dokunulmadı (EN kalır, bkz. görev raporu).
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/billing');
  const lang = await getLang();
  const t = accountDict[lang];

  const { id } = await params;
  const inv = await getInvoiceAs(session.user.id, id);
  if (!inv) notFound();

  const badge = INVOICE_STATUS_BADGE[inv.status];
  const { lineTotalCents, adjustmentCents } = invoiceTotals(inv);

  return (
    <section>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link
          href="/app/account/billing"
          className="btn btn-sm btn-icon btn-label-secondary"
          aria-label={t.invoiceDetail.backToBilling}
        >
          <i className="icon-base ti tabler-chevron-left" aria-hidden="true" />
        </Link>
        <h4 className="mb-0">{t.invoiceDetail.heading(inv.number)}</h4>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="row invoice-preview">
        <div className="col-xl-9 col-md-8 col-12 mb-md-0 mb-6">
          <div className="card invoice-preview-card p-sm-12 p-6">
            <div className="card-body invoice-preview-header rounded">
              <div className="d-flex justify-content-between flex-xl-row flex-md-column flex-sm-row flex-column align-items-xl-center align-items-md-start align-items-sm-center align-items-start">
                <div className="mb-xl-0 mb-6 text-heading">
                  <div className="d-flex svg-illustration mb-6 gap-2 align-items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.svg" alt="Mailmyra" height={28} />
                  </div>
                  <p className="mb-2">Mailmyra — a Voldi Creative product</p>
                  <p className="mb-2">Konya, Türkiye</p>
                  <p className="mb-0">mailmyra.com</p>
                </div>
                <div>
                  <h5 className="mb-6">{t.invoiceDetail.heading(inv.number)}</h5>
                  <div className="mb-1 text-heading">
                    <span>{t.invoiceDetail.dateIssued}</span>
                    <span className="fw-medium">{invoiceDate(inv.issuedAt)}</span>
                  </div>
                  {inv.dueAt && (
                    <div className="text-heading">
                      <span>{t.invoiceDetail.dateDue}</span>
                      <span className="fw-medium">{invoiceDate(inv.dueAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body px-0">
              <div className="row">
                <div className="col-xl-6 col-md-12 col-sm-5 col-12 mb-xl-0 mb-md-6 mb-sm-0 mb-6">
                  <h6>{t.invoiceDetail.invoiceTo}</h6>
                  <p className="mb-1 fw-medium text-heading">{inv.orgName}</p>
                  <p className="mb-0">{t.invoiceDetail.workspaceLine}</p>
                </div>
                <div className="col-xl-6 col-md-12 col-sm-7 col-12">
                  <h6>{t.invoiceDetail.details}</h6>
                  <table>
                    <tbody>
                      <tr>
                        <td className="pe-4">{t.invoiceDetail.totalDue}</td>
                        <td className="fw-medium">{money(inv.amountCents, inv.currency)}</td>
                      </tr>
                      <tr>
                        <td className="pe-4">{t.invoiceDetail.seats}</td>
                        <td>{inv.seats}</td>
                      </tr>
                      <tr>
                        <td className="pe-4">{t.invoiceDetail.price}</td>
                        <td>
                          {money(inv.unitCents, inv.currency)} {t.perActiveSenderYear}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="table-responsive border border-bottom-0 border-top-0 rounded">
              <table className="table m-0">
                <thead>
                  <tr>
                    <th>{t.invoiceDetail.itemTable.colItem}</th>
                    <th>{t.invoiceDetail.itemTable.colDescription}</th>
                    <th>{t.invoiceDetail.itemTable.colCost}</th>
                    <th>{t.invoiceDetail.itemTable.colQty}</th>
                    <th>{t.invoiceDetail.itemTable.colPrice}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-nowrap text-heading">{t.invoiceDetail.seatItemName}</td>
                    <td className="text-nowrap">{t.invoiceDetail.seatItemDescription}</td>
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
                    <td className="align-top pe-6 ps-0 py-6 text-body">
                      <p className="mb-1">
                        <span className="me-2 h6">{t.invoiceDetail.issuedBy}</span>
                        <span>Voldi Creative</span>
                      </p>
                      <span>{t.invoiceDetail.thanks}</span>
                    </td>
                    <td className="px-0 py-6 w-px-100">
                      <p className="mb-2">{t.invoiceDetail.subtotal}</p>
                      {adjustmentCents !== 0 && <p className="mb-2">{t.invoiceDetail.adjustment}</p>}
                      <p className="mb-0 border-top pt-2">{t.invoiceDetail.total}</p>
                    </td>
                    <td className="text-end px-0 py-6 w-px-100 fw-medium text-heading">
                      <p className="fw-medium mb-2">{money(lineTotalCents, inv.currency)}</p>
                      {adjustmentCents !== 0 && (
                        <p className="fw-medium mb-2">{money(adjustmentCents, inv.currency)}</p>
                      )}
                      <p className="fw-medium mb-0 border-top pt-2">
                        {money(inv.amountCents, inv.currency)}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {inv.note && (
              <>
                <hr className="mt-0 mb-6" />
                <div className="card-body p-0">
                  <div className="row">
                    <div className="col-12">
                      <span className="fw-medium text-heading">{t.invoiceDetail.note}</span>
                      <span>{inv.note}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-xl-3 col-md-4 col-12 invoice-actions">
          <div className="card">
            <div className="card-body">
              <a
                className="btn btn-primary d-grid w-100 mb-4"
                target="_blank"
                href={`/app/account/billing/invoices/${inv.id}/print`}
              >
                <span className="d-flex align-items-center justify-content-center text-nowrap">
                  <i className="icon-base ti tabler-printer icon-xs me-2" aria-hidden="true" />
                  {t.invoiceDetail.print}
                </span>
              </a>
              <Link className="btn btn-label-secondary d-grid w-100" href="/app/account/billing">
                {t.invoiceDetail.backToBilling}
              </Link>
              <div className="alert alert-secondary mt-4 mb-0" role="note">
                {t.invoiceDetail.manualNote}{' '}
                <a href="https://mailmyra.com/contact">{t.contactUs}</a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

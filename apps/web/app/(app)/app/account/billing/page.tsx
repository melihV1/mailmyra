import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PRICING } from '@mailmyra/core';
import { currentSession } from '../../../../../lib/auth/current';
import { prisma } from '../../../../../lib/db';
import { account as accountDict } from '../../../../../lib/i18n/dict/account';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { invoiceDate, INVOICE_STATUS_BADGE, money } from '../../../../../lib/invoice-format';
import { listInvoicesAs } from '../../../../../lib/repo/invoices';
import { primaryOrgId, resolveBillingOrgId, seatSummary } from '../../../../../lib/repo/senders';
import { AccountTabs } from '../AccountTabs';

export async function generateMetadata() {
  return { title: accountDict[await getLang()].pageTitles.billing };
}

/**
 * Billing & Plan sekmesi — eski plan kutusunun tema diliyle büyümüş hali.
 * Tek ürün tek fiyat ($1/aktif gönderici/yıl, CLAUDE.md kilitli karar);
 * ilk 10 müşteri manuel faturalanıyor — otomatik abonelik YOK, o yüzden
 * kart/ödeme formu da yok: "contact us" gerçeği ekranda açıkça yazıyor.
 *
 * `lib/invoice-format.ts` (money/invoiceDate/INVOICE_STATUS_BADGE) bu
 * görevin dosya listesinde YOK ve (admin) raporlarıyla paylaşılıyor —
 * kasıtlı dokunulmadı: fatura tablosundaki tarih/durum rozeti EN kalıyor
 * (bkz. görev raporu).
 */
export default async function BillingPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/billing');
  const lang = await getLang();
  const t = accountDict[lang];

  const orgId = await primaryOrgId(session.user.id);
  const [seats, billing, invoices] = await Promise.all([
    seatSummary(session.user.id),
    orgId
      ? resolveBillingOrgId(prisma, orgId).then((billingOrgId) =>
          prisma.organization.findUniqueOrThrow({
            where: { id: billingOrgId },
            select: { entitlementState: true, trialEndsAt: true },
          }),
        )
      : Promise.resolve(null),
    // null = billing:manage yok (owner değil) — tablo yerine kısa not.
    listInvoicesAs(session.user.id),
  ]);

  const priceDisplay = (PRICING.perSeatYearCents / 100).toFixed(2);
  const pct = seats.entitled > 0 ? Math.min(100, (seats.active / seats.entitled) * 100) : 0;
  const full = seats.active >= seats.entitled;

  const STATE_LABEL: Record<string, { label: string; cls: string }> = {
    active: { label: t.billing.planState.active, cls: 'bg-label-success' },
    past_due: { label: t.billing.planState.past_due, cls: 'bg-label-warning' },
    cancelled: { label: t.billing.planState.cancelled, cls: 'bg-label-danger' },
  };

  const state =
    billing?.entitlementState === 'trial'
      ? {
          label: billing.trialEndsAt
            ? t.billing.trialEnds(
                billing.trialEndsAt.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB'),
              )
            : t.billing.trial,
          cls: 'bg-label-info',
        }
      : billing
        ? (STATE_LABEL[billing.entitlementState] ?? {
            label: billing.entitlementState,
            cls: 'bg-label-secondary',
          })
        : null;

  return (
    <section>
      <AccountTabs />

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-start pb-2">
              <div className="card-title m-0">
                <h5 className="mb-1">{t.billing.currentPlanTitle}</h5>
                <p className="card-subtitle mb-0">{t.billing.currentPlanSubtitle}</p>
              </div>
              {state && <span className={`badge ${state.cls}`}>{state.label}</span>}
            </div>
            <div className="card-body">
              <div className="d-flex align-items-baseline gap-2 mb-3">
                <h2 className="mb-0">${priceDisplay}</h2>
                <span className="text-body-secondary">{t.perActiveSenderYear}</span>
              </div>
              <ul className="list-unstyled d-grid gap-2 mb-0">
                {t.billing.bullets.map((bullet) => (
                  <li key={bullet} className="d-flex align-items-center">
                    <i
                      className="icon-base ti tabler-check icon-sm text-success me-2"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card h-100">
            <div className="card-header pb-2">
              <div className="card-title m-0">
                <h5 className="mb-1">{t.billing.seatsTitle}</h5>
                <p className="card-subtitle mb-0">{t.billing.seatsSubtitle}</p>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <h3 className="mb-0">
                  {seats.active}
                  <span className="text-body-secondary fs-5"> / {seats.entitled}</span>
                </h3>
                <span className="text-body-secondary">{t.billing.inUse}</span>
              </div>
              <div className="progress mb-3" style={{ height: 8 }} aria-hidden="true">
                <div
                  className={`progress-bar${full ? ' bg-danger' : pct >= 80 ? ' bg-warning' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="alert alert-secondary mb-0" role="note">
                <span className="fw-medium">{t.billing.manualNote}</span>{' '}
                {t.billing.manualNoteTrail}{' '}
                <a href="https://mailmyra.com/contact">{t.contactUs}</a>
                {t.billing.manualNoteEnd}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fatura geçmişi — otomatik abonelik YOK (kilitli karar); kayıtları
          ekip elle keser, burası yalnız listeler. Görme hakkı billing:manage
          (owner) — tutarlar org'un ticari bilgisi. */}
      <div className="card mt-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">{t.billing.invoiceHistoryTitle}</h5>
          <span className="badge bg-label-secondary">{t.billing.manualBillingBadge}</span>
        </div>
        {invoices === null ? (
          <div className="card-body pt-0 text-body-secondary">{t.billing.ownersOnlyNote}</div>
        ) : (
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.billing.table.colInvoice}</th>
                  <th>{t.billing.table.colDate}</th>
                  <th>{t.billing.table.colSeats}</th>
                  <th>{t.billing.table.colAmount}</th>
                  <th>{t.billing.table.colStatus}</th>
                  <th>{t.billing.table.colActions}</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-body-secondary">
                      <i className="icon-base ti tabler-file-dollar icon-26px d-block mx-auto mb-2" />
                      {t.billing.emptyInvoices}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const badge = INVOICE_STATUS_BADGE[inv.status];
                    return (
                      <tr key={inv.id}>
                        <td>
                          <Link
                            href={`/app/account/billing/invoices/${inv.id}`}
                            className="fw-medium text-heading"
                          >
                            {inv.number}
                          </Link>
                        </td>
                        <td>{invoiceDate(inv.issuedAt)}</td>
                        <td>{inv.seats}</td>
                        <td>{money(inv.amountCents, inv.currency)}</td>
                        <td>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td>
                          <Link
                            href={`/app/account/billing/invoices/${inv.id}`}
                            className="btn btn-sm btn-icon btn-label-secondary"
                            aria-label={t.billing.viewInvoiceAria(inv.number)}
                          >
                            <i className="icon-base ti tabler-eye" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

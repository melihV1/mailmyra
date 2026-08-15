import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PRICING } from '@mailmyra/core';
import { currentSession } from '../../../../../lib/auth/current';
import { prisma } from '../../../../../lib/db';
import { invoiceDate, INVOICE_STATUS_BADGE, money } from '../../../../../lib/invoice-format';
import { listInvoicesAs } from '../../../../../lib/repo/invoices';
import { primaryOrgId, resolveBillingOrgId, seatSummary } from '../../../../../lib/repo/senders';
import { AccountTabs } from '../AccountTabs';

export const metadata = { title: 'Billing & Plan — Mailmyra' };

/** entitlementState enum değerlerinin ekran metni — trial ayrı ele alınıyor. */
const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-label-success' },
  past_due: { label: 'Past due', cls: 'bg-label-warning' },
  cancelled: { label: 'Cancelled', cls: 'bg-label-danger' },
};

/**
 * Billing & Plan sekmesi — eski plan kutusunun tema diliyle büyümüş hali.
 * Tek ürün tek fiyat ($1/aktif gönderici/yıl, CLAUDE.md kilitli karar);
 * ilk 10 müşteri manuel faturalanıyor — otomatik abonelik YOK, o yüzden
 * kart/ödeme formu da yok: "contact us" gerçeği ekranda açıkça yazıyor.
 */
export default async function BillingPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/billing');

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

  const state =
    billing?.entitlementState === 'trial'
      ? {
          label: billing.trialEndsAt
            ? `Trial — ends ${billing.trialEndsAt.toLocaleDateString('en-GB')}`
            : 'Trial',
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
                <h5 className="mb-1">Current plan</h5>
                <p className="card-subtitle mb-0">One product, one price</p>
              </div>
              {state && <span className={`badge ${state.cls}`}>{state.label}</span>}
            </div>
            <div className="card-body">
              <div className="d-flex align-items-baseline gap-2 mb-3">
                <h2 className="mb-0">${priceDisplay}</h2>
                <span className="text-body-secondary">per active sender / year</span>
              </div>
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li className="d-flex align-items-center">
                  <i
                    className="icon-base ti tabler-check icon-sm text-success me-2"
                    aria-hidden="true"
                  />
                  Annual billing only — no monthly tiers, no feature locks
                </li>
                <li className="d-flex align-items-center">
                  <i
                    className="icon-base ti tabler-check icon-sm text-success me-2"
                    aria-hidden="true"
                  />
                  Drafts are free — a seat is used only when a sender is live
                </li>
                <li className="d-flex align-items-center">
                  <i
                    className="icon-base ti tabler-check icon-sm text-success me-2"
                    aria-hidden="true"
                  />
                  7-day full trial, no card required
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card h-100">
            <div className="card-header pb-2">
              <div className="card-title m-0">
                <h5 className="mb-1">Seats</h5>
                <p className="card-subtitle mb-0">Active senders in your workspace</p>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <h3 className="mb-0">
                  {seats.active}
                  <span className="text-body-secondary fs-5"> / {seats.entitled}</span>
                </h3>
                <span className="text-body-secondary">in use</span>
              </div>
              <div className="progress mb-3" style={{ height: 8 }} aria-hidden="true">
                <div
                  className={`progress-bar${full ? ' bg-danger' : pct >= 80 ? ' bg-warning' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="alert alert-secondary mb-0" role="note">
                <span className="fw-medium">Invoices are issued manually by our team.</span>{' '}
                To add seats or update billing details,{' '}
                <a href="https://mailmyra.com/contact">contact us</a> — changes usually land the
                same day.
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
          <h5 className="card-title mb-0">Invoice history</h5>
          <span className="badge bg-label-secondary">Manual billing</span>
        </div>
        {invoices === null ? (
          <div className="card-body pt-0 text-body-secondary">
            Invoices are visible to workspace owners.
          </div>
        ) : (
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-body-secondary">
                      <i className="icon-base ti tabler-file-dollar icon-26px d-block mx-auto mb-2" />
                      No invoices recorded yet — invoices are issued manually by our team and
                      will appear here.
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
                            aria-label={`View invoice ${inv.number}`}
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

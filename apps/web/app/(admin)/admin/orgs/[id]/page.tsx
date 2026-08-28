import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import {
  getOrganization,
  listInvoicesAdmin,
  listOrgSenders,
  listOrgSignatures,
  listStaffAccess,
  NotStaffError,
} from '../../../../../lib/repo/admin';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminCustomers } from '../../../../../lib/i18n/dict/admin-customers';
import { fmtDate, fmtMoney, INVOICE_BADGE, STATE_BADGE } from '../../../format';
import { EntitlementDialog } from './EntitlementDialog';
import { InvoiceCreateDialog } from './InvoiceCreateDialog';
import { InvoiceRowActions } from './InvoiceRowActions';
import { SignaturePreviewButton } from './SignaturePreviewButton';

export const metadata = { title: 'Customer — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Müşteri 360 — düzen temanın `app-user-view` kalıbı: solda kimlik kartı +
 * plan kartı (Current Plan bileşeninin karşılığı) + aktivasyon; sağda tablo
 * kartları. Bu sayfayı AÇMAK `StaffAccess`e üç satır düşürür (org + senders
 * + signatures); günlük yazılamazsa repo fırlatır, sayfa açılmaz.
 *
 * `metadata` (sekme başlığı) bu görevin DIŞI — Task 12, 44 sayfanın
 * `generateMetadata`'sını tek seferde çevirir; burada elle dokunulmadı.
 * Sunucu bileşeni olduğu için `useLang()` değil `getLang()` kullanır
 * (sweep-method §3 — "sunucu sayfa parçaları getLang() ile").
 */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin');
  const { id } = await params;
  const lang = await getLang();
  const t = adminCustomers[lang].orgDetail;

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  };

  let org, senders, signatures, invoices, access;
  try {
    org = await getOrganization(session.user.id, id, ctx);
    if (!org) notFound();
    [senders, signatures, invoices, access] = await Promise.all([
      listOrgSenders(session.user.id, id, ctx),
      listOrgSignatures(session.user.id, id, ctx),
      listInvoicesAdmin(session.user.id, { orgId: id }),
      listStaffAccess(session.user.id, { orgId: id }),
    ]);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  const seatPct =
    org.entitledSeats > 0 ? Math.min(100, (org.activeSeats / org.entitledSeats) * 100) : 0;

  const ACTIVATION: Array<{ label: string; done: boolean }> = [
    { label: t.activation.emailVerified, done: org.activation.emailVerified },
    { label: t.activation.signatureCreated, done: org.activation.signatureCreated },
    { label: t.activation.senderCreated, done: org.activation.senderCreated },
    { label: t.activation.senderPublished, done: org.activation.senderPublished },
    { label: t.activation.firstExport, done: org.activation.exported },
  ];
  const stuckAt = ACTIVATION.find((s) => !s.done);

  return (
    <section>
      <div className="row g-6">
        {/* ── Sol: kimlik + plan + aktivasyon (user-view sol kolonu) ── */}
        <div className="col-xl-4 col-lg-5">
          <div className="card mb-6">
            <div className="card-body pt-12">
              <div className="user-avatar-section">
                <div className="d-flex align-items-center flex-column">
                  <div className="avatar avatar-xl mb-4">
                    <span className="avatar-initial rounded bg-label-primary">
                      {org.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="user-info text-center">
                    <h5 className="mb-2">{org.name}</h5>
                    <span
                      className={`badge ${STATE_BADGE[org.entitlementState] ?? 'bg-label-secondary'}`}
                    >
                      {org.entitlementState}
                    </span>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-around flex-wrap my-6 gap-2">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar">
                    <div className="avatar-initial bg-label-primary rounded">
                      <i className="icon-base ti tabler-users icon-lg" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <h5 className="mb-0">
                      {org.activeSeats}/{org.entitledSeats}
                    </h5>
                    <span>{t.identity.seats}</span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar">
                    <div className="avatar-initial bg-label-primary rounded">
                      <i className="icon-base ti tabler-user-check icon-lg" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <h5 className="mb-0">{org.memberCount}</h5>
                    <span>{t.identity.members}</span>
                  </div>
                </div>
              </div>

              <h5 className="pb-4 border-bottom mb-4">{t.identity.detailsTitle}</h5>
              <div className="info-container">
                <ul className="list-unstyled mb-6">
                  <li className="mb-2">
                    <span className="h6 me-1">{t.identity.customerSince}</span>
                    <span>{fmtDate(org.createdAt)}</span>
                  </li>
                  <li className="mb-2">
                    <span className="h6 me-1">{t.identity.trialEnds}</span>
                    <span>{fmtDate(org.trialEndsAt)}</span>
                  </li>
                  <li className="mb-2">
                    <span className="h6 me-1">{t.identity.orgId}</span>
                    <code className="small">{org.id}</code>
                  </li>
                  {org.childCount > 0 && (
                    <li className="mb-2">
                      <span className="h6 me-1">{t.identity.agencyWorkspaces}</span>
                      <span>{org.childCount}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Plan kartı — user-view "Current Plan" kalıbı */}
          <div className="card mb-6">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <span className="badge bg-label-primary">
                  {org.entitlementState === 'trial' ? t.plan.trial : t.plan.standard}
                </span>
                <div className="d-flex justify-content-center">
                  <sup className="h6 pricing-currency mt-2 mb-0 me-1 text-primary fw-normal">$</sup>
                  <h1 className="mb-0 text-primary">1</h1>
                  <sub className="h6 pricing-duration mt-auto mb-1 text-body fw-normal">
                    {t.plan.perSeatYear}
                  </sub>
                </div>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="h6 mb-0">{t.plan.seats}</span>
                <span className="h6 mb-0">
                  {t.plan.seatsOf(org.activeSeats, org.entitledSeats)}
                </span>
              </div>
              <div className="progress mb-4" style={{ height: 8 }} aria-hidden="true">
                <div
                  className={`progress-bar${org.activeSeats > org.entitledSeats ? ' bg-danger' : ''}`}
                  style={{ width: `${seatPct}%` }}
                />
              </div>
              <EntitlementDialog
                orgId={org.id}
                current={{
                  entitledSeats: org.entitledSeats,
                  entitlementState: org.entitlementState,
                  trialEndsAt: org.trialEndsAt ? fmtDate(org.trialEndsAt) : '',
                }}
              />
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-header">
              <h5 className="card-title mb-0">{t.activation.title}</h5>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {stuckAt ? t.activation.stuckAt(stuckAt.label) : t.activation.fullyActivated}
              </p>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                {ACTIVATION.map((s) => (
                  <li key={s.label} className="d-flex align-items-center mb-3">
                    <i
                      className={`icon-base ti ${
                        s.done
                          ? 'tabler-circle-check-filled text-success'
                          : 'tabler-circle-dashed text-body-secondary'
                      } me-2`}
                      aria-hidden="true"
                    />
                    <span className={s.done ? '' : 'text-body-secondary'}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Sağ: tablolar (user-view içerik kolonu) ── */}
        <div className="col-xl-8 col-lg-7">
          <div className="card mb-6">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title mb-0">{t.members.title}</h5>
              <span className="badge bg-label-secondary rounded-pill">{org.members.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t.members.email}</th>
                    <th>{t.members.role}</th>
                    <th>{t.members.joined}</th>
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((m) => (
                    <tr key={m.email}>
                      <td>{m.email}</td>
                      <td>
                        <span className="badge bg-label-secondary">{m.role}</span>
                      </td>
                      <td className="text-body-secondary">{fmtDate(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="card-title mb-0">{t.senders.title}</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">{t.senders.readOnly}</p>
              </div>
              <span className="badge bg-label-secondary rounded-pill">{senders.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t.senders.name}</th>
                    <th>{t.senders.email}</th>
                    <th>{t.senders.status}</th>
                    <th>{t.senders.lastExport}</th>
                    <th>{t.senders.signatures}</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-body-secondary">
                        {t.senders.empty}
                      </td>
                    </tr>
                  )}
                  {senders.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-medium">{s.displayName}</td>
                      <td>{s.email}</td>
                      <td>
                        {s.deactivatedAt ? (
                          <span className="badge bg-label-secondary">inactive</span>
                        ) : s.publishedAt ? (
                          <span className="badge bg-label-success">live</span>
                        ) : (
                          <span className="badge bg-label-info">draft</span>
                        )}
                      </td>
                      <td className="text-body-secondary">{fmtDate(s.lastExportedAt)}</td>
                      <td>{s.signatureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="card-title mb-0">{t.signatures.title}</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">
                  {t.signatures.subtitle}
                </p>
              </div>
              <span className="badge bg-label-secondary rounded-pill">{signatures.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t.signatures.name}</th>
                    <th>{t.signatures.template}</th>
                    <th>{t.signatures.sender}</th>
                    <th>{t.signatures.updated}</th>
                    <th className="text-end">{t.signatures.preview}</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-body-secondary">
                        {t.signatures.empty}
                      </td>
                    </tr>
                  )}
                  {signatures.map((sig) => (
                    <tr key={sig.id}>
                      <td className="fw-medium">{sig.name}</td>
                      <td>
                        <code className="small">{sig.templateId ?? '—'}</code>
                      </td>
                      <td>{sig.senderName ?? '—'}</td>
                      <td className="text-body-secondary">{fmtDate(sig.updatedAt)}</td>
                      <td className="text-end">
                        <SignaturePreviewButton id={sig.id} name={sig.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="card-title mb-0">{t.invoices.title}</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">
                  {t.invoices.subtitle}
                </p>
              </div>
              <InvoiceCreateDialog
                orgId={org.id}
                suggestedSeats={org.activeSeats || 1}
                nextNumber={`MM-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`}
              />
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t.invoices.number}</th>
                    <th>{t.invoices.issued}</th>
                    <th>{t.invoices.due}</th>
                    <th>{t.invoices.amount}</th>
                    <th>{t.invoices.status}</th>
                    <th>{t.invoices.payment}</th>
                    <th className="text-end">{t.invoices.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-body-secondary">
                        {t.invoices.empty}
                      </td>
                    </tr>
                  )}
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="fw-medium">{inv.number}</td>
                      <td className="text-body-secondary">{fmtDate(inv.issuedAt)}</td>
                      <td className="text-body-secondary">{fmtDate(inv.dueAt)}</td>
                      <td>{fmtMoney(inv.amountCents, inv.currency)}</td>
                      <td>
                        <span
                          className={`badge ${INVOICE_BADGE[inv.status] ?? 'bg-label-secondary'}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="text-body-secondary small">
                        {inv.paidAt
                          ? `${fmtDate(inv.paidAt)} · ${inv.paymentMethod ?? ''}${
                              inv.paymentReference ? ` · ${inv.paymentReference}` : ''
                            }`
                          : '—'}
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

          <div className="card mb-6">
            <div className="card-header">
              <h5 className="card-title mb-0">{t.staffAccess.title}</h5>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {t.staffAccess.subtitle}
              </p>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t.staffAccess.whenUtc}</th>
                    <th>{t.staffAccess.staff}</th>
                    <th>{t.staffAccess.scope}</th>
                    <th>{t.staffAccess.target}</th>
                  </tr>
                </thead>
                <tbody>
                  {access.slice(0, 10).map((a) => (
                    <tr key={a.id}>
                      <td className="text-body-secondary">
                        {a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td>{a.staffEmail}</td>
                      <td>
                        <span className="badge bg-label-secondary">{a.scope}</span>
                      </td>
                      <td className="text-body-secondary small">{a.targetId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

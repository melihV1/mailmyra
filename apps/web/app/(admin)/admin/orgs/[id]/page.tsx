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
 */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin');
  const { id } = await params;

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
    { label: 'E-mail verified', done: org.activation.emailVerified },
    { label: 'Signature created', done: org.activation.signatureCreated },
    { label: 'Sender created', done: org.activation.senderCreated },
    { label: 'Sender published', done: org.activation.senderPublished },
    { label: 'First export', done: org.activation.exported },
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
                    <span>Seats</span>
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
                    <span>Members</span>
                  </div>
                </div>
              </div>

              <h5 className="pb-4 border-bottom mb-4">Details</h5>
              <div className="info-container">
                <ul className="list-unstyled mb-6">
                  <li className="mb-2">
                    <span className="h6 me-1">Customer since:</span>
                    <span>{fmtDate(org.createdAt)}</span>
                  </li>
                  <li className="mb-2">
                    <span className="h6 me-1">Trial ends:</span>
                    <span>{fmtDate(org.trialEndsAt)}</span>
                  </li>
                  <li className="mb-2">
                    <span className="h6 me-1">Org ID:</span>
                    <code className="small">{org.id}</code>
                  </li>
                  {org.childCount > 0 && (
                    <li className="mb-2">
                      <span className="h6 me-1">Agency workspaces:</span>
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
                  {org.entitlementState === 'trial' ? 'Trial' : 'Standard'}
                </span>
                <div className="d-flex justify-content-center">
                  <sup className="h6 pricing-currency mt-2 mb-0 me-1 text-primary fw-normal">$</sup>
                  <h1 className="mb-0 text-primary">1</h1>
                  <sub className="h6 pricing-duration mt-auto mb-1 text-body fw-normal">
                    /seat/yr
                  </sub>
                </div>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="h6 mb-0">Seats</span>
                <span className="h6 mb-0">
                  {org.activeSeats} of {org.entitledSeats}
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
              <h5 className="card-title mb-0">Activation</h5>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                {stuckAt ? `Stuck at: ${stuckAt.label}` : 'Fully activated'}
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
              <h5 className="card-title mb-0">Members</h5>
              <span className="badge bg-label-secondary rounded-pill">{org.members.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Role</th>
                    <th>Joined</th>
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
                <h5 className="card-title mb-0">Senders</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">Read only.</p>
              </div>
              <span className="badge bg-label-secondary rounded-pill">{senders.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Last export</th>
                    <th>Signatures</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-body-secondary">
                        No senders yet.
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
                <h5 className="card-title mb-0">Signatures</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">
                  Read only — previews open one at a time and are individually logged.
                </p>
              </div>
              <span className="badge bg-label-secondary rounded-pill">{signatures.length}</span>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Template</th>
                    <th>Sender</th>
                    <th>Updated</th>
                    <th className="text-end">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-body-secondary">
                        No signatures yet.
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
                <h5 className="card-title mb-0">Invoices</h5>
                <p className="card-subtitle text-body-secondary mt-1 mb-0">
                  Amount is authoritative — seats × unit is only the suggestion.
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
                    <th>Number</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-body-secondary">
                        No invoices yet.
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
              <h5 className="card-title mb-0">Staff access to this customer</h5>
              <p className="card-subtitle text-body-secondary mt-1 mb-0">
                Who looked at this customer&apos;s data, most recent first.
              </p>
            </div>
            <div className="table-responsive text-nowrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>When (UTC)</th>
                    <th>Staff</th>
                    <th>Scope</th>
                    <th>Target</th>
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

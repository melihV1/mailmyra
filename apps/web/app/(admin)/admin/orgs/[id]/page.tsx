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
import { EntitlementForm } from './EntitlementForm';
import { InvoiceCreateForm } from './InvoiceCreateForm';
import { InvoiceRowActions } from './InvoiceRowActions';
import { SignaturePreview } from './SignaturePreview';

export const metadata = { title: 'Customer — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/**
 * Müşteri 360 — personelin asıl çalışma sayfası. Bu sayfayı AÇMAK bile
 * `StaffAccess`e üç satır düşürür (org + senders + signatures): burada
 * müşteri çalışanlarının kişisel verisi var ve görüntülemek de bir eylemdir.
 * Günlük yazılamıyorsa repo fırlatır, sayfa açılmaz (kapalıya düşme).
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

  const ACTIVATION: Array<{ label: string; done: boolean }> = [
    { label: 'E-mail verified', done: org.activation.emailVerified },
    { label: 'Signature created', done: org.activation.signatureCreated },
    { label: 'Sender created', done: org.activation.senderCreated },
    { label: 'Sender published', done: org.activation.senderPublished },
    { label: 'First export', done: org.activation.exported },
  ];
  const stuckAt = ACTIVATION.find((s) => !s.done);

  return (
    <div className="mm-admin">
      {/* Bağlam başlığı — hangi müşterinin verisindeyim */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <h4 className="mb-0">{org.name}</h4>
        <span className={`badge ${STATE_BADGE[org.entitlementState] ?? 'bg-label-secondary'}`}>
          {org.entitlementState}
        </span>
        <span className="badge bg-label-secondary">
          {org.activeSeats}/{org.entitledSeats} seats
        </span>
        {org.trialEndsAt && (
          <span className="badge bg-label-info">trial ends {fmtDate(org.trialEndsAt)}</span>
        )}
        <span className="text-body-secondary small ms-auto">
          customer since {fmtDate(org.createdAt)} · id <code>{org.id}</code>
        </span>
      </div>

      <div className="row g-4">
        {/* Sol kolon: aktivasyon + hak ediş + üyeler */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header pb-2">
              <h6 className="mb-0">Activation</h6>
              <p className="text-body-secondary small mb-0">
                {stuckAt ? `Stuck at: ${stuckAt.label}` : 'Fully activated'}
              </p>
            </div>
            <ul className="list-group list-group-flush">
              {ACTIVATION.map((s) => (
                <li key={s.label} className="list-group-item d-flex align-items-center gap-2">
                  <i
                    className={`icon-base ti ${
                      s.done ? 'tabler-circle-check text-success' : 'tabler-circle-dashed text-body-secondary'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={s.done ? '' : 'text-body-secondary'}>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <EntitlementForm
            orgId={org.id}
            current={{
              entitledSeats: org.entitledSeats,
              entitlementState: org.entitlementState,
              trialEndsAt: org.trialEndsAt ? fmtDate(org.trialEndsAt) : '',
            }}
          />

          <div className="card mb-4">
            <div className="card-header pb-2">
              <h6 className="mb-0">Members</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm">
                <tbody>
                  {org.members.map((m) => (
                    <tr key={m.email}>
                      <td className="small">{m.email}</td>
                      <td>
                        <span className="badge bg-label-secondary">{m.role}</span>
                      </td>
                      <td className="small text-body-secondary">{fmtDate(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {org.children.length > 0 && (
            <div className="card mb-4">
              <div className="card-header pb-2">
                <h6 className="mb-0">Agency workspaces</h6>
                <p className="text-body-secondary small mb-0">
                  Invoices stay on this root; seats count across the tree.
                </p>
              </div>
              <ul className="list-group list-group-flush">
                {org.children.map((c) => (
                  <li key={c.id} className="list-group-item d-flex justify-content-between">
                    <span>{c.name}</span>
                    <span className="text-body-secondary small">{fmtDate(c.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sağ kolon: göndericiler + imzalar + faturalar + erişim */}
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header pb-2">
              <h6 className="mb-0">Senders — read only</h6>
            </div>
            <div className="table-responsive">
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
                      <td colSpan={5} className="text-body-secondary small">
                        No senders yet.
                      </td>
                    </tr>
                  )}
                  {senders.map((s) => (
                    <tr key={s.id}>
                      <td>{s.displayName}</td>
                      <td className="small">{s.email}</td>
                      <td>
                        {s.deactivatedAt ? (
                          <span className="badge bg-label-secondary">inactive</span>
                        ) : s.publishedAt ? (
                          <span className="badge bg-label-success">live</span>
                        ) : (
                          <span className="badge bg-label-info">draft</span>
                        )}
                      </td>
                      <td className="small">{fmtDate(s.lastExportedAt)}</td>
                      <td>{s.signatureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header pb-2">
              <h6 className="mb-0">Signatures — read only</h6>
              <p className="text-body-secondary small mb-0">
                Previews open one at a time and are individually logged.
              </p>
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Template</th>
                    <th>Sender</th>
                    <th>Updated</th>
                    <th aria-label="Preview" />
                  </tr>
                </thead>
                <tbody>
                  {signatures.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-body-secondary small">
                        No signatures yet.
                      </td>
                    </tr>
                  )}
                  {signatures.map((sig) => (
                    <SignaturePreview
                      key={sig.id}
                      id={sig.id}
                      name={sig.name}
                      templateId={sig.templateId}
                      senderName={sig.senderName}
                      updatedAt={fmtDate(sig.updatedAt)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header d-flex align-items-center pb-2">
              <div>
                <h6 className="mb-0">Invoices</h6>
                <p className="text-body-secondary small mb-0">
                  Amount is authoritative — seats × unit is only the suggestion.
                </p>
              </div>
            </div>
            <div className="card-body pt-0">
              <InvoiceCreateForm
                orgId={org.id}
                suggestedSeats={org.activeSeats || 1}
                nextNumber={`MM-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`}
              />
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-body-secondary small">
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="fw-medium">{inv.number}</td>
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
                        {inv.paidAt
                          ? `${fmtDate(inv.paidAt)} · ${inv.paymentMethod ?? ''}${
                              inv.paymentReference ? ` · ${inv.paymentReference}` : ''
                            }`
                          : '—'}
                      </td>
                      <td>
                        <InvoiceRowActions id={inv.id} status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header pb-2">
              <h6 className="mb-0">Staff access to this customer</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>What</th>
                  </tr>
                </thead>
                <tbody>
                  {access.slice(0, 10).map((a) => (
                    <tr key={a.id}>
                      <td className="small">{a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                      <td className="small">{a.staffEmail}</td>
                      <td className="small">
                        {a.scope}
                        {a.targetId ? ` · ${a.targetId}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

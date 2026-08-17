import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { getSenderAs, seatSummary } from '../../../../../lib/repo/senders';
import { SenderDetailActions } from './SenderDetailActions';

export const metadata = { title: 'Sender — Mailmyra' };

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-label-secondary' },
  active: { label: 'Live', cls: 'bg-label-success' },
  inactive: { label: 'Inactive', cls: 'bg-label-warning' },
};

/**
 * Gönderici detayı — temanın `app-user-view` düzeni (Hüseyin, 2026-08-15):
 * solda kimlik kartı + aksiyonlar (publish/deactivate/DELETE), sağda atanmış
 * imzalar tablosu. 200 koltuklu müşteride tek kişiye odaklanmanın yeri.
 */
export default async function SenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/senders');

  const { id } = await params;
  const [sender, seats] = await Promise.all([
    getSenderAs(session.user.id, id),
    seatSummary(session.user.id),
  ]);
  // Yabancı org ya da silinmiş kayıt — varlık sızdırmadan listeye dön.
  if (!sender) redirect('/app/senders');

  const badge = STATUS_BADGE[sender.status]!;

  return (
    <section>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/app/senders" className="btn btn-sm btn-icon btn-text-secondary rounded-pill">
          <i className="icon-base ti tabler-chevron-left icon-md" aria-hidden="true" />
        </Link>
        <h4 className="mb-0">Sender</h4>
      </div>

      <div className="row g-4">
        {/* ── Kimlik kartı (app-user-view sol sütunu) ── */}
        <div className="col-xl-4">
          <div className="card mb-4">
            <div className="card-body pt-5">
              <div className="d-flex flex-column align-items-center text-center mb-4">
                <div className="avatar avatar-xl mb-3">
                  <span className="avatar-initial rounded-circle bg-label-primary fs-3">
                    {sender.displayName.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <h5 className="mb-1">{sender.displayName}</h5>
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
              </div>

              <h6 className="text-uppercase small text-body-secondary">Details</h6>
              <hr className="mt-1 mb-3" />
              <ul className="list-unstyled d-grid gap-2 mb-0">
                <li>
                  <span className="fw-medium text-heading me-1">Email:</span>
                  <span className="text-body-secondary">{sender.email}</span>
                </li>
                <li>
                  <span className="fw-medium text-heading me-1">Job title:</span>
                  <span className="text-body-secondary">{sender.jobTitle ?? '—'}</span>
                </li>
                <li>
                  <span className="fw-medium text-heading me-1">Added:</span>
                  <span className="text-body-secondary">{longDate.format(sender.createdAt)}</span>
                </li>
                {sender.publishedAt && (
                  <li>
                    <span className="fw-medium text-heading me-1">First published:</span>
                    <span className="text-body-secondary">
                      {longDate.format(sender.publishedAt)}
                    </span>
                  </li>
                )}
                {/* GERÇEK export olayı yoksa satır hiç görünmez — "aktarıldı"
                    iddiası ancak kaydı varsa kurulur (dış denetim kuralı). */}
                <li>
                  <span className="fw-medium text-heading me-1">Last exported:</span>
                  <span className="text-body-secondary">
                    {sender.lastExportedAt ? longDate.format(sender.lastExportedAt) : 'Never'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-header pb-2">
              <h5 className="card-title mb-0">Actions</h5>
            </div>
            <div className="card-body">
              <SenderDetailActions
                id={sender.id}
                name={sender.displayName}
                email={sender.email}
                jobTitle={sender.jobTitle}
                status={sender.status}
                activeSeats={seats.active}
                entitledSeats={seats.entitled}
                assignedCount={sender.signatures.length}
              />
            </div>
          </div>
        </div>

        {/* ── Atanmış imzalar ── */}
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                Assigned signatures{' '}
                <span className="badge bg-label-primary ms-1">{sender.signatures.length}</span>
              </h5>
              <Link href="/app/signatures" className="fw-medium">
                Manage
              </Link>
            </div>
            {sender.signatures.length === 0 ? (
              <div className="card-body text-center py-5">
                <div className="avatar avatar-lg mx-auto mb-3">
                  <span className="avatar-initial rounded-circle bg-label-secondary">
                    <i className="icon-base ti tabler-signature icon-26px" aria-hidden="true" />
                  </span>
                </div>
                <p className="text-body-secondary mb-0">
                  No signature assigned yet — assign one from the Signatures screen so this
                  sender can go live with it.
                </p>
              </div>
            ) : (
              <div className="table-responsive text-nowrap">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Signature</th>
                      <th>Template</th>
                      <th>Updated</th>
                      <th style={{ width: '1%' }}></th>
                    </tr>
                  </thead>
                  <tbody className="table-border-bottom-0">
                    {sender.signatures.map((sig) => (
                      <tr key={sig.id}>
                        <td className="fw-medium text-heading">{sig.name}</td>
                        <td>
                          <span className="badge bg-label-info">{sig.templateId}</span>
                        </td>
                        <td>
                          <time dateTime={sig.updatedAt.toISOString()}>
                            {longDate.format(sig.updatedAt)}
                          </time>
                        </td>
                        <td>
                          <a href={`/builder?sig=${sig.id}`} className="btn btn-sm btn-label-primary">
                            <i className="icon-base ti tabler-edit me-1" aria-hidden="true" />
                            Edit
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

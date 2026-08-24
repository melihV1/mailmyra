import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listOwnSupportCases } from '../../../../lib/repo/support';
import { NewTicketForm } from './NewTicketForm';
import { CASE_STATUS_LOOKS, TICKET_CATEGORIES } from './support-labels';

export const metadata = { title: 'Support — Mailmyra' };

/**
 * Müşteri ticket v1 (spec 2026-08-24). Panel içi yazışma YOK — yanıt
 * e-postayla döner ve sayfa bunu açıkça söyler. Liste sunucu tarafında
 * repo'dan (GET ucu yok, senders emsali); başka org'un vakası sorguya
 * zaten giremez.
 */
export default async function SupportPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/support');

  const cases = await listOwnSupportCases(session.user.id);

  if (cases === null) {
    return (
      <section>
        <h4 className="mb-4">Support</h4>
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-secondary">
                <i className="icon-base ti tabler-headset icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>No workspace yet</h5>
            <p className="text-body-secondary mb-0">
              Join or create a workspace to open a support case.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const categoryLabel = (value: string) =>
    TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  return (
    <section>
      <h4 className="mb-1">Support</h4>
      <p className="text-body-secondary mb-4">
        Replies arrive by email — this page tracks case status.
      </p>

      <div className="row g-6">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Open a support case</h5>
            </div>
            <div className="card-body">
              <NewTicketForm />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Your cases</h5>
            </div>
            {cases.length ? (
              <div className="table-responsive text-nowrap">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Opened</th>
                    </tr>
                  </thead>
                  <tbody className="table-border-bottom-0">
                    {cases.map((row) => {
                      const status = CASE_STATUS_LOOKS[row.status];
                      return (
                        <tr key={row.id}>
                          <td><code>{row.reference}</code></td>
                          <td className="text-heading">{row.subject}</td>
                          <td>{categoryLabel(row.category)}</td>
                          <td>
                            <span className={`badge bg-label-${status.tone}`}>{status.label}</span>
                          </td>
                          <td>
                            {row.createdAt.toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body text-center py-5">
                <p className="text-body-secondary mb-0">No support cases yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

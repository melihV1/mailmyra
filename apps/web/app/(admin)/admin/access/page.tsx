import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listStaffAccess, NotStaffError } from '../../../../lib/repo/admin';

export const metadata = { title: 'Access log — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** KVKK sorusu: "bu müşteriye kim baktı". Cevabı yalnız burada. */
export default async function AccessLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/access');

  let rows;
  try {
    rows = await listStaffAccess(session.user.id);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  return (
    <div className="mm-admin">
      <h4 className="mb-1">Staff access log</h4>
      <p className="text-body-secondary mb-4">
        Every sensitive customer read, newest first. Rows outlive both the staff account and the
        customer — that permanence is the point.
      </p>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>Staff</th>
                <th>Customer</th>
                <th>Scope</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-body-secondary">
                    No sensitive reads recorded yet.
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="small">{a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td className="small">{a.staffEmail}</td>
                  <td>{a.orgName}</td>
                  <td>
                    <span className="badge bg-label-secondary">{a.scope}</span>
                  </td>
                  <td className="small text-body-secondary">{a.targetId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listAdminActions, NotStaffError } from '../../../../lib/repo/admin';

export const metadata = { title: 'Action log — Mailmyra staff' };
export const dynamic = 'force-dynamic';

/** İç defter: kim, neyi, neden değiştirdi — before/after ile. */
export default async function ActionLogPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin/actions');

  let rows;
  try {
    rows = await listAdminActions(session.user.id);
  } catch (err) {
    if (err instanceof NotStaffError) redirect('/app');
    throw err;
  }

  return (
    <div className="mm-admin">
      <h4 className="mb-1">Admin action log</h4>
      <p className="text-body-secondary mb-4">
        Immutable record of every staff write. The reason column is why the reason field is
        mandatory.
      </p>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>Staff</th>
                <th>Customer</th>
                <th>Action</th>
                <th>Change</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-body-secondary">
                    No staff writes yet.
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="small">{a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td className="small">{a.staffEmail}</td>
                  <td>{a.orgName}</td>
                  <td>
                    <span className="badge bg-label-secondary">{a.action}</span>
                  </td>
                  <td className="small">
                    <code className="d-block text-body-secondary">{JSON.stringify(a.before)}</code>
                    <code className="d-block">{JSON.stringify(a.after)}</code>
                  </td>
                  <td className="small">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

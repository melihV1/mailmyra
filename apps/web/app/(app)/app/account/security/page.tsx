import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { prisma } from '../../../../../lib/db';
import { AccountTabs } from '../AccountTabs';
import { SecurityForms } from '../SecurityForms';

export const metadata = { title: 'Security — Mailmyra' };

/** Security sekmesi: parola değiştirme + aktif oturumlar. */
export default async function SecurityPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/security');

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, ip: true, userAgent: true, lastSeenAt: true },
  });

  return (
    <section>
      <AccountTabs />

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-1">Change password</h5>
          <p className="card-subtitle mb-0">
            Changing it signs out every other session automatically.
          </p>
        </div>
        <div className="card-body">
          <SecurityForms otherSessionCount={sessions.length - 1} />
        </div>
      </div>

      <div className="card">
        <div className="card-header pb-2">
          <h5 className="card-title mb-0">Active sessions</h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IP</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.id === session.id ? (
                      <span className="fw-medium text-heading">
                        This device{' '}
                        <span className="badge bg-label-success ms-1">Current</span>
                      </span>
                    ) : (
                      (s.userAgent?.slice(0, 60) ?? 'Unknown device')
                    )}
                  </td>
                  <td>{s.ip ?? '—'}</td>
                  <td>
                    <time dateTime={s.lastSeenAt.toISOString()}>
                      {s.lastSeenAt.toLocaleString('en-GB')}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

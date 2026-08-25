import { redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { prisma } from '../../../../../lib/db';
import { account as accountDict } from '../../../../../lib/i18n/dict/account';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { AccountTabs } from '../AccountTabs';
import { SecurityForms } from '../SecurityForms';

export async function generateMetadata() {
  return { title: accountDict[await getLang()].pageTitles.security };
}

/** Security sekmesi: parola değiştirme + aktif oturumlar. */
export default async function SecurityPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account/security');
  const lang = await getLang();
  const t = accountDict[lang];

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
          <h5 className="card-title mb-1">{t.security.changePasswordTitle}</h5>
          <p className="card-subtitle mb-0">{t.security.changePasswordSubtitle}</p>
        </div>
        <div className="card-body">
          <SecurityForms otherSessionCount={sessions.length - 1} />
        </div>
      </div>

      <div className="card">
        <div className="card-header pb-2">
          <h5 className="card-title mb-0">{t.security.activeSessionsTitle}</h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t.security.table.colDevice}</th>
                <th>{t.security.table.colIp}</th>
                <th>{t.security.table.colLastSeen}</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.id === session.id ? (
                      <span className="fw-medium text-heading">
                        {t.security.thisDevice}{' '}
                        <span className="badge bg-label-success ms-1">{t.security.current}</span>
                      </span>
                    ) : (
                      (s.userAgent?.slice(0, 60) ?? t.security.unknownDevice)
                    )}
                  </td>
                  <td>{s.ip ?? '—'}</td>
                  <td>
                    <time dateTime={s.lastSeenAt.toISOString()}>
                      {s.lastSeenAt.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB')}
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

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { getWorkspace } from '../../../../lib/repo/members';
import { listNotifications } from '../../../../lib/repo/notifications';
import { primaryOrgId, roleFor, seatSummary } from '../../../../lib/repo/senders';
import { NOTIFICATION_LOOKS, timeAgo } from '../../notification-looks';
import { AvatarUpload } from './AvatarUpload';

export const metadata = { title: 'My Profile — Mailmyra' };

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Profil sayfası — temanın `pages-profile-user` uyarlaması (Hüseyin,
 * 2026-08-15): kapak şeridi + avatar (yükleme buradan) + kimlik rozetleri;
 * solda About kartı, sağda temanın TIMELINE elementiyle etkinlik akışı
 * (bildirim tablosundan — gerçek veri).
 */
export default async function ProfilePage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/profile');

  const orgId = await primaryOrgId(session.user.id);
  const [me, role, workspace, seats, activity] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { createdAt: true, avatarUrl: true },
    }),
    orgId ? roleFor(session.user.id, orgId) : null,
    getWorkspace(session.user.id),
    seatSummary(session.user.id),
    listNotifications(session.user.id),
  ]);

  const roleLabel = role ? role.slice(0, 1).toUpperCase() + role.slice(1) : 'Member';
  const initial = session.user.email.slice(0, 1).toUpperCase();

  const about = [
    { icon: 'tabler-mail', label: 'Email', value: session.user.email },
    { icon: 'tabler-crown', label: 'Role', value: roleLabel },
    { icon: 'tabler-building', label: 'Workspace', value: workspace?.name ?? '—' },
    { icon: 'tabler-users', label: 'Seats', value: `${seats.active} / ${seats.entitled} in use` },
    { icon: 'tabler-calendar', label: 'Member since', value: longDate.format(me.createdAt) },
  ];

  return (
    <section>
      {/* ── Kapak + kimlik (pages-profile-user başlığı) ── */}
      <div className="card mb-4 overflow-hidden">
        <div
          aria-hidden="true"
          style={{
            height: 120,
            background:
              'linear-gradient(135deg, var(--bs-primary) 0%, #7b9fd3 60%, #a9c1e8 100%)',
          }}
        />
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mt-n5">
            <div className="d-flex align-items-end flex-wrap gap-4">
              <AvatarUpload avatarUrl={me.avatarUrl} initial={initial} />
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-label-primary">{roleLabel}</span>
              {session.user.emailVerifiedAt ? (
                <span className="badge bg-label-success">Verified</span>
              ) : (
                <span className="badge bg-label-warning">Not verified</span>
              )}
              <Link href="/app/account" className="btn btn-sm btn-primary">
                <i className="icon-base ti tabler-settings me-1" aria-hidden="true" />
                Account settings
              </Link>
            </div>
          </div>
          <h4 className="mt-3 mb-0">{session.user.email}</h4>
          <small className="text-body-secondary">
            {roleLabel} at {workspace?.name ?? 'your workspace'} · joined{' '}
            {longDate.format(me.createdAt)}
          </small>
        </div>
      </div>

      <div className="row g-4">
        {/* ── About ── */}
        <div className="col-xl-4">
          <div className="card h-100">
            <div className="card-header pb-2">
              <h5 className="card-title mb-0">About</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0 d-grid gap-3">
                {about.map((row) => (
                  <li key={row.label} className="d-flex align-items-center">
                    <i
                      className={`icon-base ti ${row.icon} icon-md text-primary me-3 flex-shrink-0`}
                      aria-hidden="true"
                    />
                    <div className="overflow-hidden">
                      <small className="text-body-secondary d-block">{row.label}</small>
                      <span className="fw-medium text-heading text-truncate d-block">
                        {row.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Etkinlik zaman çizelgesi (tema timeline elementi) ── */}
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header pb-2">
              <h5 className="card-title mb-0">
                <i className="icon-base ti tabler-chart-bar me-2 text-primary" aria-hidden="true" />
                Activity timeline
              </h5>
            </div>
            <div className="card-body pt-3">
              {activity.length === 0 ? (
                <p className="text-body-secondary mb-0">
                  Nothing yet — publishes, invitations and seat warnings will show up here.
                </p>
              ) : (
                <ul className="timeline mb-0">
                  {activity.map((n, i) => {
                    const look = NOTIFICATION_LOOKS[n.type];
                    return (
                      <li
                        key={n.id}
                        className={`timeline-item timeline-item-transparent${
                          i === activity.length - 1 ? ' border-transparent' : ''
                        }`}
                      >
                        <span className={`timeline-point timeline-point-${look.tone}`} />
                        <div className="timeline-event">
                          <div className="timeline-header mb-1">
                            <h6 className="mb-0">{look.title}</h6>
                            <small className="text-body-secondary">{timeAgo(n.createdAt)}</small>
                          </div>
                          <p className="mb-0 text-body-secondary">{look.body(n.payload)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

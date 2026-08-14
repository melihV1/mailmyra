import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import { getBrand } from '../../../lib/repo/brand';
import { listNotifications } from '../../../lib/repo/notifications';
import { listSenders, primaryOrgId, seatSummary } from '../../../lib/repo/senders';
import { listSignatures } from '../../../lib/repo/signatures';
import { BarsChart } from '../charts/BarsChart';
import { DonutChart } from '../charts/DonutChart';
import { NOTIFICATION_LOOKS, timeAgo } from '../notification-looks';

export const metadata = { title: 'Dashboard — Mailmyra' };

/** Panel dilinde (EN) kısa tarih — sunucuda render, hydration derdi yok. */
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-label-secondary' },
  active: { label: 'Live', cls: 'bg-label-success' },
  inactive: { label: 'Inactive', cls: 'bg-label-warning' },
};

/** Marka belgesindeki alan anahtarları → ekranda okunur ad (8 alan, spec §3). */
const BRAND_FIELD_LABELS: Record<string, string> = {
  templateId: 'Template',
  brandColor: 'Brand color',
  textColor: 'Text color',
  mutedColor: 'Muted color',
  fontFamily: 'Font',
  logoUrl: 'Logo',
  cta: 'CTA button',
  disclaimer: 'Disclaimer',
};

/**
 * Panelin genel bakış ekranı — Vuexy dashboard dili (karar 2026-08-13/14):
 * stat kartları + Getting started (onboarding) + Quick actions (temanın
 * "Earning Reports" kutucuk dizisi, Hüseyin'in ekran görüntüsüyle istediği
 * bileşen: nav-tabs widget-nav-tabs) + son imzalar + Activity + Brand durumu.
 */
export default async function DashboardPage() {
  // Layout korumasına GÜVENME (senders/page.tsx'teki sebep — paralel render).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app');

  const [seats, senders, signatures, notifications, orgId] = await Promise.all([
    seatSummary(session.user.id),
    listSenders(session.user.id),
    listSignatures(session.user.id),
    listNotifications(session.user.id),
    primaryOrgId(session.user.id),
  ]);
  const brand = orgId ? await getBrand(orgId) : null;

  const pct = seats.entitled > 0 ? Math.min(100, (seats.active / seats.entitled) * 100) : 0;
  const full = seats.active >= seats.entitled;
  const warn = !full && pct >= 80;
  const drafts = senders.filter((s) => s.status === 'draft').length;

  const recentSignatures = [...signatures]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
  const recentSenders = senders.slice(0, 5);
  const recentActivity = notifications.slice(0, 5);

  // Getting started adımları — hepsi gerçek veriden, süs yok.
  const steps = [
    {
      label: 'Verify your email',
      note: 'Unlocks exporting',
      done: Boolean(session.user.emailVerifiedAt),
      href: '/app/account',
    },
    {
      label: 'Create a signature',
      note: 'Design in the builder',
      done: signatures.length > 0,
      href: '/builder',
      external: true,
    },
    {
      label: 'Add a sender',
      note: 'Drafts are free',
      done: senders.length > 0,
      href: '/app/senders',
    },
    {
      label: 'Assign a signature',
      note: 'Connect person and design',
      done: signatures.some((s) => s.senderId !== null),
      href: '/app/signatures',
    },
    {
      label: 'Publish a sender',
      note: 'Uses a seat, enables export',
      done: senders.some((s) => s.status !== 'draft'),
      href: '/app/senders',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const stepsPct = Math.round((doneCount / steps.length) * 100);

  // Quick actions — temanın Earning Reports kutucukları (widget-nav-tabs).
  // Her kutucuğun kendi tonu var (Hüseyin, 2026-08-14: "dashboard çok beyaz").
  const actions = [
    {
      label: 'Builder',
      icon: 'tabler-edit',
      href: '/builder',
      external: true,
      primary: true,
      tone: 'primary',
    },
    { label: 'Add sender', icon: 'tabler-user-plus', href: '/app/senders', tone: 'success' },
    { label: 'Import CSV', icon: 'tabler-upload', href: '/app/senders', tone: 'info' },
    { label: 'Brand', icon: 'tabler-palette', href: '/app/brand', tone: 'warning' },
    { label: 'Members', icon: 'tabler-user-cog', href: '/app/members', tone: 'danger' },
    { label: 'Export zip', icon: 'tabler-file-zip', href: '/app/senders', tone: 'secondary' },
  ];

  // Haftalık imza düzenleme aktivitesi — son 7 gün, updatedAt'ten (gerçek veri).
  const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const editsPerDay = days.map((day) => {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return signatures.filter((s) => s.updatedAt >= day && s.updatedAt < next).length;
  });
  const dayLabels = days.map((d) => dayFmt.format(d));

  const brandEntries = Object.entries(BRAND_FIELD_LABELS).map(([key, label]) => ({
    key,
    label,
    mode: (brand as Record<string, { mode?: string } | undefined> | null)?.[key]?.mode ?? null,
  }));
  const lockedCount = brandEntries.filter((e) => e.mode === 'locked').length;
  const defaultCount = brandEntries.filter((e) => e.mode === 'default').length;

  const stats = [
    {
      label: 'Live senders',
      value: seats.active,
      note: 'Using a seat right now',
      icon: 'tabler-send',
      tone: 'success',
    },
    {
      label: 'Draft senders',
      value: drafts,
      note: 'Free — no seat used',
      icon: 'tabler-users',
      tone: 'warning',
    },
    {
      label: 'Signatures',
      value: signatures.length,
      note: 'In this workspace',
      icon: 'tabler-signature',
      tone: 'info',
    },
  ] as const;

  return (
    <section>
      {/* ── Stat kartları ── */}
      <div className="row g-4 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="content-left">
                  <span className="text-heading">Seats used</span>
                  <div className="d-flex align-items-center my-1">
                    <h4 className="mb-0 me-2">
                      {seats.active}
                      <span className="text-body-secondary fs-5"> / {seats.entitled}</span>
                    </h4>
                  </div>
                </div>
                <div className="avatar">
                  <span className="avatar-initial rounded bg-label-primary">
                    <i className="icon-base ti tabler-users icon-26px" aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="progress" style={{ height: 6 }} aria-hidden="true">
                <div
                  className={`progress-bar${full ? ' bg-danger' : warn ? ' bg-warning' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <small
                className={full ? 'text-danger d-block mt-2' : 'text-body-secondary d-block mt-2'}
              >
                {full
                  ? 'All seats in use — deactivate a sender or contact us.'
                  : 'A seat is used only when a sender is live.'}
              </small>
            </div>
          </div>
        </div>

        {stats.map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="text-body-secondary">{s.note}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.tone}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Renk satırı: karşılama + koltuk halkası + haftalık aktivite ── */}
      <div className="row g-4 mb-4">
        <div className="col-xl-4 col-md-6">
          <div className="card h-100 bg-primary">
            <div className="card-body d-flex flex-column text-white">
              <h5 className="text-white mb-1">Welcome back 👋</h5>
              <p className="mb-4 opacity-75">
                {seats.active} live sender{seats.active === 1 ? '' : 's'} · {signatures.length}{' '}
                signature{signatures.length === 1 ? '' : 's'} in your workspace.
              </p>
              <div className="mt-auto">
                <a href="/builder" className="btn btn-sm btn-light">
                  <i className="icon-base ti tabler-edit me-1" aria-hidden="true" />
                  Open builder
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6">
          <div className="card h-100">
            <div className="card-header pb-0">
              <div className="card-title m-0">
                <h5 className="mb-1">Seats</h5>
                <p className="card-subtitle">Used vs. available</p>
              </div>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <DonutChart
                labels={['In use', 'Available']}
                series={[seats.active, Math.max(0, seats.entitled - seats.active)]}
                colors={['#2f66c8', '#c1d1ef']}
                centerLabel="Seats"
                height={210}
              />
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-12">
          <div className="card h-100">
            <div className="card-header pb-0">
              <div className="card-title m-0">
                <h5 className="mb-1">Weekly activity</h5>
                <p className="card-subtitle">Signature edits, last 7 days</p>
              </div>
            </div>
            <div className="card-body pt-2">
              <BarsChart
                categories={dayLabels}
                seriesName="Edits"
                data={editsPerDay}
                color="#7b9fd3"
                height={200}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Getting started + Quick actions ── */}
      <div className="row g-4 mb-4">
        <div className="col-xxl-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-start">
              <div className="card-title m-0">
                <h5 className="mb-1">Getting started</h5>
                <p className="card-subtitle">
                  {doneCount === steps.length
                    ? 'All set — your workspace is fully up and running.'
                    : `${doneCount} of ${steps.length} steps done`}
                </p>
              </div>
              <span className="badge bg-label-primary rounded-pill">{stepsPct}%</span>
            </div>
            <div className="card-body">
              <div className="progress mb-4" style={{ height: 8 }} aria-hidden="true">
                <div className="progress-bar" style={{ width: `${stepsPct}%` }} />
              </div>
              <ul className="list-unstyled mb-0 d-grid gap-3">
                {steps.map((step, i) => (
                  <li key={step.label} className="d-flex align-items-center">
                    <div className="avatar avatar-sm flex-shrink-0 me-3">
                      <span
                        className={`avatar-initial rounded-circle ${step.done ? 'bg-label-success' : 'bg-label-secondary'}`}
                      >
                        {step.done ? (
                          <i className="icon-base ti tabler-check icon-18px" aria-hidden="true" />
                        ) : (
                          i + 1
                        )}
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <span
                        className={`d-block fw-medium ${step.done ? 'text-body-secondary text-decoration-line-through' : 'text-heading'}`}
                      >
                        {step.label}
                      </span>
                      <small className="text-body-secondary">{step.note}</small>
                    </div>
                    {!step.done &&
                      (step.external ? (
                        <a href={step.href} className="btn btn-sm btn-label-primary flex-shrink-0">
                          Start
                        </a>
                      ) : (
                        <Link
                          href={step.href}
                          className="btn btn-sm btn-label-primary flex-shrink-0"
                        >
                          Start
                        </Link>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-header">
              <div className="card-title m-0">
                <h5 className="mb-1">Quick actions</h5>
                <p className="card-subtitle">Jump right in</p>
              </div>
            </div>
            <div className="card-body">
              {/* Temanın Earning Reports kutucuk dizisi (widget-nav-tabs) —
                  sekme değil kısayol: aynı görsel dil, hedefler gerçek sayfalar. */}
              <ul className="nav nav-tabs widget-nav-tabs pb-2 gap-4 mx-1 d-flex flex-wrap border-0">
                {actions.map((a) => (
                  <li key={a.label} className="nav-item">
                    {a.external ? (
                      <a
                        href={a.href}
                        className={`nav-link btn d-flex flex-column align-items-center justify-content-center${a.primary ? ' active' : ''}`}
                      >
                        <div className={`badge rounded p-2 bg-label-${a.tone}`}>
                          <i className={`icon-base ti ${a.icon} icon-md`} aria-hidden="true" />
                        </div>
                        <h6 className="tab-widget-title mb-0 mt-2">{a.label}</h6>
                      </a>
                    ) : (
                      <Link
                        href={a.href}
                        className="nav-link btn d-flex flex-column align-items-center justify-content-center"
                      >
                        <div className={`badge rounded p-2 bg-label-${a.tone}`}>
                          <i className={`icon-base ti ${a.icon} icon-md`} aria-hidden="true" />
                        </div>
                        <h6 className="tab-widget-title mb-0 mt-2">{a.label}</h6>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Son imzalar + göndericiler ── */}
      <div className="row g-4 mb-4">
        <div className="col-xxl-8">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Recent signatures</h5>
              <Link href="/app/signatures" className="fw-medium">
                View all
              </Link>
            </div>
            {recentSignatures.length === 0 ? (
              <div className="card-body text-center py-5">
                <p className="text-body-secondary mb-3">No signatures yet.</p>
                <a href="/builder" className="btn btn-primary">
                  <i className="icon-base ti tabler-edit me-1" aria-hidden="true" />
                  Open builder
                </a>
              </div>
            ) : (
              <div className="table-responsive text-nowrap">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Signature</th>
                      <th>Assigned to</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody className="table-border-bottom-0">
                    {recentSignatures.map((sig) => {
                      const badge = sig.senderStatus ? STATUS_BADGE[sig.senderStatus] : null;
                      return (
                        <tr key={sig.id}>
                          <td>
                            <span className="fw-medium text-heading">{sig.name}</span>
                          </td>
                          <td>
                            {sig.senderName ?? (
                              <span className="text-body-secondary">Not assigned</span>
                            )}
                          </td>
                          <td>
                            {badge ? (
                              <span className={`badge ${badge.cls}`}>{badge.label}</span>
                            ) : (
                              <span className="badge bg-label-secondary">Unassigned</span>
                            )}
                          </td>
                          <td>{shortDate.format(sig.updatedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Senders</h5>
              <Link href="/app/senders" className="fw-medium">
                View all
              </Link>
            </div>
            <div className="card-body">
              {recentSenders.length === 0 ? (
                <p className="text-body-secondary mb-0">No senders yet — drafts are free.</p>
              ) : (
                <ul className="list-unstyled mb-0 d-grid gap-3">
                  {recentSenders.map((s) => {
                    const badge = STATUS_BADGE[s.status]!;
                    return (
                      <li key={s.id} className="d-flex align-items-center">
                        <div className="avatar avatar-sm flex-shrink-0 me-3">
                          <span className="avatar-initial rounded-circle bg-label-primary">
                            {s.displayName.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <span className="d-block fw-medium text-heading text-truncate">
                            {s.displayName}
                          </span>
                          <small className="text-body-secondary text-truncate d-block">
                            {s.email}
                          </small>
                        </div>
                        <span className={`badge ${badge.cls} flex-shrink-0 ms-2`}>
                          {badge.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity + Brand durumu ── */}
      <div className="row g-4">
        <div className="col-xxl-8">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Activity</h5>
            </div>
            <div className="card-body">
              {recentActivity.length === 0 ? (
                <p className="text-body-secondary mb-0">
                  Nothing yet — publishes, invitations and seat warnings will show up here.
                </p>
              ) : (
                <ul className="list-unstyled mb-0 d-grid gap-3">
                  {recentActivity.map((n) => {
                    const look = NOTIFICATION_LOOKS[n.type];
                    return (
                      <li key={n.id} className="d-flex align-items-start">
                        <div className="avatar avatar-sm flex-shrink-0 me-3">
                          <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                            <i
                              className={`icon-base ti ${look.icon} icon-18px`}
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                        <div className="flex-grow-1">
                          <span className="d-block fw-medium text-heading">{look.title}</span>
                          <small className="text-body-secondary d-block">
                            {look.body(n.payload)}
                          </small>
                        </div>
                        <small className="text-body-secondary flex-shrink-0 ms-2">
                          {timeAgo(n.createdAt)}
                        </small>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Brand</h5>
              <Link href="/app/brand" className="fw-medium">
                Manage
              </Link>
            </div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <span className="badge bg-label-success">{lockedCount} locked</span>
                <span className="badge bg-label-info">{defaultCount} default</span>
                <span className="badge bg-label-secondary">
                  {brandEntries.length - lockedCount - defaultCount} not managed
                </span>
              </div>
              <ul className="list-unstyled mb-0 d-grid gap-2">
                {brandEntries.map((e) => (
                  <li key={e.key} className="d-flex align-items-center justify-content-between">
                    <span className="text-heading">{e.label}</span>
                    {e.mode === 'locked' ? (
                      <span className="badge bg-label-success">Locked</span>
                    ) : e.mode === 'default' ? (
                      <span className="badge bg-label-info">Default</span>
                    ) : (
                      <span className="badge bg-label-secondary">—</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

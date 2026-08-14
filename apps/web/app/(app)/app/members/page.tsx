import { redirect } from 'next/navigation';

import { can } from '@mailmyra/core';

import { currentSession } from '../../../../lib/auth/current';
import { getWorkspace, listInvitations, listMembers } from '../../../../lib/repo/members';
import { InviteForm } from './InviteForm';
import { InvitationActions, MemberActions } from './MemberActions';
import { WorkspaceCard } from './WorkspaceCard';

export const metadata = { title: 'Members — Mailmyra' };

/** Rol → renk/ikon dili (temanın access-roles kartları). */
const ROLE_LOOKS: Record<string, { tone: string; icon: string; note: string }> = {
  owner: { tone: 'primary', icon: 'tabler-crown', note: 'Billing, plan, everything' },
  admin: { tone: 'info', icon: 'tabler-user-cog', note: 'Members, senders, brand' },
  editor: { tone: 'success', icon: 'tabler-edit', note: 'Edit & export signatures' },
  viewer: { tone: 'secondary', icon: 'tabler-eye', note: 'View only' },
};

/** Rol matrisi içeriği — kod değil ürün gerçeği; tik/eksi temanın ikon dili. */
const MATRIX: Array<[string, boolean[]]> = [
  ['Billing, plan, delete org', [true, false, false, false]],
  ['Invite members, change roles', [true, true, false, false]],
  ['Add & publish senders', [true, true, false, false]],
  ['Brand settings', [true, true, false, false]],
  ['Edit & export signatures', [true, true, true, false]],
  ['View', [true, true, true, true]],
];

/**
 * Üyeler ekranı (panel-brief §2.8) — tema dili (2026-08-14 turu): rol özet
 * kartları + avatarlı üye tablosu + bekleyen davet tablosu + tik ikonlu rol
 * matrisi. Son owner korunur: arayüz düğmeyi pasifler, backend zaten reddeder.
 */
export default async function MembersPage() {
  // Layout korumasına güvenme — paralel render (bkz. diğer panel sayfaları).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/members');

  const [members, invitations, workspace] = await Promise.all([
    listMembers(session.user.id),
    listInvitations(session.user.id),
    getWorkspace(session.user.id),
  ]);
  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const myRole = members.find((m) => m.userId === session.user.id)?.role;
  const canManage = Boolean(myRole && can(myRole, 'member:manage'));

  return (
    <section>
      <h4 className="mb-4">Members</h4>

      {workspace && <WorkspaceCard name={workspace.name} canManage={canManage} />}

      {/* Rol özet kartları — temanın Roles & Permissions dili */}
      <div className="row g-4 mb-4">
        {Object.entries(ROLE_LOOKS).map(([role, look]) => {
          const count = members.filter((m) => m.role === role).length;
          return (
            <div key={role} className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <span className="text-heading text-capitalize">{role}</span>
                      <h4 className="mb-1">{count}</h4>
                      <small className="text-body-secondary">{look.note}</small>
                    </div>
                    <div className="avatar">
                      <span className={`avatar-initial rounded bg-label-${look.tone}`}>
                        <i className={`icon-base ti ${look.icon} icon-26px`} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-1">Invite a teammate</h5>
          <p className="card-subtitle mb-0">
            The link is good for 7 days. Owner role is never handed out by invitation.
          </p>
        </div>
        <div className="card-body">
          <InviteForm />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">
            All members <span className="badge bg-label-primary ms-1">{members.length}</span>
          </h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Member</th>
                <th>Joined</th>
                <th>Role &amp; actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {members.map((m) => {
                const look = ROLE_LOOKS[m.role] ?? ROLE_LOOKS.viewer!;
                return (
                  <tr key={m.userId}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-3">
                          <span className={`avatar-initial rounded-circle bg-label-${look.tone}`}>
                            {m.email.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="d-block fw-medium text-heading">
                            {m.email}
                            {m.userId === session.user.id && (
                              <span className="badge bg-label-primary ms-2">You</span>
                            )}
                          </span>
                          <small className="text-body-secondary text-capitalize">{m.role}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <time dateTime={m.joinedAt.toISOString()}>
                        {m.joinedAt.toLocaleDateString('en-GB')}
                      </time>
                    </td>
                    <td>
                      <MemberActions
                        targetUserId={m.userId}
                        role={m.role}
                        isSelf={m.userId === session.user.id}
                        lastOwner={m.role === 'owner' && ownerCount === 1}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">
              Pending invitations{' '}
              <span className="badge bg-label-warning ms-1">{invitations.length}</span>
            </h5>
          </div>
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  <th style={{ width: '1%' }}></th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td className="fw-medium text-heading">{i.email}</td>
                    <td>
                      <span className="badge bg-label-secondary text-capitalize">{i.role}</span>
                    </td>
                    <td>
                      <time dateTime={i.expiresAt.toISOString()}>
                        {i.expiresAt.toLocaleDateString('en-GB')}
                      </time>
                    </td>
                    <td>
                      <InvitationActions id={i.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">What each role can do</h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                {Object.keys(ROLE_LOOKS).map((role) => (
                  <th key={role} className="text-capitalize">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {MATRIX.map(([label, cells]) => (
                <tr key={label}>
                  <td className="text-heading">{label}</td>
                  {cells.map((allowed, i) => (
                    <td key={i}>
                      {allowed ? (
                        <i
                          className="icon-base ti tabler-check text-success"
                          aria-label="Allowed"
                        />
                      ) : (
                        <i
                          className="icon-base ti tabler-minus text-body-secondary opacity-50"
                          aria-label="Not allowed"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import { redirect } from 'next/navigation';

import { can } from '@mailmyra/core';

import { currentSession } from '../../../../lib/auth/current';
import { members as membersDict } from '../../../../lib/i18n/dict/members';
import { nav as navDict } from '../../../../lib/i18n/dict/nav';
import { getLang } from '../../../../lib/i18n/lang.server';
import { getWorkspace, listInvitations, listMembers } from '../../../../lib/repo/members';
import { InviteForm } from './InviteForm';
import { InvitationActions, MemberActions } from './MemberActions';
import { WorkspaceCard } from './WorkspaceCard';

export async function generateMetadata() {
  return { title: membersDict[await getLang()].pageTitle };
}

/** Rol → renk/ikon dili (temanın access-roles kartları). Not metni ve rol
 *  etiketinin KENDİSİ (Owner/Admin/...) dilden geliyor — bkz. bileşen gövdesi. */
const ROLE_LOOKS: Record<string, { tone: string; icon: string }> = {
  owner: { tone: 'primary', icon: 'tabler-crown' },
  admin: { tone: 'info', icon: 'tabler-user-cog' },
  editor: { tone: 'success', icon: 'tabler-edit' },
  viewer: { tone: 'secondary', icon: 'tabler-eye' },
};

/** Rol matrisi hücreleri — kod değil ürün gerçeği; satır ETİKETLERİ
 *  `t.matrixLabels`'tan aynı sırayla gelir (bkz. bileşen gövdesi). */
const MATRIX_CELLS: boolean[][] = [
  [true, false, false, false],
  [true, true, false, false],
  [true, true, false, false],
  [true, true, false, false],
  [true, true, true, false],
  [true, true, true, true],
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
  const lang = await getLang();
  const t = membersDict[lang];
  const nt = navDict[lang];

  const [members, invitations, workspace] = await Promise.all([
    listMembers(session.user.id),
    listInvitations(session.user.id),
    getWorkspace(session.user.id),
  ]);
  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const myRole = members.find((m) => m.userId === session.user.id)?.role;
  const canManage = Boolean(myRole && can(myRole, 'member:manage'));

  const matrix = t.matrixLabels.map((label, i) => [label, MATRIX_CELLS[i]!] as const);

  return (
    <section>
      <h4 className="mb-4">{t.heading}</h4>

      {workspace && <WorkspaceCard name={workspace.name} canManage={canManage} />}

      {/* Rol özet kartları — temanın Roles & Permissions dili */}
      <div className="row g-4 mb-4">
        {Object.entries(ROLE_LOOKS).map(([role, look]) => {
          const count = members.filter((m) => m.role === role).length;
          const roleKey = role as keyof typeof nt.roleLabels;
          const noteKey = role as keyof typeof t.roleNotes;
          return (
            <div key={role} className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <span className="text-heading">{nt.roleLabels[roleKey]}</span>
                      <h4 className="mb-1">{count}</h4>
                      <small className="text-body-secondary">{t.roleNotes[noteKey]}</small>
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
          <h5 className="card-title mb-1">{t.invite.title}</h5>
          <p className="card-subtitle mb-0">{t.invite.subtitle}</p>
        </div>
        <div className="card-body">
          <InviteForm />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">
            {t.allMembers} <span className="badge bg-label-primary ms-1">{members.length}</span>
          </h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>{t.table.colMember}</th>
                <th>{t.table.colJoined}</th>
                <th>{t.table.colRoleActions}</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {members.map((m) => {
                const look = ROLE_LOOKS[m.role] ?? ROLE_LOOKS.viewer!;
                const roleKey = m.role as keyof typeof nt.roleLabels;
                return (
                  <tr key={m.userId}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-3">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt="" className="rounded-circle" />
                          ) : (
                            <span
                              className={`avatar-initial rounded-circle bg-label-${look.tone}`}
                            >
                              {m.email.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="d-block fw-medium text-heading">
                            {m.email}
                            {m.userId === session.user.id && (
                              <span className="badge bg-label-primary ms-2">{t.table.you}</span>
                            )}
                          </span>
                          <small className="text-body-secondary">{nt.roleLabels[roleKey]}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <time dateTime={m.joinedAt.toISOString()}>
                        {m.joinedAt.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB')}
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
              {t.pendingInvitations}{' '}
              <span className="badge bg-label-warning ms-1">{invitations.length}</span>
            </h5>
          </div>
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.invitationsTable.colEmail}</th>
                  <th>{t.invitationsTable.colRole}</th>
                  <th>{t.invitationsTable.colExpires}</th>
                  <th style={{ width: '1%' }}></th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {invitations.map((i) => {
                  const roleKey = i.role as keyof typeof nt.roleLabels;
                  return (
                    <tr key={i.id}>
                      <td className="fw-medium text-heading">{i.email}</td>
                      <td>
                        <span className="badge bg-label-secondary">{nt.roleLabels[roleKey]}</span>
                      </td>
                      <td>
                        <time dateTime={i.expiresAt.toISOString()}>
                          {i.expiresAt.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB')}
                        </time>
                      </td>
                      <td>
                        <InvitationActions id={i.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">{t.matrixTitle}</h5>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                {Object.keys(ROLE_LOOKS).map((role) => {
                  const roleKey = role as keyof typeof nt.roleLabels;
                  return <th key={role}>{nt.roleLabels[roleKey]}</th>;
                })}
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {matrix.map(([label, cells]) => (
                <tr key={label}>
                  <td className="text-heading">{label}</td>
                  {cells.map((allowed, i) => (
                    <td key={i}>
                      {allowed ? (
                        <i
                          className="icon-base ti tabler-check text-success"
                          aria-label={t.allowedAria}
                        />
                      ) : (
                        <i
                          className="icon-base ti tabler-minus text-body-secondary opacity-50"
                          aria-label={t.notAllowedAria}
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

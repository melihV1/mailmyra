import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listInvitations, listMembers } from '../../../../lib/repo/members';
import { InviteForm } from './InviteForm';
import { InvitationActions, MemberActions } from './MemberActions';
import styles from './members.module.css';

export const metadata = { title: 'Members — Mailmyra' };

/**
 * Üyeler ekranı (panel-brief §2.8). Rol matrisi ekranda — rol seçimi burada
 * yapılıyor, tablo düğmenin ne verdiğini söylüyor. Son owner korunur:
 * arayüz düğmeyi pasifler, backend zaten reddeder.
 */
export default async function MembersPage() {
  // Layout korumasına güvenme — paralel render (bkz. diğer panel sayfaları).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/members');

  const [members, invitations] = await Promise.all([
    listMembers(session.user.id),
    listInvitations(session.user.id),
  ]);
  const ownerCount = members.filter((m) => m.role === 'owner').length;

  return (
    <section>
      <h1 className={styles.title}>Members</h1>

      <InviteForm />

      <ul className={styles.list}>
        {members.map((m) => (
          <li key={m.userId} className={styles.row}>
            <span className={styles.rowName}>
              {m.email}
              {m.userId === session.user.id && <span className={styles.you}> (you)</span>}
            </span>
            <MemberActions
              targetUserId={m.userId}
              role={m.role}
              isSelf={m.userId === session.user.id}
              lastOwner={m.role === 'owner' && ownerCount === 1}
            />
          </li>
        ))}
      </ul>

      {invitations.length > 0 && (
        <>
          <h2 className={styles.subtitle}>Pending invitations</h2>
          <ul className={styles.list}>
            {invitations.map((i) => (
              <li key={i.id} className={styles.row}>
                <span className={styles.rowName}>{i.email}</span>
                <span className={styles.rowMeta}>as {i.role}</span>
                <span className={styles.rowMeta}>
                  expires {i.expiresAt.toLocaleDateString('en-GB')}
                </span>
                <InvitationActions id={i.id} />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={styles.subtitle}>What each role can do</h2>
      <div className={styles.matrixWrap}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th></th>
              <th>owner</th>
              <th>admin</th>
              <th>editor</th>
              <th>viewer</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Billing, plan, delete org', ['✓', '', '', '']],
              ['Invite members, change roles', ['✓', '✓', '', '']],
              ['Add & publish senders', ['✓', '✓', '', '']],
              ['Brand settings', ['✓', '✓', '', '']],
              ['Edit & export signatures', ['✓', '✓', '✓', '']],
              ['View', ['✓', '✓', '✓', '✓']],
            ].map(([label, cells]) => (
              <tr key={label as string}>
                <td>{label}</td>
                {(cells as string[]).map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

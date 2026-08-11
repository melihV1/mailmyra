'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './members.module.css';

/**
 * Rol değiştirme + çıkarma. Son owner'da ikisi de pasif ve sebebi yazılı —
 * backend zaten reddediyor, arayüz sürprizi önlüyor.
 */
export function MemberActions({
  targetUserId,
  role,
  isSelf,
  lastOwner,
}: {
  targetUserId: string;
  role: string;
  isSelf: boolean;
  lastOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (body: { error?: string }) =>
    setError(
      body.error === 'last_owner'
        ? 'The last owner cannot be changed — promote someone else to owner first.'
        : body.error === 'forbidden'
          ? 'Only owners and admins can manage members.'
          : 'Something went wrong.',
    );

  const changeRole = async (next: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/members/${targetUserId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else fail((await res.json().catch(() => ({}))) as { error?: string });
  };

  const remove = async () => {
    const sure = window.confirm(
      isSelf
        ? 'Leave this workspace? You will lose access immediately.'
        : 'Remove this member? They lose access immediately; signatures and senders stay.',
    );
    if (!sure) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/members/${targetUserId}/remove`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      if (isSelf) window.location.assign('/login');
      else router.refresh();
    } else fail((await res.json().catch(() => ({}))) as { error?: string });
  };

  return (
    <span className={styles.actions}>
      <select
        className={styles.roleSelect}
        value={role}
        onChange={(e) => void changeRole(e.target.value)}
        disabled={busy || lastOwner}
        title={lastOwner ? 'The last owner cannot be demoted.' : undefined}
        aria-label="Change role"
      >
        <option value="owner">owner</option>
        <option value="admin">admin</option>
        <option value="editor">editor</option>
        <option value="viewer">viewer</option>
      </select>
      <button
        type="button"
        className={styles.danger}
        onClick={remove}
        disabled={busy || lastOwner}
        title={lastOwner ? 'The last owner cannot be removed.' : undefined}
      >
        {isSelf ? 'Leave' : 'Remove'}
      </button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function InvitationActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    setBusy(true);
    const res = await fetch(`/api/invitations/${id}/revoke`, { method: 'POST' });
    setBusy(false);
    if (res.ok) router.refresh();
  };

  return (
    <button type="button" className={styles.danger} onClick={revoke} disabled={busy}>
      Revoke
    </button>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';

import styles from '../auth.module.css';

export function AcceptInvite({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'fail' | 'member'>('idle');

  const accept = async () => {
    setState('busy');
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      window.location.assign('/app/signatures');
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setState(body.error === 'already_member' ? 'member' : 'fail');
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.wordmark}>Mailmyra</span>
        <h1 className={styles.title}>Workspace invitation</h1>

        {state === 'fail' ? (
          <p className={styles.error} role="alert">
            This invitation has expired or was revoked. Ask the person who invited you to send a
            new one.
          </p>
        ) : state === 'member' ? (
          <>
            <p className={styles.notice} role="status">
              You are already a member of this workspace.
            </p>
            <p className={styles.footer}>
              <Link href="/app/signatures">Go to the panel</Link>
            </p>
          </>
        ) : (
          <>
            <p className={styles.notice}>
              You have been invited to join a workspace. Accepting connects this account to it.
            </p>
            <button className={styles.submit} type="button" onClick={accept} disabled={state === 'busy'}>
              {state === 'busy' ? 'Joining…' : 'Accept invitation'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

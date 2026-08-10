'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import styles from './account.module.css';

export function AccountForms({ otherSessionCount }: { otherSessionCount: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMsg(null);

    const res = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.get('current'),
        newPassword: data.get('next'),
      }),
    });

    setBusy(false);
    if (res.ok) {
      form.reset();
      setMsg({ kind: 'ok', text: 'Password changed. Every other session was signed out.' });
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'wrong_password'
          ? 'Your current password is not right.'
          : 'New password needs at least 10 characters, and not a common one.',
    });
  };

  const signOutOthers = async () => {
    setBusy(true);
    const res = await fetch('/api/account/signout-others', { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      setMsg({ kind: 'ok', text: 'Other sessions signed out.' });
      router.refresh();
    }
  };

  return (
    <div className={styles.forms}>
      {msg && (
        <p className={msg.kind === 'ok' ? styles.notice : styles.error} role="status">
          {msg.text}
        </p>
      )}

      <h2 className={styles.subtitle}>Change password</h2>
      <form onSubmit={changePassword} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Current password</span>
          <input
            className={styles.input}
            type="password"
            name="current"
            autoComplete="current-password"
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>New password</span>
          <input
            className={styles.input}
            type="password"
            name="next"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button className={styles.submit} type="submit" disabled={busy}>
          Change password
        </button>
      </form>

      {otherSessionCount > 0 && (
        <button type="button" className={styles.secondary} onClick={signOutOthers} disabled={busy}>
          Sign out the {otherSessionCount} other session{otherSessionCount === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}

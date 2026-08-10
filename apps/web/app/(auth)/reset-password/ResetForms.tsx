'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import styles from '../auth.module.css';

function RequestForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('busy');
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email') }),
    });

    if (res.status === 429) {
      setState('idle');
      setError('Too many requests. Try again in a few minutes.');
      return;
    }
    // Hesap var mı yok mu — cevap ikisinde de bu (panel-brief §2.3).
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <>
        <p className={styles.notice} role="status">
          If that address is registered, a reset link is on its way. The link is good for one
          hour.
        </p>
        <p className={styles.footer}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input className={styles.input} type="email" name="email" autoComplete="email" required />
        </label>
        <button className={styles.submit} type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className={styles.footer}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}

function CompleteForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('again')) {
      setError('The two passwords do not match.');
      return;
    }

    setState('busy');
    setError(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: form.get('password') }),
    });

    if (res.ok) {
      setState('done');
      return;
    }

    setState('idle');
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'weak_password'
        ? 'Password needs at least 10 characters, and not a common one.'
        : 'This link has expired or was already used. Request a new one below.',
    );
  };

  if (state === 'done') {
    return (
      <>
        <p className={styles.notice} role="status">
          Password changed. Every other session has been signed out.
        </p>
        <p className={styles.footer}>
          <Link href="/login">Sign in with the new password</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
          {error.startsWith('This link') && (
            <>
              {' '}
              <Link href="/reset-password">Request a new link</Link>
            </>
          )}
        </p>
      )}
      <form onSubmit={submit}>
        <label className={styles.field}>
          <span className={styles.label}>New password</span>
          <input
            className={styles.input}
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <span className={styles.hint}>At least 10 characters.</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>New password, again</span>
          <input
            className={styles.input}
            type="password"
            name="again"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button className={styles.submit} type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </>
  );
}

export function ResetForms({ token }: { token: string | undefined }) {
  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <Link href="/" className={styles.wordmark}>
          Mailmyra
        </Link>
        <h1 className={styles.title}>{token ? 'Choose a new password' : 'Reset your password'}</h1>
        {token ? <CompleteForm token={token} /> : <RequestForm />}
      </div>
    </main>
  );
}

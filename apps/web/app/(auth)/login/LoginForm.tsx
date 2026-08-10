'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import styles from '../auth.module.css';

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });

    if (res.ok) {
      // Tam yükleme: panel layout'u çerezi ancak yeni istekte görür.
      window.location.assign(next);
      return;
    }

    setBusy(false);
    if (res.status === 429) {
      const body = (await res.json()) as { retryAfterSeconds?: number };
      const minutes = Math.max(1, Math.ceil((body.retryAfterSeconds ?? 900) / 60));
      setError(`Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    } else {
      // 401: yanlış şifre mi hesap yok mu — sunucu söylemiyor, biz de
      // söyleyemeyiz.
      setError('Email or password is incorrect.');
    }
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <Link href="/" className={styles.wordmark}>
          Mailmyra
        </Link>
        <h1 className={styles.title}>Sign in</h1>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form onSubmit={submit}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          <p className={styles.inlineLink}>
            <Link href="/reset-password">Forgot your password?</Link>
          </p>

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          No account yet? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}

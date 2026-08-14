'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

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
    <>
      <h4 className="mb-1">Welcome back 👋</h4>
      <p className="mb-6">Sign in to manage your signatures and senders.</p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mb-6">
        <div className="mb-6">
          <label className="form-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="form-control"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="mb-6">
          <div className="d-flex justify-content-between">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <Link href="/reset-password">
              <small>Forgot password?</small>
            </Link>
          </div>
          <input
            id="login-password"
            className="form-control"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="d-grid">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>

      <p className="text-center mb-0">
        <span>New on Mailmyra? </span>
        <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}

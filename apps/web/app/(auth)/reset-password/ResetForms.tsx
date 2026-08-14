'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

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
        <div className="alert alert-success" role="status">
          If that address is registered, a reset link is on its way. The link is good for one
          hour.
        </div>
        <p className="text-center mb-0">
          <Link href="/login" className="d-inline-flex align-items-center">
            <i className="icon-base ti tabler-chevron-left icon-sm me-1" aria-hidden="true" />
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="mb-6">
        <div className="mb-6">
          <label className="form-label" htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            className="form-control"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="d-grid">
          <button className="btn btn-primary" type="submit" disabled={state === 'busy'}>
            {state === 'busy' ? 'Sending…' : 'Send reset link'}
          </button>
        </div>
      </form>
      <p className="text-center mb-0">
        <Link href="/login" className="d-inline-flex align-items-center">
          <i className="icon-base ti tabler-chevron-left icon-sm me-1" aria-hidden="true" />
          Back to sign in
        </Link>
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
        <div className="alert alert-success" role="status">
          Password changed. Every other session has been signed out.
        </div>
        <p className="text-center mb-0">
          <Link href="/login">Sign in with the new password</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          {error.startsWith('This link') && (
            <>
              {' '}
              <Link href="/reset-password">Request a new link</Link>
            </>
          )}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="mb-6">
          <label className="form-label" htmlFor="reset-new">
            New password
          </label>
          <input
            id="reset-new"
            className="form-control"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <div className="form-text">At least 10 characters.</div>
        </div>
        <div className="mb-6">
          <label className="form-label" htmlFor="reset-again">
            New password, again
          </label>
          <input
            id="reset-again"
            className="form-control"
            type="password"
            name="again"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
        <div className="d-grid">
          <button className="btn btn-primary" type="submit" disabled={state === 'busy'}>
            {state === 'busy' ? 'Saving…' : 'Set new password'}
          </button>
        </div>
      </form>
    </>
  );
}

export function ResetForms({ token }: { token: string | undefined }) {
  return (
    <>
      <h4 className="mb-1">{token ? 'Choose a new password 🔒' : 'Forgot password? 🔒'}</h4>
      <p className="mb-6">
        {token
          ? 'Pick something long — length beats symbols.'
          : 'Enter your email and we will send you a link to reset it.'}
      </p>
      {token ? <CompleteForm token={token} /> : <RequestForm />}
    </>
  );
}

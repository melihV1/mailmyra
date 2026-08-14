'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/** Taslak ekler — koltuk yemez; sayaç yayına almada işler. */
export function AddSenderForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);

    const res = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: data.get('displayName'),
        email: data.get('email'),
        jobTitle: data.get('jobTitle'),
      }),
    });

    setBusy(false);
    if (res.ok) {
      form.reset();
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'email_taken'
        ? 'This address is already a sender in your workspace. If they were deactivated, publish them again instead.'
        : body.error === 'forbidden'
          ? 'Only owners and admins can add senders.'
          : 'Could not add — check the fields and try again.',
    );
  };

  return (
    <form onSubmit={submit} className="row g-3">
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="displayName"
          placeholder="Full name"
          aria-label="Full name"
          required
          maxLength={255}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="email"
          type="email"
          placeholder="email@company.com"
          aria-label="Email"
          required
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="jobTitle"
          placeholder="Job title (optional)"
          aria-label="Job title (optional)"
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add sender'}
        </button>
      </div>
      {error && (
        <div className="col-12">
          <span className="text-danger small" role="alert">
            {error}
          </span>
        </div>
      )}
    </form>
  );
}

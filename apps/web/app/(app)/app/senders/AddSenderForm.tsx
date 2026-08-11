'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import styles from './senders.module.css';

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
    <form onSubmit={submit} className={styles.addForm}>
      <input
        className={styles.input}
        name="displayName"
        placeholder="Full name"
        required
        maxLength={255}
      />
      <input
        className={styles.input}
        name="email"
        type="email"
        placeholder="email@company.com"
        required
      />
      <input className={styles.input} name="jobTitle" placeholder="Job title (optional)" />
      <button type="submit" className={styles.addButton} disabled={busy}>
        {busy ? 'Adding…' : 'Add sender'}
      </button>
      {error && (
        <span className={styles.actionError} role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

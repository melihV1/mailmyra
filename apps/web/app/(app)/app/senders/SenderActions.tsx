'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './senders.module.css';

/**
 * Yayına alma ONAY ister ve kaç koltuk gideceğini rakamla söyler
 * (panel-brief §2.6). Tavan doluysa düğme pasif ve sebep görünür —
 * gizlemek yerine açıklamak.
 */
export function SenderActions({
  id,
  name,
  status,
  activeSeats,
  entitledSeats,
}: {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'inactive';
  activeSeats: number;
  entitledSeats: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capFull = activeSeats >= entitledSeats;

  const call = async (path: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(path, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'seat_limit'
        ? `All ${entitledSeats} seats are in use. Deactivate a sender or contact us for more.`
        : body.error === 'not_entitled'
          ? 'Your workspace cannot publish right now — contact us.'
          : body.error === 'forbidden'
            ? 'Only owners and admins can manage senders.'
            : 'Something went wrong. Please try again.',
    );
  };

  const publish = () => {
    const after = activeSeats + 1;
    const sure = window.confirm(
      `Publish ${name}?\n\nThey become active, using ${after} of your ${entitledSeats} seat${entitledSeats === 1 ? '' : 's'}. Their signature can then be exported.`,
    );
    if (sure) void call(`/api/senders/${id}/publish`);
  };

  const deactivate = () => {
    const sure = window.confirm(
      `Deactivate ${name}?\n\nTheir seat is freed for someone else this period. Signatures already installed in mail clients keep working.`,
    );
    if (sure) void call(`/api/senders/${id}/deactivate`);
  };

  return (
    <span className={styles.actions}>
      {status !== 'active' ? (
        <button
          type="button"
          className={styles.action}
          onClick={publish}
          disabled={busy || capFull}
          title={capFull ? `All ${entitledSeats} seats are in use.` : undefined}
        >
          Publish
        </button>
      ) : (
        <button type="button" className={styles.action} onClick={deactivate} disabled={busy}>
          Deactivate
        </button>
      )}
      {error && (
        <span className={styles.actionError} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

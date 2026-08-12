'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import styles from './senders.module.css';

/**
 * Yayına alma ONAY ister ve kaç koltuk gideceğini rakamla söyler
 * (panel-brief §2.6). Tavan doluysa düğme pasif ve sebep görünür —
 * gizlemek yerine açıklamak.
 *
 * Onay eskiden native `window.confirm()` idi (odak/Escape yönetimi yok) —
 * Task 6: paylaşılan `ConfirmDialog` kabuğuna taşındı, metinler AYNEN.
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
  const [confirming, setConfirming] = useState<'publish' | 'deactivate' | null>(null);

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

  const closeConfirm = () => setConfirming(null);

  const confirmPublish = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/publish`);
  };

  const confirmDeactivate = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/deactivate`);
  };

  const afterPublish = activeSeats + 1;

  return (
    <>
      <span className={styles.actions}>
        {status !== 'active' ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => setConfirming('publish')}
            disabled={busy || capFull}
            title={capFull ? `All ${entitledSeats} seats are in use.` : undefined}
          >
            Publish
          </button>
        ) : (
          <button
            type="button"
            className={styles.action}
            onClick={() => setConfirming('deactivate')}
            disabled={busy}
          >
            Deactivate
          </button>
        )}
        {error && (
          <span className={styles.actionError} role="alert">
            {error}
          </span>
        )}
      </span>
      {/* Diyaloglar `<span>` dışında: sabit konumlu overlay `<div>`i bir
          inline eleman içine gömmek geçersiz HTML/hydration uyarısı doğurur. */}
      {confirming === 'publish' && (
        <ConfirmDialog
          title={`Publish ${name}?`}
          onCancel={closeConfirm}
          onConfirm={confirmPublish}
          confirmLabel="Publish"
        >
          <p>
            {`They become active, using ${afterPublish} of your ${entitledSeats} seat${entitledSeats === 1 ? '' : 's'}. Their signature can then be exported.`}
          </p>
        </ConfirmDialog>
      )}
      {confirming === 'deactivate' && (
        <ConfirmDialog
          title={`Deactivate ${name}?`}
          onCancel={closeConfirm}
          onConfirm={confirmDeactivate}
          confirmLabel="Deactivate"
        >
          <p>
            Their seat is freed for someone else this period. Signatures already installed in
            mail clients keep working.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

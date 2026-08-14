'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useToast } from '../../ToastProvider';

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
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'publish' | 'deactivate' | 'delete' | null>(null);

  const capFull = activeSeats >= entitledSeats;

  const call = async (path: string, doneMessage: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(path, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toast('success', doneMessage);
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
    void call(`/api/senders/${id}/publish`, `Published ${name} — a seat is now in use.`);
  };

  const confirmDeactivate = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/deactivate`, `Deactivated ${name} — the seat is free again.`);
  };

  const confirmDelete = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/delete`, `Deleted ${name}.`);
  };

  const afterPublish = activeSeats + 1;

  return (
    <>
      <span className="d-inline-flex align-items-center gap-2">
        {status !== 'active' ? (
          <span data-mm-tip={capFull ? `All ${entitledSeats} seats are in use.` : undefined}>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => setConfirming('publish')}
              disabled={busy || capFull}
            >
              <i className="icon-base ti tabler-send me-1" aria-hidden="true" />
              Publish
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-label-warning"
            onClick={() => setConfirming('deactivate')}
            disabled={busy}
          >
            <i className="icon-base ti tabler-player-pause me-1" aria-hidden="true" />
            Deactivate
          </button>
        )}
        <span
          data-mm-tip={
            status === 'active' ? 'Live senders hold a seat — deactivate first.' : undefined
          }
        >
          <button
            type="button"
            className="btn btn-sm btn-icon btn-label-danger"
            aria-label={'Delete ' + name}
            onClick={() => setConfirming('delete')}
            disabled={busy || status === 'active'}
          >
            <i className="icon-base ti tabler-trash" aria-hidden="true" />
          </button>
        </span>
        {error && (
          <span className="text-danger small text-wrap" role="alert">
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
      {confirming === 'delete' && (
        <ConfirmDialog
          title={`Delete ${name}?`}
          onCancel={closeConfirm}
          onConfirm={confirmDelete}
          confirmLabel="Delete"
          tone="danger"
        >
          <p className="mb-0">
            Their signatures are <strong>kept</strong> (just unassigned) and uploaded images
            stay on the CDN. The sender identity itself cannot be recovered.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

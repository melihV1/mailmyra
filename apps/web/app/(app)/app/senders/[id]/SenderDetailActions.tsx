'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import { useToast } from '../../../ToastProvider';

/**
 * Detay sayfası aksiyonları — listedeki SenderActions ile AYNI uçlar, geniş
 * düğme düzeni. Silme yalnız taslak/pasifte (canlı önce pasifleştirilir —
 * koltuk muhasebesi silmeyle pas geçilmez); başarıda listeye dönülür.
 */
export function SenderDetailActions({
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

  const call = async (path: string, doneMessage: string, redirect = false) => {
    setBusy(true);
    setError(null);
    const res = await fetch(path, { method: 'POST' });
    setBusy(false);
    setConfirming(null);
    if (res.ok) {
      toast('success', doneMessage);
      if (redirect) router.push('/app/senders');
      else router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'seat_limit'
        ? `All ${entitledSeats} seats are in use. Deactivate a sender or contact us for more.`
        : body.error === 'is_live'
          ? 'Live senders cannot be deleted — deactivate first.'
          : body.error === 'forbidden'
            ? 'Only owners and admins can manage senders.'
            : 'Something went wrong. Please try again.',
    );
  };

  return (
    <>
      <div className="d-grid gap-2">
        {status !== 'active' ? (
          <span data-mm-tip={capFull ? `All ${entitledSeats} seats are in use.` : undefined}>
            <button
              type="button"
              className="btn btn-success w-100"
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
            className="btn btn-label-warning"
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
            className="btn btn-label-danger w-100"
            onClick={() => setConfirming('delete')}
            disabled={busy || status === 'active'}
          >
            <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
            Delete sender
          </button>
        </span>

        {error && (
          <small className="text-danger" role="alert">
            {error}
          </small>
        )}
      </div>

      {confirming === 'publish' && (
        <ConfirmDialog
          title={`Publish ${name}?`}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() =>
            void call(`/api/senders/${id}/publish`, `Published ${name} — a seat is now in use.`)
          }
          confirmLabel="Publish"
          busy={busy}
        >
          <p>
            {`They become active, using ${activeSeats + 1} of your ${entitledSeats} seat${entitledSeats === 1 ? '' : 's'}. Their signature can then be exported.`}
          </p>
        </ConfirmDialog>
      )}
      {confirming === 'deactivate' && (
        <ConfirmDialog
          title={`Deactivate ${name}?`}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() =>
            void call(
              `/api/senders/${id}/deactivate`,
              `Deactivated ${name} — the seat is free again.`,
            )
          }
          confirmLabel="Deactivate"
          busy={busy}
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
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() =>
            void call(`/api/senders/${id}/delete`, `Deleted ${name}.`, true)
          }
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
        >
          <p className="mb-0">
            Their signatures are <strong>kept</strong> (just unassigned) and uploaded images stay
            on the CDN. The sender identity itself cannot be recovered.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

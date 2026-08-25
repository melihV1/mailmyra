'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { common } from '../../../../lib/i18n/dict/common';
import { senders as sendersDict } from '../../../../lib/i18n/dict/senders';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

import { EditSenderDialog } from './EditSenderDialog';

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
  email,
  jobTitle,
  status,
  activeSeats,
  entitledSeats,
}: {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  status: 'draft' | 'active' | 'inactive';
  activeSeats: number;
  entitledSeats: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = sendersDict[lang];
  const c = common[lang];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'publish' | 'deactivate' | 'delete' | null>(null);
  const [editing, setEditing] = useState(false);

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
        ? t.actions.errors.seat_limit(entitledSeats)
        : body.error === 'not_entitled'
          ? t.actions.errors.not_entitled
          : body.error === 'forbidden'
            ? t.actions.errors.forbidden
            : t.actions.errors.generic,
    );
  };

  const closeConfirm = () => setConfirming(null);

  const confirmPublish = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/publish`, t.actions.publishedToast(name));
  };

  const confirmDeactivate = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/deactivate`, t.actions.deactivatedToast(name));
  };

  const confirmDelete = () => {
    setConfirming(null);
    void call(`/api/senders/${id}/delete`, t.actions.deletedToast(name));
  };

  const afterPublish = activeSeats + 1;

  return (
    <>
      <span className="d-inline-flex align-items-center gap-2">
        {status !== 'active' ? (
          <span data-mm-tip={capFull ? t.actions.seatsFullTip(entitledSeats) : undefined}>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => setConfirming('publish')}
              disabled={busy || capFull}
            >
              <i className="icon-base ti tabler-send me-1" aria-hidden="true" />
              {t.actions.publish}
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
            {t.actions.deactivate}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-icon btn-label-primary"
          aria-label={t.actions.editAria(name)}
          onClick={() => setEditing(true)}
          disabled={busy}
        >
          <i className="icon-base ti tabler-edit" aria-hidden="true" />
        </button>
        <span
          data-mm-tip={status === 'active' ? t.actions.liveHoldsSeatTip : undefined}
        >
          <button
            type="button"
            className="btn btn-sm btn-icon btn-label-danger"
            aria-label={t.actions.deleteAria(name)}
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
      {editing && (
        <EditSenderDialog
          sender={{ id, displayName: name, email, jobTitle, status }}
          onClose={() => setEditing(false)}
        />
      )}
      {confirming === 'publish' && (
        <ConfirmDialog
          title={t.actions.publishConfirmTitle(name)}
          onCancel={closeConfirm}
          onConfirm={confirmPublish}
          confirmLabel={t.actions.publish}
        >
          <p>{t.actions.seatNote(afterPublish, entitledSeats)}</p>
        </ConfirmDialog>
      )}
      {confirming === 'deactivate' && (
        <ConfirmDialog
          title={t.actions.deactivateConfirmTitle(name)}
          onCancel={closeConfirm}
          onConfirm={confirmDeactivate}
          confirmLabel={t.actions.deactivate}
        >
          <p>{t.actions.deactivateBody}</p>
        </ConfirmDialog>
      )}
      {confirming === 'delete' && (
        <ConfirmDialog
          title={t.actions.deleteConfirmTitle(name)}
          onCancel={closeConfirm}
          onConfirm={confirmDelete}
          confirmLabel={c.delete}
          tone="danger"
        >
          <p className="mb-0">
            {t.actions.deleteBodyLead}
            <strong>{t.actions.deleteBodyKept}</strong>
            {t.actions.deleteBodyTrail}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

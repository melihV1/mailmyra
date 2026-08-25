'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import { common } from '../../../../../lib/i18n/dict/common';
import { senders as sendersDict } from '../../../../../lib/i18n/dict/senders';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { useToast } from '../../../ToastProvider';

import { EditSenderDialog } from '../EditSenderDialog';

/**
 * Detay sayfası aksiyonları — listedeki SenderActions ile AYNI uçlar, geniş
 * düğme düzeni. Silme yalnız taslak/pasifte (canlı önce pasifleştirilir —
 * koltuk muhasebesi silmeyle pas geçilmez); başarıda listeye dönülür.
 */
export function SenderDetailActions({
  id,
  name,
  email,
  jobTitle,
  status,
  activeSeats,
  entitledSeats,
  assignedCount,
}: {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  status: 'draft' | 'active' | 'inactive';
  activeSeats: number;
  entitledSeats: number;
  /** Atanmış imza sayısı — tekil export ancak canlı + imzalıyken mümkün. */
  assignedCount: number;
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
  const exportable = status === 'active' && assignedCount > 0;

  /* Tekil export — toplu zip ucunun tek göndericili hâli (Codex denetimi:
     "sender detayından export başlatılamıyor"). Kapı sırası ve dosya
     üretimi sunucuda aynı; burada yalnız indirme koreografisi var. */
  const downloadZip = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/senders/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderIds: [id] }),
      });
      if (!res.ok) {
        setError(t.detailActions.exportFailed);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailmyra-imzalar-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('success', t.detailActions.downloadedToast(name, assignedCount));
    } catch {
      setError(t.detailActions.exportFailed);
    } finally {
      setBusy(false);
    }
  };

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
        ? t.actions.errors.seat_limit(entitledSeats)
        : body.error === 'is_live'
          ? t.detailActions.errors.is_live
          : body.error === 'forbidden'
            ? t.actions.errors.forbidden
            : t.actions.errors.generic,
    );
  };

  return (
    <>
      <div className="d-grid gap-2">
        <button
          type="button"
          className="btn btn-label-primary"
          onClick={() => setEditing(true)}
          disabled={busy}
        >
          <i className="icon-base ti tabler-edit me-1" aria-hidden="true" />
          {t.detailActions.editDetails}
        </button>
        {status !== 'active' ? (
          <span data-mm-tip={capFull ? t.actions.seatsFullTip(entitledSeats) : undefined}>
            <button
              type="button"
              className="btn btn-success w-100"
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
            className="btn btn-label-warning"
            onClick={() => setConfirming('deactivate')}
            disabled={busy}
          >
            <i className="icon-base ti tabler-player-pause me-1" aria-hidden="true" />
            {t.actions.deactivate}
          </button>
        )}

        <span
          data-mm-tip={
            exportable
              ? undefined
              : status !== 'active'
                ? t.detailActions.onlyLiveExportableTip
                : t.detailActions.assignFirstTip
          }
        >
          <button
            type="button"
            className="btn btn-label-info w-100"
            onClick={() => void downloadZip()}
            disabled={busy || !exportable}
          >
            <i className="icon-base ti tabler-download me-1" aria-hidden="true" />
            {t.detailActions.downloadSignature}
          </button>
        </span>

        {/* Kurulum rehberi export'un DEVAMI: dosya indi, sırada istemciye
            kurmak var (dış denetim: rehber ilgili detaydan açılabilmeli). */}
        <Link href="/app/guides?client=outlook-classic" className="btn btn-label-secondary">
          <i className="icon-base ti tabler-book me-1" aria-hidden="true" />
          {t.detailActions.setupGuides}
        </Link>

        <span data-mm-tip={status === 'active' ? t.actions.liveHoldsSeatTip : undefined}>
          <button
            type="button"
            className="btn btn-label-danger w-100"
            onClick={() => setConfirming('delete')}
            disabled={busy || status === 'active'}
          >
            <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
            {t.detailActions.deleteSender}
          </button>
        </span>

        {error && (
          <small className="text-danger" role="alert">
            {error}
          </small>
        )}
      </div>

      {editing && (
        <EditSenderDialog
          sender={{ id, displayName: name, email, jobTitle, status }}
          onClose={() => setEditing(false)}
        />
      )}
      {confirming === 'publish' && (
        <ConfirmDialog
          title={t.actions.publishConfirmTitle(name)}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() =>
            void call(`/api/senders/${id}/publish`, t.actions.publishedToast(name))
          }
          confirmLabel={t.actions.publish}
          busy={busy}
        >
          <p>{t.actions.seatNote(activeSeats + 1, entitledSeats)}</p>
        </ConfirmDialog>
      )}
      {confirming === 'deactivate' && (
        <ConfirmDialog
          title={t.actions.deactivateConfirmTitle(name)}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() =>
            void call(`/api/senders/${id}/deactivate`, t.actions.deactivatedToast(name))
          }
          confirmLabel={t.actions.deactivate}
          busy={busy}
        >
          <p>{t.actions.deactivateBody}</p>
        </ConfirmDialog>
      )}
      {confirming === 'delete' && (
        <ConfirmDialog
          title={t.actions.deleteConfirmTitle(name)}
          onCancel={() => !busy && setConfirming(null)}
          onConfirm={() => void call(`/api/senders/${id}/delete`, t.actions.deletedToast(name), true)}
          confirmLabel={c.delete}
          tone="danger"
          busy={busy}
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

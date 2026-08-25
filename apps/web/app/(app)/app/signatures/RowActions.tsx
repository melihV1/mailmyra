'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useBsPresence } from '../../../../components/ui/useBsPresence';
import { common } from '../../../../lib/i18n/dict/common';
import { signatures as signaturesDict } from '../../../../lib/i18n/dict/signatures';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';
import { useDropdown } from '../../navbar/useDropdown';
import { PreviewDialog } from './PreviewDialog';

/**
 * Satır aksiyonları — temanın üç-nokta menüsü (2026-08-14 tema turu:
 * "temadaki elementleri kullan"). Silme onayı artık window.confirm değil,
 * ortak ConfirmDialog (tema modal'ı); CDN gerçeği metinde duruyor.
 */

/** Hızlı ad değiştirme — temanın modal-simple kalıbı, tek alanlı. */
function RenameDialog({
  id,
  currentName,
  onClose,
}: {
  id: string;
  currentName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = signaturesDict[lang];
  const c = common[lang];
  const [value, setValue] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { shown } = useBsPresence(!leaving);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);

  const requestClose = () => {
    if (busy || leaving) return;
    setLeaving(true);
    closeTimer.current = window.setTimeout(onClose, 300);
  };

  useEffect(() => {
    inputRef.current?.select();
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) {
      setError(t.renameDialog.emptyError);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/signatures/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      toast('success', t.renameDialog.renamedToast(name));
      router.refresh();
      requestClose();
      return;
    }
    setError(t.renameDialog.genericError);
  };

  return (
    <div
      className={`modal fade d-block${shown ? ' show' : ''}`}
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="modal-dialog modal-simple modal-dialog-centered" role="document">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.renameDialog.ariaLabel(currentName)}
          className="modal-content"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !busy) {
              e.stopPropagation();
              requestClose();
            }
          }}
        >
          <div className="modal-body">
            <button
              type="button"
              className="btn-close"
              aria-label={c.cancel}
              onClick={requestClose}
              disabled={busy}
            />
            <div className="text-center mb-6">
              <h4 className="mb-2">{t.renameDialog.title}</h4>
              <p>{t.renameDialog.note}</p>
            </div>
            <form className="row g-6" onSubmit={submit}>
              <div className="col-12">
                <label className="form-label" htmlFor="renameSignatureName">
                  {t.renameDialog.nameLabel}
                </label>
                <input
                  id="renameSignatureName"
                  ref={inputRef}
                  className="form-control"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              {error && (
                <div className="col-12">
                  <div className="alert alert-danger mb-0" role="alert">
                    {error}
                  </div>
                </div>
              )}
              <div className="col-12 text-center">
                <button type="submit" className="btn btn-primary me-3" disabled={busy}>
                  {busy && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {t.renameDialog.rename}
                </button>
                <button
                  type="button"
                  className="btn btn-label-secondary"
                  onClick={requestClose}
                  disabled={busy}
                >
                  {c.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
export function RowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = signaturesDict[lang];
  const c = common[lang];
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const duplicate = async () => {
    setOpen(false);
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}/duplicate`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toast('success', t.rowActions.duplicatedToast(name));
      router.refresh();
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}/delete`, { method: 'POST' });
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      toast('success', t.rowActions.deletedToast(name));
      router.refresh();
    }
  };

  return (
    <>
      <div className="dropdown" ref={ref}>
        <button
          type="button"
          className="btn btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
          aria-label={t.rowActions.actionsAria(name)}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          <i className="icon-base ti tabler-dots-vertical icon-md" aria-hidden="true" />
        </button>
        <ul
          className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}
          style={open ? { position: 'absolute', right: 0 } : undefined}
        >
          {/* Önizleme en üstte: menünün tek okuma-amaçlı öğesi, hiçbir şeyi
              değiştirmiyor — "önce bak, sonra karar ver" sırası. */}
          <li>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                setPreviewing(true);
              }}
            >
              <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
              {t.rowActions.preview}
            </button>
          </li>
          <li>
            <Link href={`/builder?sig=${id}`} className="dropdown-item">
              <i className="icon-base ti tabler-edit me-2" aria-hidden="true" />
              {t.rowActions.editInBuilder}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                setRenaming(true);
              }}
            >
              <i className="icon-base ti tabler-cursor-text me-2" aria-hidden="true" />
              {t.rowActions.rename}
            </button>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={() => void duplicate()}>
              <i className="icon-base ti tabler-copy me-2" aria-hidden="true" />
              {t.rowActions.duplicate}
            </button>
          </li>
          <li>
            {/* Kurulum rehberi imzanın yanında dursun — kopyaladıktan sonraki
                adım (dış denetim: rehber ilgili imzadan açılabilmeli). */}
            <Link href="/app/guides" className="dropdown-item">
              <i className="icon-base ti tabler-book me-2" aria-hidden="true" />
              {t.rowActions.howToInstall}
            </Link>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <i className="icon-base ti tabler-trash me-2" aria-hidden="true" />
              {c.delete}
            </button>
          </li>
        </ul>
      </div>

      {previewing && (
        <PreviewDialog id={id} name={name} onClose={() => setPreviewing(false)} />
      )}
      {renaming && (
        <RenameDialog id={id} currentName={name} onClose={() => setRenaming(false)} />
      )}
      {confirming && (
        <ConfirmDialog
          title={t.rowActions.deleteConfirmTitle(name)}
          onCancel={() => !busy && setConfirming(false)}
          onConfirm={remove}
          confirmLabel={c.delete}
          tone="danger"
          busy={busy}
        >
          {/* Onay metni CDN gerçeğini açıkça söylüyor (panel-brief §2.4): görsel
              URL'leri kalıcıdır, imzayı silmek sahadaki kopyaları kırmaz. */}
          <p className="mb-0">{t.rowActions.deleteConfirmBody}</p>
        </ConfirmDialog>
      )}
    </>
  );
}

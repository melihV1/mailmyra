'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useBsPresence } from '../../components/ui/useBsPresence';
import { common } from '../../lib/i18n/dict/common';
import { builder as builderDict } from '../../lib/i18n/dict/builder';
import { useLang } from '../../lib/i18n/LangProvider';

/**
 * "Save to my signatures" — anonim/kaydedilmemiş builder oturumunu hesaba
 * yazar (2026-08-17, Hüseyin isteği). Kayıtlı imzada bu diyalog HİÇ
 * açılmaz: orada zaten otomatik kayıt çalışıyor.
 *
 * Ad soruyoruz çünkü liste ekranında imzalar adla ayırt ediliyor ve
 * "Untitled signature" yığını panelin bilinen şikayetiydi.
 */
export function SaveDialog({
  data,
  onCancel,
  onSaved,
}: {
  /** Kaydedilecek imza — KAYITLI ham veri (marka bindirmesi çıkışta olur). */
  data: unknown;
  onCancel: () => void;
  /** Sunucu id döndürdü — çağıran URL'i ?sig= ile tazeler. */
  onSaved: (id: string, name: string) => void;
}) {
  const lang = useLang();
  const t = builderDict[lang];
  const c = common[lang];
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { shown } = useBsPresence(!leaving);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  const requestClose = () => {
    if (busy || leaving) return;
    setLeaving(true);
    timer.current = window.setTimeout(onCancel, 300);
  };

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), data }),
      });
      if (!res.ok) {
        setError(
          res.status === 401 ? t.saveDialog.sessionExpiredError : t.saveDialog.genericError,
        );
        return;
      }
      const body = (await res.json()) as { id?: string };
      if (!body.id) {
        setError(t.saveDialog.genericError);
        return;
      }
      onSaved(body.id, name.trim() || t.saveDialog.untitledName);
    } catch {
      setError(t.saveDialog.genericError);
    } finally {
      setBusy(false);
    }
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
          aria-label={t.saveDialog.ariaLabel}
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
              <h4 className="mb-2">{t.saveDialog.title}</h4>
              <p>{t.saveDialog.body}</p>
            </div>
            <form className="row g-6" onSubmit={submit}>
              <div className="col-12">
                <label className="form-label" htmlFor="saveSignatureName">
                  {t.saveDialog.nameLabel}
                </label>
                <input
                  id="saveSignatureName"
                  ref={inputRef}
                  className="form-control"
                  placeholder={t.saveDialog.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                />
                <div className="form-text">{t.saveDialog.nameHint}</div>
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
                  {c.save}
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

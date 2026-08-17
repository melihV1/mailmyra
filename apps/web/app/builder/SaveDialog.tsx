'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useBsPresence } from '../../components/ui/useBsPresence';

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
          res.status === 401
            ? 'Your session expired — sign in again to save.'
            : 'Could not save. Please try again.',
        );
        return;
      }
      const body = (await res.json()) as { id?: string };
      if (!body.id) {
        setError('Could not save. Please try again.');
        return;
      }
      onSaved(body.id, name.trim() || 'Untitled signature');
    } catch {
      setError('Could not save. Please try again.');
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
          aria-label="Save signature"
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
              aria-label="Cancel"
              onClick={requestClose}
              disabled={busy}
            />
            <div className="text-center mb-6">
              <h4 className="mb-2">Save to my signatures</h4>
              <p>Give it a name so you can find it in the panel later.</p>
            </div>
            <form className="row g-6" onSubmit={submit}>
              <div className="col-12">
                <label className="form-label" htmlFor="saveSignatureName">
                  Name
                </label>
                <input
                  id="saveSignatureName"
                  ref={inputRef}
                  className="form-control"
                  placeholder="Sales team signature"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                />
                <div className="form-text">Only your team sees this — it never appears in the signature.</div>
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
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-label-secondary"
                  onClick={requestClose}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

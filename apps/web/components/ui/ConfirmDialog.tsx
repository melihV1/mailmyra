'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Panelin tek onay diyaloğu — görünüm temanın Bootstrap modal'ı
 * (2026-08-14 tema turu), davranış eskisiyle AYNEN: odak açılışta panele
 * gelir, Tab içeride döner, Escape = Cancel, zeminde tıklama = Cancel.
 * Metinler çağıranın işi — bileşen kabuk. `tone="danger"` yıkıcı onaylarda
 * (silme) düğmeyi kırmızıya çevirir.
 */
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  tone = 'primary',
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: 'primary' | 'danger';
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    // Küçük odak tuzağı: içerideki odaklanabilirler arasında döngü.
    const nodes = panel.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="modal fade show d-block"
      // Bootstrap JS yok: perde ayrı eleman yerine zemin rengiyle (tema
      // backdrop tonu). Zemine mousedown = Cancel (eski davranış).
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="modal-content"
          ref={panel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label={cancelLabel}
              onClick={onCancel}
              disabled={busy}
            />
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            {onConfirm && (
              <button
                type="button"
                className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

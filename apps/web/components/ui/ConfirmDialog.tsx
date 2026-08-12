'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import styles from './ConfirmDialog.module.css';

/**
 * Panelin tek onay diyaloğu (backlog borcu: zip diyaloğunda odak/Escape
 * yoktu, publish window.confirm idi). Odak açılışta panele gelir, Tab
 * içeride döner, Escape = Cancel. Metinler çağıranın işi — bileşen kabuk.
 */
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
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
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={styles.panel}
        ref={panel}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          {onConfirm && (
            <button type="button" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

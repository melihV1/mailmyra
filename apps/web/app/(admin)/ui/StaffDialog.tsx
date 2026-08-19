'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useBsPresence } from '../../../components/ui/useBsPresence';

/**
 * Admin modallarının ortak kabuğu — markup RowActions'taki RenameDialog'dan
 * BİREBİR (tema `modal-simple`): aynı zemin rengi, aynı btn-close, aynı
 * ortalanmış başlık, aynı giriş-çıkış animasyonu (`useBsPresence`).
 * Tek yerde durur ki dört admin diyaloğu temadan ayrı ayrı sapamasın.
 */
export function StaffDialog({
  title,
  subtitle,
  labelledBy,
  busy,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  labelledBy: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
  /** İmza önizlemesi gibi geniş içerik için modal-lg. */
  wide?: boolean;
}) {
  const [leaving, setLeaving] = useState(false);
  const { shown } = useBsPresence(!leaving);
  const closeTimer = useRef<number | null>(null);

  const requestClose = () => {
    if (busy || leaving) return;
    setLeaving(true);
    closeTimer.current = window.setTimeout(onClose, 300);
  };

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <div
      className={`modal fade d-block${shown ? ' show' : ''}`}
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        className={`modal-dialog modal-simple modal-dialog-centered${wide ? ' modal-lg' : ''}`}
        role="document"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labelledBy}
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
              <h4 className="mb-2">{title}</h4>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Diyalogların paylaştığı kapatma sözleşmesi — StaffDialog'a iletilir. */
export function useDialogClose(onClose: () => void) {
  return onClose;
}

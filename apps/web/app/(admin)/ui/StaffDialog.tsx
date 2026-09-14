'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useBsPresence } from '../../../components/ui/useBsPresence';
import { useLang } from '../../../lib/i18n/LangProvider';
import { common } from '../../../lib/i18n/dict/common';

/**
 * Admin modallarının ortak kabuğu — markup RowActions'taki RenameDialog'dan
 * BİREBİR (tema `modal-simple`): aynı zemin rengi, aynı btn-close, aynı
 * ortalanmış başlık, aynı giriş-çıkış animasyonu (`useBsPresence`).
 * Tek yerde durur ki dört admin diyaloğu temadan ayrı ayrı sapamasın.
 *
 * GÖVDEYE PORTAL EDİLİR (2026-09-14). Modal `position: fixed` ama CSS'te
 * `transform`u olan bir ata, `fixed` çocukları için İÇEREN BLOK olur:
 * konum viewport'a değil o ataya göre hesaplanır. Adaylar ekranındaki
 * `.mm-lead-card` hem transform hem `overflow: hidden` taşıyor — canlıda
 * modal kartın içine sıkıştı, başlık dört satıra bölündü ve form alanları
 * hiç görünmedi. Bootstrap da modalları bu yüzden gövdeye taşır.
 *
 * Portal kökü RENDER SIRASINDA senkron okunur, `useEffect` ile DEĞİL:
 * efektle kurulsaydı ilk kare boş dönerdi, `useBsPresence`in
 * `useLayoutEffect`i o arada `shown`ı true yapardı ve modal DOM'a
 * doğrudan `show` sınıfıyla girip geçişi hiç oynatmazdı.
 * `createPortal` kendi konumunda hiçbir şey basmaz; bu yüzden sunucuda
 * `null` dönmek istemci çıktısıyla çelişmez (hidrasyon uyuşmazlığı yok).
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
  const lang = useLang();
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

  const portalRoot = typeof document === 'undefined' ? null : document.body;
  if (!portalRoot) return null;

  return createPortal(
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
              aria-label={common[lang].cancel}
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
    </div>,
    portalRoot,
  );
}

/** Diyalogların paylaştığı kapatma sözleşmesi — StaffDialog'a iletilir. */
export function useDialogClose(onClose: () => void) {
  return onClose;
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useBsPresence } from './useBsPresence';
import { common } from '../../lib/i18n/dict/common';
import { useLang } from '../../lib/i18n/LangProvider';

/**
 * Panelin tek onay diyaloğu — görünüm temanın Bootstrap modal'ı
 * (2026-08-14 tema turu), davranış eskisiyle AYNEN: odak açılışta panele
 * gelir, Tab içeride döner, Escape = Cancel, zeminde tıklama = Cancel.
 * Metinler çağıranın işi — bileşen kabuk. `tone="danger"` yıkıcı onaylarda
 * (silme) düğmeyi kırmızıya çevirir.
 *
 * `cancelLabel` varsayılanı dil-farkında (Dalga A fix-wave, B-Task 5 notu):
 * `confirmLabel`in aksine `cancelLabel`i hiç geçmeyen çağıranlar var
 * (SenderActions/SenderDetailActions/SenderTable/SignatureTable/RowActions
 * — hepsi "Cancel" varsayılanına güveniyordu). Sabit `'Cancel'` yerine
 * `common[lang].cancel` kullanılır; açıkça `cancelLabel` veren çağırıcılar
 * (Brand/Members/Account/Notifications) DEĞİŞMEZ — kendi verdikleri değer
 * önceliklidir, burada yalnız BOŞ bırakılırsa devreye girer.
 */
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel,
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
  const lang = useLang();
  const resolvedCancelLabel = cancelLabel ?? common[lang].cancel;
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  /* Çıkış animasyonu: iptal yolları önce `show`u düşürür (tema geçişi
     oynar), onCancel gerçek kaldırmayı 300ms sonra yapar. Onay yolu
     çağıranda biter (busy/hata akışları diyalog İÇİNDE yaşayabildiği için
     erken soldurAMAyız — DangerZone/Brand/zip emsalleri); onun yerine
     unmount anında aşağıdaki hayalet klon soluşu oynar. */
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const { shown } = useBsPresence(!leaving);
  const cancelTimer = useRef<number | null>(null);

  const requestClose = () => {
    if (busy || leaving) return;
    setLeaving(true);
    leavingRef.current = true;
    cancelTimer.current = window.setTimeout(onCancel, 300);
  };

  useEffect(() => {
    panel.current?.focus();
    /* StrictMode'un dev'deki çift mount'unda bir önceki cleanup'ın hayaleti
       boyanmadan silinsin — gerçek unmount'ta yeni mount olmaz, hayalet kalır. */
    document.querySelectorAll('[data-mm-modal-ghost]').forEach((g) => g.remove());
    const node = root.current;
    return () => {
      if (cancelTimer.current !== null) window.clearTimeout(cancelTimer.current);
      /* Parent'ın anlık unmount'u (onay başarısı dahil) tema geçişi olmadan
         kalmasın: inert bir klon bırak, `show`suz bırakınca solup gider. */
      if (leavingRef.current || !node) return;
      const ghost = node.cloneNode(true) as HTMLElement;
      ghost.setAttribute('data-mm-modal-ghost', '');
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      void ghost.offsetHeight; // reflow — sınıf değişimi geçiş saysın
      ghost.classList.remove('show');
      window.setTimeout(() => ghost.remove(), 350);
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation();
      requestClose();
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
      ref={root}
      className={`modal fade d-block${shown ? ' show' : ''}`}
      // Bootstrap JS yok: perde ayrı eleman yerine zemin rengiyle (tema
      // backdrop tonu). Zemine mousedown = Cancel (eski davranış).
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
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
              aria-label={resolvedCancelLabel}
              onClick={requestClose}
              disabled={busy}
            />
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={requestClose}
              disabled={busy}
            >
              {resolvedCancelLabel}
            </button>
            {onConfirm && (
              <button
                type="button"
                className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy && (
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

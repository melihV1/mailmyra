'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { wrapPreviewDoc } from '../../../../components/preview-doc';
import { useBsPresence } from '../../../../components/ui/useBsPresence';
import { common } from '../../../../lib/i18n/dict/common';
import { signatures as signaturesDict } from '../../../../lib/i18n/dict/signatures';
import { useLang } from '../../../../lib/i18n/LangProvider';

/**
 * "Bu imza gerçekte nasıl görünüyor?" — builder'a girmeden, temanın `modal-lg`
 * kalıbında. İçerik uydurulmaz: HTML sunucudan, export'un kullandığı zincirin
 * aynısından gelir (`GET /api/signatures/[id]/preview` → `renderSavedSignature`),
 * yani markanın çıkışta bindirilmiş hâli görünür.
 *
 * Hatalar toast DEĞİL, modalın içinde kalır (proje kuralı) — kullanıcı
 * bakarken kaybolan bir hata mesajı hiçbir işe yaramaz.
 */
export function PreviewDialog({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const lang = useLang();
  const t = signaturesDict[lang];
  const c = common[lang];
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { shown } = useBsPresence(!leaving);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const requestClose = () => {
    if (leaving) return;
    setLeaving(true);
    closeTimer.current = window.setTimeout(onClose, 300);
  };

  useEffect(() => {
    panel.current?.focus();
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/signatures/${id}/preview`);
        const body = (await res.json().catch(() => ({}))) as { html?: string; error?: string };
        if (!alive) return;
        if (res.ok && typeof body.html === 'string') {
          setHtml(body.html);
          return;
        }
        setError(
          body.error === 'render_failed'
            ? t.previewDialog.renderFailedError
            : t.previewDialog.genericError,
        );
      } catch {
        if (alive) setError(t.previewDialog.genericError);
      }
    })();
    return () => {
      alive = false;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, [id]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    // Panelin diğer modallarıyla aynı küçük odak tuzağı (ConfirmDialog emsali).
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
      className={`modal fade d-block${shown ? ' show' : ''}`}
      style={{ backgroundColor: 'rgba(46, 38, 61, 0.5)' }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.previewDialog.ariaLabel(name)}
          className="modal-content"
          ref={panel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="modal-header">
            <h5 className="modal-title text-truncate">{name}</h5>
            <button type="button" className="btn-close" aria-label={c.close} onClick={requestClose} />
          </div>
          <div className="modal-body">
            {error ? (
              <div className="alert alert-danger mb-0" role="alert">
                {error}
              </div>
            ) : html === null ? (
              <div className="text-center py-5">
                <span className="spinner-border text-primary" role="status" aria-hidden="true" />
                <p className="text-body-secondary mt-3 mb-0">{t.previewDialog.rendering}</p>
              </div>
            ) : (
              <>
                {/* allow-same-origin ŞART (2026-08-15, builder/Preview.tsx ile
                    aynı tuzak): sandbox="" iframe'i opak origin yapıyor ve
                    Chrome PNA opak→localhost görsel isteklerini kesiyor —
                    logo/ikonlar sessizce kırılıyordu. Script yine yasak
                    (allow-scripts YOK); CSS yalıtımı iframe'in doğası. */}
                <iframe
                  title={t.previewDialog.iframeTitle(name)}
                  sandbox="allow-same-origin"
                  srcDoc={wrapPreviewDoc(html, '#ffffff')}
                  style={{
                    width: '100%',
                    minHeight: 320,
                    border: '1px solid var(--bs-border-color)',
                    borderRadius: 'var(--bs-border-radius)',
                    background: '#fff',
                  }}
                />
                <p className="text-body-secondary small mb-0 mt-3">{t.previewDialog.brandNote}</p>
              </>
            )}
          </div>
          <div className="modal-footer">
            <Link href={`/builder?sig=${id}`} className="btn btn-primary">
              <i className="icon-base ti tabler-edit me-1" aria-hidden="true" />
              {t.previewDialog.editInBuilder}
            </Link>
            <button type="button" className="btn btn-outline-secondary" onClick={requestClose}>
              {c.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

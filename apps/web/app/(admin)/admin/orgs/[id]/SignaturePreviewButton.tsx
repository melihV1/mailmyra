'use client';

import { useState } from 'react';

import { StaffDialog } from '../../../ui/StaffDialog';

/**
 * Tıkla-aç imza önizlemesi — müşteri panelindeki PreviewDialog'un personel
 * karşılığı: modal + sandbox iframe. Otomatik render YOK; açmak bilinçli
 * eylem ve uç tekil loglar (`scope='signature'` + targetId).
 * sandbox İZİNSİZ: içerik salt HTML, panelin DOM'una/çerezine yol yok.
 */
export function SignaturePreviewButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (html) {
      setOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/signatures/${id}/preview`);
    setBusy(false);
    if (!res.ok) {
      setError('Preview failed.');
      return;
    }
    const body = (await res.json()) as { html: string };
    setHtml(body.html);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-icon btn-text-secondary rounded-pill"
        aria-label={`Preview ${name}`}
        disabled={busy}
        onClick={() => void load()}
      >
        <i className={`icon-base ti ${busy ? 'tabler-loader-2' : 'tabler-eye'} icon-md`} aria-hidden="true" />
      </button>
      {error && <span className="text-danger small ms-2">{error}</span>}

      {open && html && (
        <StaffDialog
          title={name}
          subtitle="Read-only staff preview — this view was logged."
          labelledBy={`Preview of ${name}`}
          busy={false}
          onClose={() => setOpen(false)}
          wide
        >
          <div className="border rounded bg-white p-2">
            <iframe
              title={`Preview of ${name}`}
              sandbox=""
              srcDoc={`<!doctype html><html><body style="margin:12px;background:#fff">${html}</body></html>`}
              style={{ width: '100%', minHeight: 320, border: 0 }}
            />
          </div>
        </StaffDialog>
      )}
    </>
  );
}

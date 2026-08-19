'use client';

import { useState } from 'react';

/**
 * Tıkla-aç imza önizlemesi. Otomatik render YOK: içerikte müşteri
 * çalışanının telefonu/adresi var, açmak bilinçli bir eylem ve tekil
 * loglanıyor (uç `scope='signature'` + targetId yazar).
 *
 * iframe sandbox İZİNSİZ (ne script ne same-origin): içerik salt HTML imza,
 * panelin çerezine/DOM'una uzanabilecek hiçbir yol bırakılmaz.
 */
export function SignaturePreview({
  id,
  name,
  templateId,
  senderName,
  updatedAt,
}: {
  id: string;
  name: string;
  templateId: string | null;
  senderName: string | null;
  updatedAt: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (html) {
      setOpen((v) => !v);
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
      <tr>
        <td>{name}</td>
        <td>
          <code className="small">{templateId ?? '—'}</code>
        </td>
        <td className="small">{senderName ?? '—'}</td>
        <td className="small">{updatedAt}</td>
        <td className="text-end">
          <button
            type="button"
            className="btn btn-label-primary btn-xs"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? '…' : open ? 'Hide' : 'Open preview'}
          </button>
        </td>
      </tr>
      {(open || error) && (
        <tr>
          <td colSpan={5}>
            {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}
            {open && html && (
              <div className="border rounded p-2 bg-white">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-label-danger">READ-ONLY STAFF PREVIEW</span>
                  <span className="text-muted small">this view was logged</span>
                </div>
                <iframe
                  title={`Preview of ${name}`}
                  sandbox=""
                  srcDoc={`<!doctype html><html><body style="margin:12px;background:#fff">${html}</body></html>`}
                  style={{ width: '100%', minHeight: 260, border: 0 }}
                />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

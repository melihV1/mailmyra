'use client';

import { useState } from 'react';

import { StaffDialog } from '../../../ui/StaffDialog';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { adminCustomers } from '../../../../../lib/i18n/dict/admin-customers';

/**
 * Tıkla-aç imza önizlemesi — müşteri panelindeki PreviewDialog'un personel
 * karşılığı: modal + sandbox iframe. Otomatik render YOK; açmak bilinçli
 * eylem ve uç tekil loglar (`scope='signature'` + targetId).
 * sandbox İZİNSİZ: içerik salt HTML, panelin DOM'una/çerezine yol yok.
 *
 * YALNIZ KROM çevrilir — `srcDoc` içine giren imza HTML'i müşteri
 * İÇERİĞİ, dokunulmaz (Task 5 brief).
 */
export function SignaturePreviewButton({ id, name }: { id: string; name: string }) {
  const lang = useLang();
  const t = adminCustomers[lang].signaturePreview;
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
      setError(t.loadFailed);
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
        aria-label={t.previewAria(name)}
        disabled={busy}
        onClick={() => void load()}
      >
        <i className={`icon-base ti ${busy ? 'tabler-loader-2' : 'tabler-eye'} icon-md`} aria-hidden="true" />
      </button>
      {error && <span className="text-danger small ms-2">{error}</span>}

      {open && html && (
        <StaffDialog
          title={name}
          subtitle={t.subtitle}
          labelledBy={t.labelledBy(name)}
          busy={false}
          onClose={() => setOpen(false)}
          wide
        >
          <div className="border rounded bg-white p-2">
            <iframe
              title={t.labelledBy(name)}
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

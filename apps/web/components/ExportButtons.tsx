'use client';

import { useRouter } from 'next/navigation';

import { wrapExportDoc } from '../lib/export-htm';
import { useLang } from '../lib/i18n/LangProvider';
import type { Mirror } from '../lib/i18n/types';

/**
 * Panel VE builder paylaşıyor — ikisinde de `LangProvider` var (Task 2).
 * `/dev/render` provider'sız kalır, `useLang()` sessizce 'en'e düşer
 * (LangProvider.tsx'teki tasarım) — dev harness'ın EN çıktısı bozulmaz.
 */
const en = {
  copySignature: 'Copy signature',
  downloadHtm: 'Download .htm',
  copiedAlert: 'Copied as formatted HTML.',
  copyFailedPrefix: 'Copy failed: ',
  verifyNote: 'Verify your email address to export — use the banner in your panel.',
} as const;

const tr: Mirror<typeof en> = {
  copySignature: 'İmzayı kopyala',
  downloadHtm: '.htm indir',
  copiedAlert: 'Biçimlendirilmiş HTML olarak kopyalandı.',
  copyFailedPrefix: 'Kopyalama başarısız: ',
  verifyNote: 'Dışa aktarmak için e-posta adresini doğrula — panelindeki şeride bak.',
};

const EXPORT_BUTTONS_TEXT = { en, tr } as const;

/**
 * `gated` üç durumlu: `false` serbest · `'login'` oturum yok, girişe gönder ·
 * `'verify'` oturum var ama e-posta doğrulanmadı — düğme görünür ama pasif,
 * altında sebep yazar (panel-brief §2.5: gizlemek yerine açıklamak).
 */
export function ExportButtons({
  html,
  filename,
  gated,
  disabled = false,
  disabledNote,
  chrome = 'plain',
}: {
  html: string;
  filename: string;
  gated: false | 'login' | 'verify';
  disabled?: boolean;
  disabledNote?: string;
  /** 'theme': Vuexy düğmeleri (builder). 'plain': /dev/render'ın çıplak
   *  hâli — o sayfaya tema CSS'i yüklenmiyor, sınıflar boşa düşerdi. */
  chrome?: 'plain' | 'theme';
}) {
  const router = useRouter();
  const lang = useLang();
  const t = EXPORT_BUTTONS_TEXT[lang];
  const blocked = disabled || gated === 'verify';
  const note = gated === 'verify' ? t.verifyNote : disabledNote;

  async function copyHtml() {
    if (gated === 'login') {
      router.push('/login?next=/builder');
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      alert(t.copiedAlert);
    } catch (e) {
      alert(`${t.copyFailedPrefix}${(e as Error).message}`);
    }
  }

  function downloadHtm() {
    if (gated === 'login') {
      router.push('/login?next=/builder');
      return;
    }
    const doc = wrapExportDoc(html);
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.htm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (chrome === 'theme') {
    return (
      <div className="d-grid gap-2">
        <button type="button" className="btn btn-primary" onClick={copyHtml} disabled={blocked}>
          <i className="icon-base ti tabler-copy me-2" aria-hidden="true" />
          {t.copySignature}
        </button>
        <button
          type="button"
          className="btn btn-label-primary"
          onClick={downloadHtm}
          disabled={blocked}
        >
          <i className="icon-base ti tabler-download me-2" aria-hidden="true" />
          {t.downloadHtm}
        </button>
        {blocked && note ? (
          <div className="alert alert-warning mb-0 py-2 small" role="note">
            {note}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={copyHtml} disabled={blocked}>
        {t.copySignature}
      </button>
      <button type="button" onClick={downloadHtm} disabled={blocked}>
        {t.downloadHtm}
      </button>
      {blocked && note ? (
        <span style={{ fontSize: 13, color: '#a05a2c' }}>{note}</span>
      ) : null}
    </div>
  );
}

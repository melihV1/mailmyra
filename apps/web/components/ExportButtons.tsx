'use client';

import { useRouter } from 'next/navigation';

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
}: {
  html: string;
  filename: string;
  gated: false | 'login' | 'verify';
  disabled?: boolean;
  disabledNote?: string;
}) {
  const router = useRouter();
  const blocked = disabled || gated === 'verify';
  const note =
    gated === 'verify'
      ? 'Verify your email address to export — use the banner in your panel.'
      : disabledNote;

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
      alert('Kopyalandı (text/html)');
    } catch (e) {
      alert(`Kopyalama başarısız: ${(e as Error).message}`);
    }
  }

  function downloadHtm() {
    if (gated === 'login') {
      router.push('/login?next=/builder');
      return;
    }
    const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
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

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={copyHtml} disabled={blocked}>
        HTML olarak kopyala
      </button>
      <button type="button" onClick={downloadHtm} disabled={blocked}>
        .htm indir
      </button>
      {blocked && note ? (
        <span style={{ fontSize: 13, color: '#a05a2c' }}>{note}</span>
      ) : null}
    </div>
  );
}

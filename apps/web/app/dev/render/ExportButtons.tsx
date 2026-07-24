'use client';

export function ExportButtons({
  html,
  filename,
}: {
  html: string;
  filename: string;
}) {
  async function copyHtml() {
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
    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button type="button" onClick={copyHtml}>
        HTML olarak kopyala
      </button>
      <button type="button" onClick={downloadHtm}>
        .htm indir
      </button>
    </div>
  );
}

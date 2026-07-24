import { fixtures, renderSignature } from '@mailmyra/renderer';
import { ExportButtons } from './ExportButtons';

function wrapDoc(fragment: string, bg: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;background:${bg};">${fragment}</body></html>`;
}

export default function DevRenderPage() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <h1>/dev/render — classic-horizontal</h1>
      <p style={{ color: '#666' }}>
        Her fixture açık ve koyu zeminde önizlenir. Kopyala / .htm indir ile 6
        istemcide test et.
      </p>
      {fixtures.map((fx) => {
        const html = renderSignature(fx.data, 'classic-horizontal');
        return (
          <section
            key={fx.id}
            style={{
              marginBottom: 40,
              borderBottom: '1px solid #eee',
              paddingBottom: 24,
            }}
          >
            <h2>{fx.title}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <iframe
                title={`${fx.id}-light`}
                srcDoc={wrapDoc(html, '#ffffff')}
                style={{ width: 620, height: 280, border: '1px solid #ddd' }}
              />
              <iframe
                title={`${fx.id}-dark`}
                srcDoc={wrapDoc(html, '#1a1a1a')}
                style={{ width: 620, height: 280, border: '1px solid #ddd' }}
              />
            </div>
            <ExportButtons html={html} filename={`classic-horizontal--${fx.id}`} />
          </section>
        );
      })}
    </main>
  );
}

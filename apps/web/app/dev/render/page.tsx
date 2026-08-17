import { notFound } from 'next/navigation';
import { fixtures, renderSignature, TEMPLATE_IDS } from '@mailmyra/renderer';
import { ExportButtons } from '../../../components/ExportButtons';
import { wrapPreviewDoc } from '../../../components/preview-doc';

export default function DevRenderPage() {
  // Bu geliştirici harness'ı üretimde asla servis edilmemeli — canlı
  // ortamda kazara erişilebilir kalırsa dahili test fixture'larını ve
  // ExportButtons davranışını sızdırır.
  if (process.env.NODE_ENV === 'production') notFound();

  // Dev'de yerel cdn-dev/icons kullanılır (spec §4). Prod'da sayfa zaten 404.
  const iconBaseUrl = process.env.CDN_PUBLIC_URL;

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <h1>/dev/render — {TEMPLATE_IDS.length} şablon × {fixtures.length} fixture</h1>
      <p style={{ color: '#666' }}>
        Her fixture açık ve koyu zeminde önizlenir. Kopyala / .htm indir ile 6
        istemcide test et. Şablon eklendiğinde bu sayfa kendiliğinden büyür —
        liste `TEMPLATE_IDS`ten gelir.
      </p>
      {/* Şablon dışta, fixture içte: 6-istemci turunda tek şablonun bütün
          fixture'ları bir arada görülsün. */}
      {TEMPLATE_IDS.flatMap((templateId) =>
      fixtures.map((fx) => {
        const html = renderSignature(
          fx.data,
          templateId,
          iconBaseUrl ? { iconBaseUrl } : undefined,
        );
        return (
          <section
            key={`${templateId}:${fx.id}`}
            style={{
              marginBottom: 40,
              borderBottom: '1px solid #eee',
              paddingBottom: 24,
            }}
          >
            <h2 style={{ marginBottom: 4 }}>{fx.title}</h2>
            <p style={{ margin: '0 0 12px', color: '#666', fontSize: 13 }}>
              <code>{templateId}</code>
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* allow-same-origin: opak origin + Chrome PNA localhost
                  görsellerini kesiyordu (builder Preview ile aynı karar). */}
              <iframe
                title={`${fx.id}-light`}
                sandbox="allow-same-origin"
                srcDoc={wrapPreviewDoc(html, '#ffffff')}
                style={{ width: 620, height: 560, border: '1px solid #ddd' }}
              />
              <iframe
                title={`${fx.id}-dark`}
                sandbox="allow-same-origin"
                srcDoc={wrapPreviewDoc(html, '#1a1a1a')}
                style={{ width: 620, height: 560, border: '1px solid #ddd' }}
              />
            </div>
            <ExportButtons
              html={html}
              filename={`${templateId}--${fx.id}`}
              gated={false}
            />
          </section>
        );
      }),
      )}
    </main>
  );
}

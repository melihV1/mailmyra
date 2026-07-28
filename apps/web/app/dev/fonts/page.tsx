import { notFound } from 'next/navigation';

// Karar B (step1-manifesto.md) — gövde fontu seçimi owner'a ait. Bu sayfa
// yalnız karşılaştırma için var, /dev/render ile aynı kural: üretimde asla
// servis edilmez.
export default function DevFontsPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        maxWidth: 1100,
        margin: '0 auto',
        color: '#1a1a1a',
      }}
    >
      <h1>/dev/fonts — General Sans vs Inter (gövde fontu adayı)</h1>
      <p style={{ color: '#666', maxWidth: 720 }}>
        Aynı Türkçe metin iki aday ailede, başlık ve gövde boyutunda. Karar B:
        <code> --font-body</code> şu an General Sans'a bağlı; owner burada zayıf bulursa
        Inter'e düşülür (bkz. <code>apps/web/app/tokens.css</code> yorumu ve
        <code> apps/web/app/fonts.css</code>). Her iki dosya da fontTools ile Türkçe glyph
        kapsamı (ı İ ş Ş ğ Ğ ç Ç ö Ö ü Ü) doğrulanmış — ikisi de eksiksiz kapsıyor, bu
        yüzden karşılaştırma yalnız görsel karakter/okunabilirlik hakkında.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: 32,
          marginTop: 32,
        }}
      >
        <FontSample label="General Sans (aday — şu an --font-body)" fontFamily="'General Sans', sans-serif" />
        <FontSample label="Inter (fallback aday)" fontFamily="'Inter', sans-serif" />
      </div>
    </main>
  );
}

function FontSample({ label, fontFamily }: { label: string; fontFamily: string }) {
  return (
    <section
      style={{
        border: '1px solid #ddd',
        borderRadius: 12,
        padding: 24,
        fontFamily,
      }}
    >
      <p
        style={{
          fontFamily: 'system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: 12,
          color: '#888',
          margin: '0 0 16px',
        }}
      >
        {label}
      </p>

      {/* Zor Türkçe karakterler — büyük, tek satırda, ilk bakışta göze
          çarpsın diye ayrı bir blok. */}
      <p style={{ fontSize: 40, fontWeight: 500, margin: '0 0 8px', letterSpacing: '0.02em' }}>
        ı İ ş Ş ğ Ğ ç Ç ö Ö ü Ü
      </p>

      {/* Noktasız ı / noktalı i karşılaştırması — yan yana, en sık
          karıştırılan çift. */}
      <p style={{ fontSize: 22, fontWeight: 400, margin: '0 0 24px', color: '#333' }}>
        ılık iklim &nbsp;·&nbsp; İstanbul ışık
      </p>

      {/* Başlık boyutu örneği (--step-h1 aralığı). */}
      <h2 style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.15, margin: '0 0 12px' }}>
        Bir imza tasarlayın, bütün ekip aynı markayla imza atsın.
      </h2>

      {/* Gövde boyutu, gerçekçi Türkçe paragraf — home.content.ts'teki
          subtitle metniyle aynı ton, uzunluk ve içerik yoğunluğu. */}
      <p style={{ fontSize: 16, lineHeight: 1.55, color: '#333', margin: 0 }}>
        Mailmyra e-posta imzasını merkezden tasarlar, koltuk sayısı kadar çalışana dağıtır.
        Ajans müşterileri için özel bir dağıtım ekranı yakında geliyor. Şimdilik Voldi
        Creative'in kendi ekibi, İstanbul ve Konya ofisleri arasında paylaştığı imzaları bu
        araçla oluşturuyor — özgün, öngörülebilir ve göz yormayan bir gövde metni bekliyoruz.
      </p>
    </section>
  );
}

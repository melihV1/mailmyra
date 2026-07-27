export const metadata = { title: 'Giriş — Mailmyra' };

export default function LoginPage() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 480,
        margin: '80px auto',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1>Giriş gerekli</h1>
      <p style={{ color: '#6d6e71', lineHeight: 1.6 }}>
        İmzanı dışa aktarmak (kopyalamak veya indirmek) için giriş yapman
        gerekiyor. Hesaplar çok yakında — şu an builder'ı ve canlı önizlemeyi
        serbestçe kullanabilirsin.
      </p>
      <p>
        <a href="/builder" style={{ color: 'var(--brand-primary)' }}>
          ← Builder'a dön
        </a>
      </p>
    </main>
  );
}

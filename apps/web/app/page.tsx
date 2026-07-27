import Link from 'next/link';
import { fixtures, renderSignature, BRAND } from '@mailmyra/renderer';
import type { SignatureData } from '@mailmyra/renderer';
import styles from './home.module.css';
import { TR } from './home.content';

export const metadata = { title: 'Mailmyra — Kurumsal e-posta imzası yönetimi' };

/**
 * Vitrindeki imza HTML'ini sunucuda üretir — renderer paketi framework'e
 * bağımsız olduğu için (CLAUDE.md §İki Kalıcı Mimari Kural) bu, builder'daki
 * canlı önizlemeyle AYNI motoru kullanır.
 *
 * `noLogo` fixture'ı bilerek seçildi: görsel yüklemesi olmadan (avatar/logo
 * yok) gerçek alan zenginliğini (ünvan, şirket, sosyal, CTA, yasal metin)
 * gösterir — üçüncü parti görsel barındırma sorusunu tamamen ortadan kaldırır
 * (CLAUDE.md §Görseller cdn.mailmyra.com üzerinden gider).
 *
 * Renk: fixture'ın varsayılanı hâlâ BRAND.primary (#7b9fd3) — brand.ts'in
 * kendi notuna göre bu, YALNIZ koyu zeminli site arayüzü vurgusu için
 * güvenlidir, beyaz zeminde metin/link olarak kontrastı 2.71 (AA'yı geçmez).
 * Vitrin BEYAZ bir kartta gösteriliyor, bu yüzden burada BRAND.strong
 * (5.45 kontrast) ile geçersiz kılınıyor — kilitli karar, tartışmaya kapalı.
 */
function demoSignatureHtml(): string {
  const fixture = fixtures.find((f) => f.id === 'noLogo');
  if (!fixture) {
    throw new Error('renderer fixtures: "noLogo" fixture bulunamadı');
  }
  const data: SignatureData = {
    ...fixture.data,
    visuals: {
      ...fixture.data.visuals,
      brandColor: BRAND.strong,
      iconColor: BRAND.strong,
    },
  };
  return renderSignature(data, data.layout.templateId);
}

export default function HomePage() {
  const signatureHtml = demoSignatureHtml();

  return (
    <main className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.brandKicker}>{TR.brandKicker}</span>
          <p className={styles.eyebrow}>{TR.eyebrow}</p>
          <h1 className={styles.title}>{TR.title}</h1>
          <p className={styles.subtitle}>{TR.subtitle}</p>
          <div className={styles.actions}>
            <Link href="/builder" className={styles.ctaPrimary}>
              {TR.ctaPrimary}
            </Link>
            <a href="#ornek-imza" className={styles.ctaSecondary}>
              {TR.ctaSecondary}
            </a>
          </div>
        </div>

        <div className={styles.demo} id="ornek-imza">
          <p className={styles.demoEyebrow}>{TR.demoEyebrow}</p>
          <div
            className={styles.demoCard}
            // Renderer'ın kendi çıktısı: table-based, tüm stiller inline
            // (CLAUDE.md §E-posta HTML Kısıtları). Kullanıcı girdisi değil —
            // sabit fixture verisi, sunucuda üretiliyor.
            dangerouslySetInnerHTML={{ __html: signatureHtml }}
          />
          <p className={styles.demoCaption}>{TR.demoCaption}</p>
        </div>
      </div>
    </main>
  );
}

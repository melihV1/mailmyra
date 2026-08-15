import type { ReactNode } from 'react';
import styles from './legal.module.css';

/**
 * `/terms`, `/privacy`, `/kvkk` ortak kabuğu — düz tipografik sunucu
 * bileşeni (Task 7 brief §3: "başlık + tarihli sürüm satırı + bölümler").
 * Metnin dili sayfaya göre değişir (EN/TR), kabuk kendisi dil-bağımsız.
 */
export function LegalDoc({
  eyebrow,
  title,
  versionLine,
  draftNotice,
  lang,
  children,
}: {
  eyebrow: string;
  title: string;
  versionLine: string;
  draftNotice: ReactNode;
  /** Sayfanın dili kökten (en) sapıyorsa — /kvkk "tr" geçer. */
  lang?: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page} lang={lang}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.version}>{versionLine}</p>
        <div className={styles.draftBox} role="note">
          {draftNotice}
        </div>
        {children}
      </div>
    </main>
  );
}

/** Tek bölüm — başlık + serbest içerik. Üç sayfa da bunu tekrar kullanır. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export { styles as legalStyles };

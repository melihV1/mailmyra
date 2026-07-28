import Link from 'next/link';
import { m } from 'framer-motion';
import type { MegaMenuFeatured, MegaMenuSection } from './menu-data';
import styles from './MegaMenuPanel.module.css';

interface MegaMenuPanelProps {
  id: string;
  labelledBy: string;
  sections: MegaMenuSection[];
  featured: MegaMenuFeatured;
}

/**
 * Genel panel: sol link sütunları + sağ featured kart (step1-manifesto.md
 * §1). `<nav>` + odaklanabilir `<a>` listesi — `role="menu"` DEĞİL (§4
 * erişilebilirlik sözleşmesi: menü rolü ok-tuşu navigasyonu bekler, biz
 * doğal Tab sırasını kullanıyoruz).
 *
 * Yalnız `open` iken mount edilir (bkz. Header.tsx `AnimatePresence`) —
 * kapalıyken DOM'da hiç yok, bu yüzden linkleri Tab sırasına asla girmez.
 * `MotionConfig reducedMotion="user"` (MotionProvider) reduced-motion'da
 * bu geçişi otomatik anlık hale getirir; görsel sonuç (panel açık) aynı.
 */
export function MegaMenuPanel({ id, labelledBy, sections, featured }: MegaMenuPanelProps) {
  return (
    <m.nav
      id={id}
      aria-labelledby={labelledBy}
      className={styles.panel}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.sections}>
        {sections.map((section) => (
          <div key={section.heading}>
            <p className={styles.heading}>{section.heading}</p>
            <ul className={styles.linkList}>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.link}>
                    <span className={styles.linkTitle}>{link.label}</span>
                    <span className={styles.linkDescription}>{link.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.featured}>
        <p className={styles.featuredTitle}>{featured.title}</p>
        <p className={styles.featuredDescription}>{featured.description}</p>
        <Link href={featured.href} className={styles.featuredCta}>
          {featured.ctaLabel} →
        </Link>
      </div>
    </m.nav>
  );
}

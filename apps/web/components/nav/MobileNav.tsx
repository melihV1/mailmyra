'use client';

import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { primaryNav, utilityNav } from './menu-data';
import styles from './MobileNav.module.css';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobil tam ekran overlay (step1-manifesto.md §4): focus trap + body scroll
 * kilidi. Hamburger butonuyla açılır (bkz. Header.tsx `aria-controls`),
 * `Ürün`/`Çözümler` bölümleri akordeon olarak açılır — mega menünün ayrı
 * bir bileşen olarak yeniden kurulmasına gerek yok, aynı `menu-data.ts`
 * kaynağından beslenir.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const container = overlayRef.current;
    const initialFocusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  function toggleSection(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-nav-overlay"
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobil menü"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.topRow}>
            <img src="/logo.svg" alt="Mailmyra" className={styles.logo} width={150} height={29} />
            <button type="button" className={styles.closeButton} aria-label="Menüyü kapat" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 3l14 14M17 3L3 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <ul className={styles.list}>
            {primaryNav.map((item) => {
              if (item.type === 'link') {
                return (
                  <li key={item.id}>
                    <Link href={item.href} className={styles.link} onClick={onClose}>
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const expanded = expandedIds.has(item.id);
              const panelId = `mobile-accordion-${item.id}`;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.accordionHeader}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => toggleSection(item.id)}
                  >
                    {item.label}
                    <svg
                      className={styles.accordionIcon}
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      aria-hidden="true"
                    >
                      <path d="M7 1v12M1 7h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                  {expanded && (
                    <div id={panelId} className={styles.accordionPanel}>
                      <ul className={styles.accordionLinks}>
                        {item.sections
                          .flatMap((section) => section.links)
                          .map((link) => (
                            <li key={link.href}>
                              <Link href={link.href} className={styles.accordionLink} onClick={onClose}>
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        <li>
                          <Link href={item.featured.href} className={styles.accordionLink} onClick={onClose}>
                            {item.featured.ctaLabel}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className={styles.footerActions}>
            <Link href={utilityNav.login.href} className={styles.link} onClick={onClose}>
              {utilityNav.login.label}
            </Link>
            <Button href={utilityNav.cta.href} variant="primary" onClick={onClose}>
              {utilityNav.cta.label}
            </Button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

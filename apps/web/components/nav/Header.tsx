'use client';

import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { MegaMenuPanel } from './MegaMenuPanel';
import { MobileNav } from './MobileNav';
import { primaryNav, utilityNav } from './menu-data';
import styles from './Header.module.css';

// Hover-intent gecikmeleri (step1-manifesto.md §4): açmadan önce kısa bir
// bekleme, panelin üstünden hızlıca geçen imleçle yanlışlıkla açılmayı
// önler; kapatmadan önceki gecikme, tetikleyiciden panele giderken (aradaki
// boşlukta imleç panelin dışında sayılsa bile) paneli erken kapatmaz.
const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 200;

/**
 * Mega menülü üst bar (design-system.md §3.3 override — step1-manifesto.md
 * §4 erişilebilirlik sözleşmesi):
 * - Tetikleyiciler gerçek `<button aria-expanded aria-controls>`.
 * - Panel yalnız `open` iken mount edilir (MegaMenuPanel kendi `<nav>`'ı) —
 *   kapalıyken Tab sırasına hiç girmez.
 * - Hover VE klavye/focus ile açılır; hover'da intent gecikmesi var, focus
 *   anında açar (bilinçli tercih — klavye kullanıcısı için gecikme yalnız
 *   yavaşlık hissettirir, "yanlışlıkla açılma" riski focus'ta yok).
 * - Escape kapatır + odağı tetikleyiciye döndürür.
 * - Dış tıklama kapatır (document mousedown, header dışına).
 * - Aynı anda tek panel (`openId` tek bir state).
 * - Tab paneldeki son öğeden sonra doğal olarak dışarı çıkar; `onBlur` bunu
 *   yakalayıp paneli kapatır (§4: "son öğeden sonra panel kapanır").
 */
export function Header() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const clearTimers = () => {
    if (openTimeout.current) clearTimeout(openTimeout.current);
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  };

  const openNow = (id: string) => {
    clearTimers();
    setOpenId(id);
  };

  const openWithIntent = (id: string) => {
    clearTimers();
    openTimeout.current = setTimeout(() => setOpenId(id), HOVER_OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimeout.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_DELAY_MS);
  };

  const closeNow = (refocusId?: string) => {
    clearTimers();
    setOpenId(null);
    if (refocusId) triggerRefs.current.get(refocusId)?.focus();
  };

  // Dış tıklama kapatır.
  useEffect(() => {
    if (!openId) return;
    function handlePointerDown(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        closeNow();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // Escape kapatır + odağı tetikleyiciye döndürür.
  useEffect(() => {
    if (!openId) return;
    const currentId = openId;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeNow(currentId);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // Scroll'da cam zemine geç (design-system.md §3.3).
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return (
    <header ref={headerRef} className={[styles.header, scrolled ? styles.scrolled : ''].join(' ')}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <span className={styles.logoMark} aria-hidden="true">
            M
          </span>
          <img
            src="/brand/mailmyra-logo.png"
            alt="Mailmyra"
            className={styles.logo}
            width={202}
            height={40}
          />
        </Link>

        <nav aria-label="Main menu" className={styles.nav}>
          <ul className={styles.list}>
            {primaryNav.map((item) => {
              if (item.type === 'link') {
                return (
                  <li key={item.id} className={styles.item}>
                    <Link href={item.href} className={styles.link}>
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const panelId = `mega-panel-${item.id}`;
              const triggerId = `mega-trigger-${item.id}`;
              const isOpen = openId === item.id;

              return (
                <li
                  key={item.id}
                  className={styles.item}
                  onMouseEnter={() => openWithIntent(item.id)}
                  onMouseLeave={scheduleClose}
                  onBlur={(event) => {
                    // Odak bu <li>'nin (tetikleyici + panel) tamamen
                    // dışına çıktıysa kapat — Tab'ın panelden doğal çıkışı
                    // budur (§4: "son öğeden sonra panel kapanır").
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      closeNow();
                    }
                  }}
                >
                  <button
                    id={triggerId}
                    ref={(el) => {
                      if (el) triggerRefs.current.set(item.id, el);
                      else triggerRefs.current.delete(item.id);
                    }}
                    type="button"
                    className={styles.trigger}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => (isOpen ? closeNow() : openNow(item.id))}
                    onFocus={() => openNow(item.id)}
                  >
                    {item.label}
                    <span className={styles.chevron} aria-hidden="true" />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <MegaMenuPanel
                        id={panelId}
                        labelledBy={triggerId}
                        sections={item.sections}
                        featured={item.featured}
                      />
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link href="/dev/render" className={styles.statusChip}>
            <span className={styles.statusDot} aria-hidden="true" />
            Outlook-ready HTML
          </Link>
          <Link href={utilityNav.login.href} className={styles.loginLink}>
            {utilityNav.login.label}
          </Link>
          <Button href={utilityNav.cta.href} variant="primary" className={styles.ctaButton}>
            {utilityNav.cta.label}
          </Button>
          <button
            type="button"
            className={styles.hamburger}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-overlay"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className={mobileOpen ? styles.hamburgerIconOpen : styles.hamburgerIcon} />
          </button>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

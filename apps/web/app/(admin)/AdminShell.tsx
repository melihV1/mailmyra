'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ToastProvider } from '../(app)/ToastProvider';
import { ThemeMenu, type ThemeChoice } from '../(app)/navbar/ThemeMenu';
import { AdminSearch } from './AdminSearch';
import { StaffUserMenu } from './StaffUserMenu';

/**
 * Personel kabuğu — PanelShell'in TAM kopyası (2026-08-19 "paneli
 * beğenmedim" turu: ilk sürüm "sadeleştirilmiş uyarlama"ydı ve geri
 * çevrildi — sadeleştirme de kendi markup'ını yazmanın bir biçimi).
 * Çökertme/hover rayı, layout-transitioning animasyonu, tema menüsü,
 * footer: müşteri kabuğunda ne varsa burada da var.
 *
 * PanelShell'den bilinçli farklar (eksiltme değil, personel gerçeği):
 *   · Varsayılan tema KOYU (`mm-admin-theme` ayrı anahtar) — iki pencere
 *     yan yana dururken hangisi müşteri verisi, renk uzaklığından belli.
 *     Tema menüsüyle değiştirilebilir; zorlama yok.
 *   · Navbar'da bildirim/dil/kısayol yok: onlar müşteri uçlarına istek
 *     atan müşteri bileşenleri. Yerlerinde AdminSearch + StaffUserMenu.
 *   · Menü düz liste — grup yok, grup animasyon makinesi de taşınmadı.
 *   · Navbar üstünde sökülemez STAFF şeridi.
 */

const MENU: ReadonlyArray<{ href: string; label: string; icon: string; exact?: boolean }> = [
  { href: '/admin', label: 'Command center', icon: 'tabler-layout-dashboard', exact: true },
  { href: '/admin/invoices', label: 'Invoices', icon: 'tabler-file-invoice' },
  { href: '/admin/access', label: 'Access log', icon: 'tabler-eye-search' },
  { href: '/admin/actions', label: 'Action log', icon: 'tabler-clipboard-list' },
];

const THEME_KEY = 'mm-admin-theme';
const COLLAPSE_KEY = 'mm-admin-menu-collapsed';

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // mobil off-canvas
  const [collapsed, setCollapsed] = useState(false); // masaüstü ray modu
  const [hovered, setHovered] = useState(false); // çökertilmişken imleç üstünde
  const [transitioning, setTransitioning] = useState(false); // menü animasyon penceresi
  const [theme, setTheme] = useState<ThemeChoice>('dark');
  const [dark, setDark] = useState(true);

  /* PanelShell ile aynı: menü durumu değişirken kabuğa `layout-transitioning`
     bas — core.css'teki .3s geçiş YALNIZ bu sınıf varken tanımlı. */
  const animateMenu = () => {
    setTransitioning(true);
    window.setTimeout(() => setTransitioning(false), 320);
  };

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') setTheme(saved);
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    if (theme !== 'system') {
      setDark(theme === 'dark');
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setDark(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    setMenuOpen((wasOpen) => {
      if (wasOpen) animateMenu();
      return false;
    });
  }, [pathname]);

  const toggleCollapsed = () => {
    animateMenu();
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      return !v;
    });
  };

  return (
    <div
      className={[
        'mm-panel layout-navbar-fixed layout-menu-fixed layout-compact',
        menuOpen ? 'layout-menu-expanded' : '',
        collapsed ? 'layout-menu-collapsed' : '',
        collapsed && hovered ? 'layout-menu-hover' : '',
        transitioning ? 'layout-transitioning' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-skin="default"
      data-bs-theme={dark ? 'dark' : 'light'}
    >
      <ToastProvider>
        <div className="layout-wrapper layout-content-navbar">
          <div className="layout-container">
            <aside
              id="layout-menu"
              className="layout-menu menu-vertical menu"
              data-semidark-menu="true"
              data-bs-theme={dark ? 'dark' : undefined}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <div className="app-brand demo">
                <Link href="/admin" className="app-brand-link">
                  <img
                    src="/brand/logo-ikonlu-white.svg"
                    alt="Mailmyra"
                    className="mm-logo-full"
                    height={30}
                  />
                  <img
                    src="/brand/ikon-white.svg"
                    alt="Mailmyra"
                    className="mm-logo-mark"
                    height={26}
                  />
                </Link>

                <button
                  type="button"
                  className="layout-menu-toggle menu-link text-large ms-auto"
                  aria-label="Toggle menu"
                  onClick={() => {
                    if (window.innerWidth >= 1200) toggleCollapsed();
                    else {
                      animateMenu();
                      setMenuOpen(false);
                    }
                  }}
                >
                  <i
                    className="icon-base ti menu-toggle-icon d-none d-xl-block"
                    aria-hidden="true"
                  />
                  <i className="icon-base ti tabler-x d-block d-xl-none" aria-hidden="true" />
                </button>
              </div>

              <div className="menu-inner-shadow" />

              <ul className="menu-inner py-1">
                <li className="menu-header small">
                  <span className="menu-header-text">Operations</span>
                </li>
                {MENU.map((item) => (
                  <li
                    key={item.href}
                    className={`menu-item${
                      (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                        ? ' active'
                        : ''
                    }`}
                  >
                    <Link href={item.href} className="menu-link">
                      <i className={`menu-icon icon-base ti ${item.icon}`} aria-hidden="true" />
                      <div>{item.label}</div>
                    </Link>
                  </li>
                ))}
                <li className="menu-header small">
                  <span className="menu-header-text">Exit</span>
                </li>
                <li className="menu-item">
                  {/* Tam sayfa <a>: müşteri kabuğu kendi temasıyla baştan kurulur. */}
                  <a href="/app" className="menu-link">
                    <i
                      className="menu-icon icon-base ti tabler-arrow-back-up"
                      aria-hidden="true"
                    />
                    <div>Customer panel</div>
                  </a>
                </li>
              </ul>
            </aside>

            <div className="layout-page">
              {/* Sökülemez bağlam şeridi: bu pencere ÜRETİM müşteri verisi. */}
              <div className="alert alert-danger d-flex align-items-center gap-2 rounded-0 mb-0 py-2 px-4">
                <i className="icon-base ti tabler-shield-lock" aria-hidden="true" />
                <span className="small">
                  <strong>STAFF · PRODUCTION</strong> — customer data. Every sensitive view is
                  logged.
                </span>
              </div>

              <nav
                className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
                id="layout-navbar"
                aria-label="Admin top bar"
              >
                <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
                  <button
                    type="button"
                    className="nav-item nav-link px-0 me-xl-6"
                    aria-label="Open menu"
                    onClick={() => {
                      animateMenu();
                      setMenuOpen(true);
                    }}
                  >
                    <i className="icon-base ti tabler-menu-2 icon-md" aria-hidden="true" />
                  </button>
                </div>

                <div
                  className="navbar-nav-right d-flex align-items-center justify-content-end"
                  id="navbar-collapse"
                >
                  <AdminSearch />

                  <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                    <ThemeMenu choice={theme} dark={dark} onChange={setTheme} />
                    <StaffUserMenu email={email} />
                  </ul>
                </div>
              </nav>

              <div className="content-wrapper">
                <div className="container-xxl flex-grow-1 container-p-y">{children}</div>

                <footer className="content-footer footer bg-footer-theme">
                  <div className="container-xxl">
                    <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                      <div className="text-body">
                        © {new Date().getFullYear()} Mailmyra staff operations — Voldi Creative
                      </div>
                      <div className="d-none d-lg-inline-block">
                        <span className="footer-link text-body-secondary">
                          All access is recorded
                        </span>
                      </div>
                    </div>
                  </div>
                </footer>

                <div className="content-backdrop fade" />
              </div>
            </div>
          </div>

          <div
            className="layout-overlay layout-menu-toggle"
            onClick={() => {
              animateMenu();
              setMenuOpen(false);
            }}
          />
        </div>
      </ToastProvider>
    </div>
  );
}

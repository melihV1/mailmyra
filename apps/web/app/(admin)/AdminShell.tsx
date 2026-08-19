'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { AdminSearch } from './AdminSearch';

/**
 * Personel kabuğu — `PanelShell`in sadeleştirilmiş uyarlaması. Vuexy iskeleti
 * aynı (aside + navbar + content, temanın birebir sınıfları); fark bilinçli:
 *
 *   · KALICI KOYU TEMA — müşteri paneli açık başlar; iki pencere yan yana
 *     dururken hangisinin müşteri verisi olduğu renk uzaklığıyla anlaşılır.
 *   · Navbar üstünde sökülemez STAFF şeridi.
 *   · Tema/dil/bildirim menüleri YOK — onlar müşteri panelinin bileşenleri
 *     ve müşteri uçlarına istek atıyorlar; burada işleri yok.
 *   · Menü düz liste: grup/animasyon makinesi (PanelShell'deki
 *     `_toggleAnimation` portu) beş maddelik menü için taşınmadı.
 */

const MENU: ReadonlyArray<{ href: string; label: string; icon: string; exact?: boolean }> = [
  { href: '/admin', label: 'Command center', icon: 'tabler-layout-dashboard', exact: true },
  { href: '/admin/invoices', label: 'Invoices', icon: 'tabler-file-invoice' },
  { href: '/admin/access', label: 'Access log', icon: 'tabler-eye-search' },
  { href: '/admin/actions', label: 'Action log', icon: 'tabler-clipboard-list' },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div
      className={[
        'mm-panel layout-navbar-fixed layout-menu-fixed layout-compact',
        menuOpen ? 'layout-menu-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-skin="default"
      data-bs-theme="dark"
    >
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <aside id="layout-menu" className="layout-menu menu-vertical menu" data-semidark-menu="true">
            <div className="app-brand demo">
              <Link href="/admin" className="app-brand-link">
                <img src="/brand/logo-ikonlu-white.svg" alt="Mailmyra" height={30} />
                <span className="badge bg-danger ms-2">STAFF</span>
              </Link>
              <button
                type="button"
                className="layout-menu-toggle menu-link text-large ms-auto d-xl-none"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <i className="icon-base ti tabler-x" aria-hidden="true" />
              </button>
            </div>

            <div className="menu-inner-shadow" />

            <ul className="menu-inner py-1">
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
                {/* Tam sayfa <a>: müşteri paneline dönüş kabuğu baştan kursun. */}
                <a href="/app" className="menu-link">
                  <i className="menu-icon icon-base ti tabler-arrow-back-up" aria-hidden="true" />
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
                  onClick={() => setMenuOpen(true)}
                >
                  <i className="icon-base ti tabler-menu-2 icon-md" aria-hidden="true" />
                </button>
              </div>

              <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
                <AdminSearch />
                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <li className="nav-item d-flex align-items-center gap-2">
                    <i className="icon-base ti tabler-user-shield" aria-hidden="true" />
                    <span className="small text-body-secondary">{email}</span>
                  </li>
                </ul>
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">{children}</div>

              <footer className="content-footer footer bg-footer-theme">
                <div className="container-xxl">
                  <div className="footer-container d-flex align-items-center justify-content-between py-4">
                    <div className="text-body small">Mailmyra staff operations — Voldi Creative</div>
                  </div>
                </div>
              </footer>

              <div className="content-backdrop fade" />
            </div>
          </div>
        </div>

        <div className="layout-overlay layout-menu-toggle" onClick={() => setMenuOpen(false)} />
      </div>
    </div>
  );
}

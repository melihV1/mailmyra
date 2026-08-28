'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ToastProvider } from '../(app)/ToastProvider';
import { ThemeMenu, type ThemeChoice } from '../(app)/navbar/ThemeMenu';
import { useDropdown } from '../(app)/navbar/useDropdown';
import { useLang } from '../../lib/i18n/LangProvider';
import { AdminLanguageMenu } from './AdminLanguageMenu';
import { AdminSearch } from './AdminSearch';
import { AdminNotifications, QuickCreateMenu, SnapshotMenu } from './AdminNavbarTools';
import { StaffUserMenu } from './StaffUserMenu';

/**
 * Personel kabuğu — temanın **vertical-menu-template** iskeleti
 * (redesign brief §3-4, uygulama sözleşmesi). İçerik varsayılan olarak
 * açık, kalıcı kontrol menüsü ise Vuexy'nin semi-dark varyantıdır. Tema
 * menüsü içerik yüzeyini light/dark/system arasında değiştirebilir.
 *
 * Çökertme/hover/`layout-transitioning` makinesi PanelShell'den birebir —
 * yatay deneme (2026-08-19) geri çevrildi: kapsamlı bilgi mimarisi dört
 * maddelik yatay menüye sığmıyor (brief §3).
 *
 * `STAFF · PRODUCTION` artık uzun kırmızı alert değil, navbar ALTINDA
 * 28px'lik ortam rayı (brief §4.1) — hiçbir sayfada kaybolmaz.
 */

type MenuChild = {
  href: string;
  label: string;
  status?: 'live' | 'setup';
};

type MenuEntry =
  | { type: 'header'; label: string }
  | {
      type: 'item';
      href: string;
      label: string;
      icon: string;
      exact?: boolean;
      badge?: string;
    }
  | {
      type: 'group';
      id: string;
      label: string;
      icon: string;
      children: ReadonlyArray<MenuChild>;
    };

/**
 * Control-plane worktree'nin kalıcı navigasyonu. Henüz veri kaynağı
 * kurulmayan ekranlar gizlenmez: ilgili kurulum sayfasına gider ve menüde
 * `Setup` rozeti taşır. Böylece bilgi mimarisi baştan sabit kalır ama arayüz
 * olmayan bir yeteneği varmış gibi davranmaz.
 */
const MENU: ReadonlyArray<MenuEntry> = [
  { type: 'header', label: 'Control plane' },
  {
    type: 'item',
    href: '/admin',
    label: 'Command center',
    icon: 'tabler-layout-dashboard',
    exact: true,
    badge: 'Live',
  },
  {
    type: 'group',
    id: 'customers',
    label: 'Customers',
    icon: 'tabler-building-community',
    children: [
      { href: '/admin/orgs', label: 'Organizations', status: 'live' },
      { href: '/admin/customers/users', label: 'Users', status: 'live' },
      { href: '/admin/customers/trials', label: 'Trials & entitlements', status: 'live' },
      { href: '/admin/customers/health', label: 'Customer health', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'product',
    label: 'Product',
    icon: 'tabler-activity-heartbeat',
    children: [
      { href: '/admin/product/overview', label: 'Product overview', status: 'live' },
      { href: '/admin/product/activation', label: 'Activation funnel', status: 'live' },
      { href: '/admin/product/builder', label: 'Builder usage', status: 'live' },
      { href: '/admin/product/exports', label: 'Exports', status: 'live' },
      { href: '/admin/product/templates', label: 'Templates', status: 'live' },
      { href: '/admin/product/cohorts', label: 'Cohorts & retention', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'revenue',
    label: 'Revenue',
    icon: 'tabler-currency-dollar',
    children: [
      { href: '/admin/revenue/overview', label: 'Revenue overview', status: 'live' },
      { href: '/admin/invoices', label: 'Invoices', status: 'live' },
      { href: '/admin/revenue/receivables', label: 'Receivables', status: 'live' },
      { href: '/admin/revenue/seats', label: 'Seat ledger', status: 'live' },
      { href: '/admin/revenue/pricing-versions', label: 'Pricing versions', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'growth',
    label: 'Growth & content',
    icon: 'tabler-speakerphone',
    children: [
      { href: '/admin/growth/overview', label: 'Growth overview', status: 'live' },
      { href: '/admin/growth/acquisition', label: 'Acquisition', status: 'live' },
      { href: '/admin/growth/leads', label: 'Leads', status: 'live' },
      { href: '/admin/growth/content/pages', label: 'Pages & SEO', status: 'live' },
      { href: '/admin/growth/content/media', label: 'Media library', status: 'live' },
      { href: '/admin/growth/content/legal', label: 'Legal content', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'support',
    label: 'Support',
    icon: 'tabler-headset',
    children: [
      { href: '/admin/support/queue', label: 'Support queue', status: 'live' },
      { href: '/admin/support/cases', label: 'Cases', status: 'live' },
      { href: '/admin/support/onboarding', label: 'Onboarding', status: 'live' },
      { href: '/admin/support/playbooks', label: 'Playbooks', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'platform',
    label: 'Platform',
    icon: 'tabler-server-cog',
    children: [
      { href: '/admin/platform/overview', label: 'System health', status: 'live' },
      { href: '/admin/platform/mail', label: 'Mail delivery', status: 'live' },
      { href: '/admin/platform/exports', label: 'Export pipeline', status: 'live' },
      { href: '/admin/platform/jobs', label: 'Jobs', status: 'live' },
      { href: '/admin/platform/errors', label: 'Errors', status: 'live' },
      { href: '/admin/platform/releases', label: 'Releases', status: 'live' },
      { href: '/admin/platform/feature-flags', label: 'Feature flags', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'security',
    label: 'Security & governance',
    icon: 'tabler-shield-lock',
    children: [
      { href: '/admin/security/overview', label: 'Security overview', status: 'live' },
      { href: '/admin/access', label: 'Staff access log', status: 'live' },
      { href: '/admin/actions', label: 'Admin action log', status: 'live' },
      { href: '/admin/security/staff', label: 'Staff & roles', status: 'live' },
      { href: '/admin/security/approvals', label: 'Approvals', status: 'live' },
      { href: '/admin/security/data-requests', label: 'KVKK requests', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    label: 'Reports',
    icon: 'tabler-report-analytics',
    children: [
      { href: '/admin/reports/library', label: 'Report library', status: 'live' },
      { href: '/admin/reports/scheduled', label: 'Scheduled reports', status: 'live' },
      { href: '/admin/reports/definitions', label: 'KPI definitions', status: 'live' },
    ],
  },
];

const WORKSPACE_SHORTCUTS = [
  { href: '/admin/orgs', label: 'Customers', icon: 'tabler-building-community', tone: 'primary' },
  { href: '/admin/product/overview', label: 'Product', icon: 'tabler-activity-heartbeat', tone: 'info' },
  { href: '/admin/invoices', label: 'Revenue', icon: 'tabler-file-dollar', tone: 'success' },
  { href: '/admin/growth/overview', label: 'Growth', icon: 'tabler-speakerphone', tone: 'warning' },
  { href: '/admin/platform/overview', label: 'Platform', icon: 'tabler-server-cog', tone: 'secondary' },
  { href: '/admin/security/overview', label: 'Security', icon: 'tabler-shield-lock', tone: 'danger' },
] as const;

const THEME_KEY = 'mm-admin-theme-v2';
const COLLAPSE_KEY = 'mm-admin-menu-collapsed';

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const lang = useLang();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // mobil off-canvas
  const [collapsed, setCollapsed] = useState(false); // masaüstü ray modu
  const [hovered, setHovered] = useState(false); // çökertilmişken imleç üstünde
  const [transitioning, setTransitioning] = useState(false); // menü animasyon penceresi
  const [theme, setTheme] = useState<ThemeChoice>('light');
  const [dark, setDark] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  /* Temanın menu.js'inin işi: menü durumu değişirken kabuğa
     `layout-transitioning` bas — core.css'teki .3s geçiş yalnız o sınıfla. */
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

  useEffect(() => {
    const activeGroup = MENU.find(
      (entry): entry is Extract<MenuEntry, { type: 'group' }> =>
        entry.type === 'group' && entry.children.some((child) => pathname.startsWith(child.href)),
    );
    if (!activeGroup) return;
    setOpenGroups((groups) =>
      groups.includes(activeGroup.id) ? groups : [...groups, activeGroup.id],
    );
  }, [pathname]);

  const toggleCollapsed = () => {
    animateMenu();
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      return !v;
    });
  };

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

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
      lang={lang}
      data-skin="default"
      data-bs-theme={dark ? 'dark' : 'light'}
    >
      <ToastProvider>
        <div className="layout-wrapper layout-content-navbar">
          <div className="layout-container">
            {/* Vuexy semi-dark menu: light içerikte de yönetim bağlamı görünür kalır. */}
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

              <div className="mm-admin-staff-context mm-logo-full" aria-label="Staff production console">
                <span className="mm-admin-staff-context__icon" aria-hidden="true">
                  <i className="icon-base ti tabler-shield-check" />
                </span>
                <span className="mm-admin-staff-context__copy">
                  <strong>Staff console</strong>
                  <small>Production control</small>
                </span>
                <span className="mm-admin-staff-context__status">
                  <span aria-hidden="true" />
                  Live
                </span>
              </div>

              <div className="menu-inner-shadow" />

              <ul className="menu-inner py-1">
                {MENU.map((entry) => {
                  if (entry.type === 'header') {
                    return (
                    <li key={`h:${entry.label}`} className="menu-header small">
                      <span className="menu-header-text">{entry.label}</span>
                    </li>
                    );
                  }

                  if (entry.type === 'group') {
                    const active = entry.children.some((child) => pathname.startsWith(child.href));
                    const open = openGroups.includes(entry.id);
                    return (
                      <li
                        key={entry.id}
                        className={`menu-item${active ? ' active' : ''}${open ? ' open' : ''}`}
                      >
                        <button
                          type="button"
                          className="menu-link menu-toggle"
                          aria-expanded={open}
                          onClick={() =>
                            setOpenGroups((groups) =>
                              groups.includes(entry.id)
                                ? groups.filter((id) => id !== entry.id)
                                : [...groups, entry.id],
                            )
                          }
                        >
                          <i
                            className={`menu-icon icon-base ti ${entry.icon}`}
                            aria-hidden="true"
                          />
                          <div className="text-truncate">{entry.label}</div>
                        </button>
                        <ul className="menu-sub">
                          {entry.children.map((child) => (
                            <li
                              key={child.href}
                              className={`menu-item${pathname.startsWith(child.href) ? ' active' : ''}`}
                            >
                              <Link href={child.href} className="menu-link">
                                <div className="text-truncate">{child.label}</div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={entry.href}
                      className={`menu-item${isActive(entry) ? ' active' : ''}`}
                    >
                      <Link href={entry.href} className="menu-link">
                        <i
                          className={`menu-icon icon-base ti ${entry.icon}`}
                          aria-hidden="true"
                        />
                        <div>{entry.label}</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className="layout-page">
              <nav
                className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme mm-admin-navbar"
                id="layout-navbar"
                aria-label="Staff top bar"
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
                  <ul className="navbar-nav flex-row align-items-center ms-md-auto mm-admin-tools">
                    <QuickCreateMenu />
                    <SnapshotMenu />
                    <WorkspaceSwitcher />
                    <AdminNotifications />
                    <AdminLanguageMenu />
                    <ThemeMenu choice={theme} dark={dark} onChange={setTheme} />
                    <StaffUserMenu email={email} />
                  </ul>
                </div>
              </nav>

              <div className="content-wrapper">
                {/* Ortam rayı (brief §4.1): 28px, navbar'ın altında, sökülmez. */}
                <div className="container-xxl mm-admin-env-shell">
                  <div
                    className="mm-admin-env-rail d-flex align-items-center gap-2 px-3"
                  >
                    <i className="icon-base ti tabler-shield-lock icon-sm" aria-hidden="true" />
                    <strong>STAFF · PRODUCTION</strong>
                    <span className="d-none d-sm-inline mm-admin-env-copy">
                      customer data — every sensitive view is logged
                    </span>
                  </div>
                </div>

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

function WorkspaceSwitcher() {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-text-secondary rounded-pill btn-icon"
        aria-label="Open workspaces"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-apps icon-md" aria-hidden="true" />
      </button>
      <div
        className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`}
        style={{ width: 330 }}
      >
        <div className="dropdown-menu-header border-bottom">
          <div className="dropdown-header d-flex align-items-center py-3">
            <h6 className="mb-0 me-auto">Control plane</h6>
            <span className="badge rounded-pill bg-label-primary">9 workspaces</span>
          </div>
        </div>
        <div className="row row-bordered g-0">
          {WORKSPACE_SHORTCUTS.map((item) => (
            <div className="col-4" key={item.href}>
              <Link
                href={item.href}
                className="dropdown-shortcuts-item d-flex flex-column align-items-center text-center p-4 h-100"
                onClick={() => setOpen(false)}
              >
                <span className={`avatar-initial rounded bg-label-${item.tone} p-2 mb-2`}>
                  <i className={`icon-base ti ${item.icon} icon-26px`} aria-hidden="true" />
                </span>
                <small className="text-heading fw-medium">{item.label}</small>
              </Link>
            </div>
          ))}
        </div>
        <div className="border-top p-2 text-center">
          <Link href="/admin/reports/definitions" className="btn btn-sm btn-text-secondary">
            KPI definitions
            <i className="icon-base ti tabler-arrow-right ms-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

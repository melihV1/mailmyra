'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ToastProvider } from '../(app)/ToastProvider';
import { ThemeMenu, type ThemeChoice } from '../(app)/navbar/ThemeMenu';
import { useDropdown } from '../(app)/navbar/useDropdown';
import { useLang } from '../../lib/i18n/LangProvider';
import { adminCommon } from '../../lib/i18n/dict/admin-common';
import { adminNav } from '../../lib/i18n/dict/admin-nav';
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

/** MENU etiketleri sözlükten gelir — PanelShell'in labelKey deseni birebir. */
type MenuLabelKey = keyof (typeof adminNav)['en']['menu'];

type MenuChild = {
  href: string;
  labelKey: MenuLabelKey;
  status?: 'live' | 'setup';
};

type MenuEntry =
  | { type: 'header'; labelKey: MenuLabelKey }
  | {
      type: 'item';
      href: string;
      labelKey: MenuLabelKey;
      icon: string;
      exact?: boolean;
      badge?: string;
    }
  | {
      type: 'group';
      id: string;
      labelKey: MenuLabelKey;
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
  { type: 'header', labelKey: 'controlPlane' },
  {
    type: 'item',
    href: '/admin',
    labelKey: 'commandCenter',
    icon: 'tabler-layout-dashboard',
    exact: true,
    badge: 'Live',
  },
  {
    type: 'group',
    id: 'customers',
    labelKey: 'customers',
    icon: 'tabler-building-community',
    children: [
      { href: '/admin/orgs', labelKey: 'customersOrganizations', status: 'live' },
      { href: '/admin/customers/users', labelKey: 'customersUsers', status: 'live' },
      { href: '/admin/customers/trials', labelKey: 'customersTrials', status: 'live' },
      { href: '/admin/customers/health', labelKey: 'customersHealth', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'product',
    labelKey: 'product',
    icon: 'tabler-activity-heartbeat',
    children: [
      { href: '/admin/product/overview', labelKey: 'productOverview', status: 'live' },
      { href: '/admin/product/activation', labelKey: 'productActivation', status: 'live' },
      { href: '/admin/product/builder', labelKey: 'productBuilder', status: 'live' },
      { href: '/admin/product/exports', labelKey: 'productExports', status: 'live' },
      { href: '/admin/product/templates', labelKey: 'productTemplates', status: 'live' },
      { href: '/admin/product/cohorts', labelKey: 'productCohorts', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'revenue',
    labelKey: 'revenue',
    icon: 'tabler-currency-dollar',
    children: [
      { href: '/admin/revenue/overview', labelKey: 'revenueOverview', status: 'live' },
      { href: '/admin/invoices', labelKey: 'revenueInvoices', status: 'live' },
      { href: '/admin/revenue/receivables', labelKey: 'revenueReceivables', status: 'live' },
      { href: '/admin/revenue/seats', labelKey: 'revenueSeatLedger', status: 'live' },
      { href: '/admin/revenue/pricing-versions', labelKey: 'revenuePricingVersions', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'growth',
    labelKey: 'growth',
    icon: 'tabler-speakerphone',
    children: [
      { href: '/admin/growth/overview', labelKey: 'growthOverview', status: 'live' },
      { href: '/admin/growth/acquisition', labelKey: 'growthAcquisition', status: 'live' },
      { href: '/admin/growth/leads', labelKey: 'growthLeads', status: 'live' },
      { href: '/admin/growth/content/pages', labelKey: 'growthPagesSeo', status: 'live' },
      { href: '/admin/growth/content/media', labelKey: 'growthMediaLibrary', status: 'live' },
      { href: '/admin/growth/content/legal', labelKey: 'growthLegalContent', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'support',
    labelKey: 'support',
    icon: 'tabler-headset',
    children: [
      { href: '/admin/support/queue', labelKey: 'supportQueue', status: 'live' },
      { href: '/admin/support/cases', labelKey: 'supportCases', status: 'live' },
      { href: '/admin/support/onboarding', labelKey: 'supportOnboarding', status: 'live' },
      { href: '/admin/support/playbooks', labelKey: 'supportPlaybooks', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'platform',
    labelKey: 'platform',
    icon: 'tabler-server-cog',
    children: [
      { href: '/admin/platform/overview', labelKey: 'platformSystemHealth', status: 'live' },
      { href: '/admin/platform/mail', labelKey: 'platformMailDelivery', status: 'live' },
      { href: '/admin/platform/exports', labelKey: 'platformExportPipeline', status: 'live' },
      { href: '/admin/platform/jobs', labelKey: 'platformJobs', status: 'live' },
      { href: '/admin/platform/errors', labelKey: 'platformErrors', status: 'live' },
      { href: '/admin/platform/releases', labelKey: 'platformReleases', status: 'live' },
      { href: '/admin/platform/feature-flags', labelKey: 'platformFeatureFlags', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'security',
    labelKey: 'security',
    icon: 'tabler-shield-lock',
    children: [
      { href: '/admin/security/overview', labelKey: 'securityOverview', status: 'live' },
      { href: '/admin/access', labelKey: 'securityAccessLog', status: 'live' },
      { href: '/admin/actions', labelKey: 'securityActionLog', status: 'live' },
      { href: '/admin/security/staff', labelKey: 'securityStaffRoles', status: 'live' },
      { href: '/admin/security/approvals', labelKey: 'securityApprovals', status: 'live' },
      { href: '/admin/security/data-requests', labelKey: 'securityKvkkRequests', status: 'live' },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    labelKey: 'reports',
    icon: 'tabler-report-analytics',
    children: [
      { href: '/admin/reports/library', labelKey: 'reportsLibrary', status: 'live' },
      { href: '/admin/reports/scheduled', labelKey: 'reportsScheduled', status: 'live' },
      { href: '/admin/reports/definitions', labelKey: 'reportsKpiDefinitions', status: 'live' },
    ],
  },
];

const WORKSPACE_SHORTCUTS: ReadonlyArray<{
  href: string;
  labelKey: keyof (typeof adminNav)['en']['shortcuts'];
  icon: string;
  tone: string;
}> = [
  { href: '/admin/orgs', labelKey: 'customers', icon: 'tabler-building-community', tone: 'primary' },
  { href: '/admin/product/overview', labelKey: 'product', icon: 'tabler-activity-heartbeat', tone: 'info' },
  { href: '/admin/invoices', labelKey: 'revenue', icon: 'tabler-file-dollar', tone: 'success' },
  { href: '/admin/growth/overview', labelKey: 'growth', icon: 'tabler-speakerphone', tone: 'warning' },
  { href: '/admin/platform/overview', labelKey: 'platform', icon: 'tabler-server-cog', tone: 'secondary' },
  { href: '/admin/security/overview', labelKey: 'security', icon: 'tabler-shield-lock', tone: 'danger' },
];

const THEME_KEY = 'mm-admin-theme-v2';
const COLLAPSE_KEY = 'mm-admin-menu-collapsed';

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const lang = useLang();
  const t = adminNav[lang];
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
                  aria-label={t.shell.toggleMenu}
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

              <div className="mm-admin-staff-context mm-logo-full" aria-label={t.shell.staffContextAria}>
                <span className="mm-admin-staff-context__icon" aria-hidden="true">
                  <i className="icon-base ti tabler-shield-check" />
                </span>
                <span className="mm-admin-staff-context__copy">
                  <strong>{t.shell.staffConsole}</strong>
                  <small>{t.shell.productionControl}</small>
                </span>
                <span className="mm-admin-staff-context__status">
                  <span aria-hidden="true" />
                  {adminCommon[lang].live}
                </span>
              </div>

              <div className="menu-inner-shadow" />

              <ul className="menu-inner py-1">
                {MENU.map((entry) => {
                  if (entry.type === 'header') {
                    return (
                    <li key={`h:${entry.labelKey}`} className="menu-header small">
                      <span className="menu-header-text">{t.menu[entry.labelKey]}</span>
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
                          <div className="text-truncate">{t.menu[entry.labelKey]}</div>
                        </button>
                        <ul className="menu-sub">
                          {entry.children.map((child) => (
                            <li
                              key={child.href}
                              className={`menu-item${pathname.startsWith(child.href) ? ' active' : ''}`}
                            >
                              <Link href={child.href} className="menu-link">
                                <div className="text-truncate">{t.menu[child.labelKey]}</div>
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
                        <div>{t.menu[entry.labelKey]}</div>
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
                aria-label={t.shell.topBar}
              >
                <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
                  <button
                    type="button"
                    className="nav-item nav-link px-0 me-xl-6"
                    aria-label={t.shell.openMenu}
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
                    <strong>{t.shell.envRailLabel}</strong>
                    <span className="d-none d-sm-inline mm-admin-env-copy">
                      {t.shell.envRailCopy}
                    </span>
                  </div>
                </div>

                <div className="container-xxl flex-grow-1 container-p-y">{children}</div>

                <footer className="content-footer footer bg-footer-theme">
                  <div className="container-xxl">
                    <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                      <div className="text-body">
                        {t.shell.footerCopyright(new Date().getFullYear())}
                      </div>
                      <div className="d-none d-lg-inline-block">
                        <span className="footer-link text-body-secondary">
                          {t.shell.footerAllAccessRecorded}
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
  const lang = useLang();
  const t = adminNav[lang];
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-text-secondary rounded-pill btn-icon"
        aria-label={t.workspaceSwitcher.ariaLabel}
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
            <h6 className="mb-0 me-auto">{t.workspaceSwitcher.heading}</h6>
            <span className="badge rounded-pill bg-label-primary">{t.workspaceSwitcher.badge(9)}</span>
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
                <small className="text-heading fw-medium">{t.shortcuts[item.labelKey]}</small>
              </Link>
            </div>
          ))}
        </div>
        <div className="border-top p-2 text-center">
          <Link href="/admin/reports/definitions" className="btn btn-sm btn-text-secondary">
            {t.workspaceSwitcher.kpiDefinitions}
            <i className="icon-base ti tabler-arrow-right ms-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

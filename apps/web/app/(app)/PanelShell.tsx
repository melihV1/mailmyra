'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ToastProvider } from './ToastProvider';
import { LanguageMenu } from './navbar/LanguageMenu';
import { NotificationsBell } from './navbar/NotificationsBell';
import { SearchPalette } from './navbar/SearchPalette';
import { ShortcutsMenu } from './navbar/ShortcutsMenu';
import { ThemeMenu, type ThemeChoice } from './navbar/ThemeMenu';
import { UserMenu } from './navbar/UserMenu';

/**
 * Vuexy panel kabuğu — DOM iskeleti temanın `vertical-menu-template`
 * sayfalarından BİREBİR (karar 2026-08-13: görünüm tema neyse o; arama,
 * kısayollar, bildirim, dil, footer dahil hiçbir parça atlanmaz). Sol menü
 * `data-semidark-menu` ile KOYU (Hüseyin, 2026-08-13) — içerik açık kalır.
 *
 * Bootstrap/jQuery JS'i alınmadı; davranışlar React durumları (menü
 * bileşenleri `navbar/` altında). Yalıtım: bütün Vuexy layout sınıfları ve
 * `data-bs-theme` HTML'e değil BU sarmalayıcıya yazılır — core.css'in
 * seçicileri sınıf/attribute tabanlı (html öneki yok, ölçüldü), builder ve
 * pazarlama rotaları hiç etkilenmez.
 */

const MENU: ReadonlyArray<
  | { type: 'header'; label: string }
  | { type: 'item'; href: string; label: string; icon: string; exact?: boolean; external?: boolean }
  | {
      type: 'group';
      id: string;
      label: string;
      icon: string;
      children: ReadonlyArray<{ href: string; label: string }>;
    }
> = [
  { type: 'item', href: '/app', label: 'Dashboard', icon: 'tabler-smart-home', exact: true },
  { type: 'header', label: 'Workspace' },
  { type: 'item', href: '/app/signatures', label: 'Signatures', icon: 'tabler-signature' },
  { type: 'item', href: '/app/senders', label: 'Senders', icon: 'tabler-users' },
  { type: 'item', href: '/app/members', label: 'Members', icon: 'tabler-user-cog' },
  { type: 'item', href: '/app/brand', label: 'Brand', icon: 'tabler-palette' },
  { type: 'item', href: '/app/activity', label: 'Activity', icon: 'tabler-history' },
  { type: 'header', label: 'Account' },
  /* Temanın Authentications grubundaki açılır menü dili (Hüseyin,
     2026-08-14): Account artık chevron'lu grup, alt sayfaları içinde. */
  {
    type: 'group',
    id: 'account',
    label: 'Account',
    icon: 'tabler-user-circle',
    children: [
      { href: '/app/account', label: 'Profile' },
      { href: '/app/account/security', label: 'Security' },
      { href: '/app/account/billing', label: 'Billing & Plan' },
      { href: '/app/account/notifications', label: 'Notifications' },
    ],
  },
  { type: 'header', label: 'Tools' },
  { type: 'item', href: '/app/guides', label: 'Setup guides', icon: 'tabler-book' },
  /* Builder BİLEREK tam sayfa (<a>): panel rotasından çıkınca Vuexy
     <link>'leri DOM'dan düşsün, builder'ın CSS dünyası temiz kalsın. */
  { type: 'item', href: '/builder', label: 'Open builder', icon: 'tabler-edit', external: true },
];

const THEME_KEY = 'mm-panel-theme';
const COLLAPSE_KEY = 'mm-panel-menu-collapsed';

export function PanelShell({
  email,
  role,
  seatsFull,
  seatsBadge,
  avatarUrl,
  staff = false,
  children,
}: {
  email: string;
  role: string | null;
  seatsFull: boolean;
  /** Sidebar'daki Senders rozeti, ör. "2/3" — temanın menü rozeti dili. */
  seatsBadge?: string;
  avatarUrl?: string | null;
  /** Voldi personeli — yalnız Staff panel bağlantısının görünürlüğü. */
  staff?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // mobil off-canvas
  const [collapsed, setCollapsed] = useState(false); // masaüstü ray modu
  const [hovered, setHovered] = useState(false); // çökertilmişken imleç üstünde
  const [transitioning, setTransitioning] = useState(false); // menü animasyon penceresi
  const [theme, setTheme] = useState<ThemeChoice>('light');
  const [dark, setDark] = useState(false);
  // Açık menü grupları — içindeki sayfadayken kendiliğinden açık başlar.
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  /* Alt menü aç/kapa animasyonu — temanın menu.js `_toggleAnimation` akışının
     React karşılığı: li'ye inline height basılır, `menu-item-animating`
     (core.css: block-size .3s geçişi YALNIZ bu sınıfla) ve kapanışta
     `menu-item-closing` eklenir; transitionend (+350ms emniyet) temizler.
     Ref aynası, geciken timeout'ların bayat state okumaması için. */
  const [groupAnim, setGroupAnim] = useState<Readonly<Record<string, 'opening' | 'closing'>>>({});
  const groupAnimRef = useRef<Record<string, 'opening' | 'closing'>>({});
  const groupRefs = useRef(new Map<string, HTMLLIElement>());

  /* Temanın menu.js'inin yaptığı iş: menü durumunu değiştirirken kabuğa
     `layout-transitioning` bas — core.css'teki .3s transform geçişi YALNIZ
     bu sınıf varken tanımlı, yoksa menü "tak" diye açılıyor. */
  const animateMenu = () => {
    setTransitioning(true);
    window.setTimeout(() => setTransitioning(false), 320);
  };

  // Tercihler: SSR varsayılanla başlar, istemci kayıtlıyı uygular.
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')
      setTheme(savedTheme);
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

  // Rota değişince mobil menü kapanır (kayarak).
  useEffect(() => {
    setMenuOpen((wasOpen) => {
      if (wasOpen) animateMenu();
      return false;
    });
  }, [pathname]);

  // İçinde gezilen grup açık kalsın (elle kapatılmışsa rota değişimi yeniden açar).
  useEffect(() => {
    for (const entry of MENU) {
      if (entry.type === 'group' && entry.children.some((c) => pathname === c.href)) {
        setOpenGroups((prev) => (prev.has(entry.id) ? prev : new Set([...prev, entry.id])));
      }
    }
  }, [pathname]);

  const finishGroupAnim = useCallback((id: string) => {
    const anim = groupAnimRef.current[id];
    if (!anim) return;
    delete groupAnimRef.current[id];
    const li = groupRefs.current.get(id);
    if (li) {
      li.style.height = '';
      li.style.overflow = '';
    }
    if (anim === 'closing') {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setGroupAnim((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleGroup = (id: string) => {
    if (groupAnimRef.current[id]) return; // animasyon sürerken tıklamayı yut
    const li = groupRefs.current.get(id);
    const link = li?.querySelector<HTMLElement>(':scope > .menu-toggle');
    const sub = li?.querySelector<HTMLElement>(':scope > .menu-sub');
    if (!li || !link || !sub) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    const opening = !openGroups.has(id);
    const linkH = Math.round(link.getBoundingClientRect().height);
    li.style.overflow = 'hidden';
    groupAnimRef.current[id] = opening ? 'opening' : 'closing';
    setGroupAnim((prev) => ({ ...prev, [id]: opening ? 'opening' : 'closing' }));
    if (opening) {
      li.style.height = `${linkH}px`;
      setOpenGroups((prev) => new Set([...prev, id]));
      // Hedef yükseklik `.open` render edilip alt menü ölçülebilir olunca (temada 50ms).
      window.setTimeout(() => {
        li.style.height = `${linkH + Math.round(sub.getBoundingClientRect().height)}px`;
      }, 50);
    } else {
      li.style.height = `${linkH + Math.round(sub.getBoundingClientRect().height)}px`;
      window.setTimeout(() => {
        li.style.height = `${linkH}px`;
      }, 50);
    }
    window.setTimeout(() => finishGroupAnim(id), 350);
  };

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
      data-skin="default"
      data-bs-theme={dark ? 'dark' : 'light'}
    >
      <ToastProvider>
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          {/* Semi-dark menü: attribute yalnız aside'da — içerik açık kalır */}
          <aside
            id="layout-menu"
            className="layout-menu menu-vertical menu"
            data-semidark-menu="true"
            data-bs-theme={dark ? 'dark' : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div className="app-brand demo">
              {/* Gerçek marka logosu (Hüseyin, 2026-08-14): menü her temada
                  koyu (semi-dark) olduğu için beyaz sürümler. Çökertilmiş
                  rayda tam logo sığmaz — CSS yalnız ikonu bırakır
                  (panel-overrides .mm-logo-*). */}
              <Link href="/app" className="app-brand-link">
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
                  // Masaüstünde raya çökert; mobilde off-canvas'ı kapat.
                  if (window.innerWidth >= 1200) toggleCollapsed();
                  else {
                    animateMenu();
                    setMenuOpen(false);
                  }
                }}
              >
                <i className="icon-base ti menu-toggle-icon d-none d-xl-block" aria-hidden="true" />
                <i className="icon-base ti tabler-x d-block d-xl-none" aria-hidden="true" />
              </button>
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
                  const childActive = entry.children.some((c) => pathname === c.href);
                  const isOpen = openGroups.has(entry.id);
                  const anim = groupAnim[entry.id];
                  return (
                    <li
                      key={`g:${entry.id}`}
                      ref={(el) => {
                        if (el) groupRefs.current.set(entry.id, el);
                        else groupRefs.current.delete(entry.id);
                      }}
                      onTransitionEnd={(e) => {
                        if (e.target === e.currentTarget) finishGroupAnim(entry.id);
                      }}
                      className={`menu-item${isOpen ? ' open' : ''}${childActive ? ' active' : ''}${
                        anim ? ' menu-item-animating' : ''
                      }${anim === 'closing' ? ' menu-item-closing' : ''}`}
                    >
                      {/* Temanın birebir markup'ı `<a>` — button+w-100 genişliği
                          margin'leri ezip taşırıyordu (236px yerine 260px). */}
                      <a
                        href="#"
                        className="menu-link menu-toggle"
                        aria-expanded={isOpen}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleGroup(entry.id);
                        }}
                      >
                        <i className={`menu-icon icon-base ti ${entry.icon}`} aria-hidden="true" />
                        <div>{entry.label}</div>
                      </a>
                      <ul className="menu-sub">
                        {entry.children.map((child) => (
                          <li
                            key={child.href}
                            className={`menu-item${pathname === child.href ? ' active' : ''}`}
                          >
                            <Link href={child.href} className="menu-link">
                              <div>{child.label}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                return (
                  <li key={entry.href} className={`menu-item${isActive(entry) ? ' active' : ''}`}>
                    {entry.external ? (
                      <a href={entry.href} className="menu-link">
                        <i className={`menu-icon icon-base ti ${entry.icon}`} aria-hidden="true" />
                        <div>{entry.label}</div>
                      </a>
                    ) : (
                      <Link href={entry.href} className="menu-link">
                        <i className={`menu-icon icon-base ti ${entry.icon}`} aria-hidden="true" />
                        <div>{entry.label}</div>
                        {entry.href === '/app/senders' && seatsBadge && (
                          <div className="badge bg-label-primary rounded-pill ms-auto">
                            {seatsBadge}
                          </div>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
              {staff && (
                <>
                  <li className="menu-header small">
                    <span className="menu-header-text">Voldi</span>
                  </li>
                  <li className="menu-item">
                    {/* Tam sayfa <a>: personel kabuğu kendi temasıyla baştan kurulur. */}
                    <a href="/admin" className="menu-link">
                      <i className="menu-icon icon-base ti tabler-shield-lock" aria-hidden="true" />
                      <div>Staff panel</div>
                      <div className="badge bg-label-danger rounded-pill ms-auto">STAFF</div>
                    </a>
                  </li>
                </>
              )}
            </ul>
          </aside>

          <div className="layout-page">
            <nav
              className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
              id="layout-navbar"
              aria-label="Panel top bar"
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
                <SearchPalette />

                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <LanguageMenu />
                  <ThemeMenu choice={theme} dark={dark} onChange={setTheme} />
                  <ShortcutsMenu />
                  <NotificationsBell />
                  <UserMenu email={email} role={role} seatsFull={seatsFull} avatarUrl={avatarUrl} />
                </ul>
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">{children}</div>

              <footer className="content-footer footer bg-footer-theme">
                <div className="container-xxl">
                  <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                    <div className="text-body">
                      © {new Date().getFullYear()} Mailmyra — a Voldi Creative product
                    </div>
                    <div className="d-none d-lg-inline-block">
                      <a href="/terms" className="footer-link me-4">
                        Terms
                      </a>
                      <a href="/privacy" className="footer-link me-4">
                        Privacy
                      </a>
                      <a href="/kvkk" className="footer-link">
                        KVKK
                      </a>
                    </div>
                  </div>
                </div>
              </footer>

              <div className="content-backdrop fade" />
            </div>
          </div>
        </div>

        {/* Mobilde menü açıkken içerik üstü karartma — tıklayınca kapat */}
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

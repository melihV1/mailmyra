'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useLang } from '../../../lib/i18n/LangProvider';
import { nav } from '../../../lib/i18n/dict/nav';
import { useDropdown } from './useDropdown';

/**
 * Navbar araması — temanın "Search ⌘K" yeri. Panel sayfaları anında,
 * içerik (imza/gönderici/üye) /api/search'ten debounce'la gelir.
 */

interface Hit {
  group: string;
  label: string;
  sublabel: string;
  href: string;
}

/* HER panel sayfası burada olmalı (Hüseyin, 2026-08-15: "billing yazıyorum
   göstermiyor") — keywords görünmez eş anlamlılardır, etiketle birlikte
   aranır (İNGİLİZCE kalır — arama indeksi, ekrana basılmaz; TR eş anlamlı
   ekleme kapsam dışı). Builder `external`: sidebar'daki gibi tam sayfa <a>
   (CSS yalıtımı). */
const PAGES: ReadonlyArray<{
  labelKey: keyof (typeof nav)['en']['search']['pages'];
  href: string;
  icon: string;
  keywords: string;
  external?: boolean;
}> = [
  { labelKey: 'dashboard', href: '/app', icon: 'tabler-layout-dashboard', keywords: 'home overview' },
  {
    labelKey: 'signatures',
    href: '/app/signatures',
    icon: 'tabler-signature',
    keywords: 'template assign',
  },
  {
    labelKey: 'senders',
    href: '/app/senders',
    icon: 'tabler-users',
    keywords: 'seat publish deactivate csv import export zip',
  },
  {
    labelKey: 'members',
    href: '/app/members',
    icon: 'tabler-user-cog',
    keywords: 'team invite invitation role workspace rename',
  },
  {
    labelKey: 'brand',
    href: '/app/brand',
    icon: 'tabler-palette',
    keywords: 'color logo font lock default template',
  },
  {
    labelKey: 'notifications',
    href: '/app/notifications',
    icon: 'tabler-bell',
    keywords: 'inbox alerts unread mark read delete',
  },
  {
    labelKey: 'activity',
    href: '/app/activity',
    icon: 'tabler-history',
    keywords: 'audit log history who changed events',
  },
  {
    labelKey: 'setupGuides',
    href: '/app/guides',
    icon: 'tabler-book',
    keywords: 'install outlook gmail apple mail ios how to',
  },
  {
    labelKey: 'account',
    href: '/app/account',
    icon: 'tabler-user-circle',
    keywords: 'profile email change delete legal',
  },
  {
    labelKey: 'security',
    href: '/app/account/security',
    icon: 'tabler-lock',
    keywords: 'password sessions sign out',
  },
  {
    labelKey: 'billingPlan',
    href: '/app/account/billing',
    icon: 'tabler-credit-card',
    keywords: 'invoice payment price seats trial plan',
  },
  {
    labelKey: 'accountNotifications',
    href: '/app/account/notifications',
    icon: 'tabler-bell',
    keywords: 'alerts preferences',
  },
  {
    labelKey: 'myProfile',
    href: '/app/profile',
    icon: 'tabler-user',
    keywords: 'avatar photo cover timeline',
  },
  {
    labelKey: 'openBuilder',
    href: '/builder',
    icon: 'tabler-edit',
    keywords: 'editor design create new signature',
    external: true,
  },
];

export function SearchPalette() {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const lang = useLang();
  const t = nav[lang];
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K her yerden açar — temanın kısayolu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQ('');
      setHits([]);
    }
  }, [open]);

  // Debounce'lu içerik araması.
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) return;
        const body = (await res.json()) as { hits: Hit[] };
        setHits(body.hits);
      } catch {
        /* arama süstür, sayfa değil — sessiz geç */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const needle = q.trim().toLowerCase();
  const pages = needle
    ? PAGES.filter((p) =>
        `${t.search.pages[p.labelKey]} ${p.keywords}`.toLowerCase().includes(needle),
      )
    : PAGES;

  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    /* flex-grow + w-100: görünürdeki arama şeridinin TAMAMI tıklanabilir
       (Hüseyin, 2026-08-15 — eskiden yalnız ikon+yazı kadardı). */
    <div className="navbar-nav align-items-center flex-grow-1" ref={ref}>
      <div className="nav-item navbar-search-wrapper px-md-0 px-2 mb-0 position-relative w-100">
        <button
          type="button"
          className="nav-item nav-link search-toggler d-flex align-items-center px-0 w-100 text-start"
          aria-label={t.search.ariaOpen}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <i className="icon-base ti tabler-search icon-md me-2" aria-hidden="true" />
          <span className="d-none d-md-inline-block text-body-secondary fw-normal">
            {t.search.label} <span className="text-body-secondary">⌘K</span>
          </span>
        </button>

        {open && (
          <div
            className="dropdown-menu show p-0"
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              width: 'min(480px, calc(100vw - 2rem))',
            }}
          >
            <div className="p-3 border-bottom">
              <input
                ref={inputRef}
                type="search"
                className="form-control"
                placeholder={t.search.placeholder}
                aria-label={t.search.label}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <h6 className="dropdown-header text-uppercase small">{t.search.pagesHeader}</h6>
              {pages.length === 0 && (
                <span className="dropdown-item-text small text-body-secondary">
                  {t.search.noPageMatch}
                </span>
              )}
              {pages.map((p) =>
                p.external ? (
                  <a
                    key={p.href}
                    href={p.href}
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => setOpen(false)}
                  >
                    <i className={`icon-base ti ${p.icon} icon-md me-2`} aria-hidden="true" />
                    {t.search.pages[p.labelKey]}
                  </a>
                ) : (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => setOpen(false)}
                  >
                    <i className={`icon-base ti ${p.icon} icon-md me-2`} aria-hidden="true" />
                    {t.search.pages[p.labelKey]}
                  </Link>
                ),
              )}
              {groups.map((g) => (
                <div key={g}>
                  <h6 className="dropdown-header text-uppercase small">{g}</h6>
                  {hits
                    .filter((h) => h.group === g)
                    .map((h, i) => (
                      <Link
                        key={`${g}:${i}`}
                        href={h.href}
                        className="dropdown-item"
                        onClick={() => setOpen(false)}
                      >
                        <span className="d-block">{h.label}</span>
                        <small className="text-body-secondary">{h.sublabel}</small>
                      </Link>
                    ))}
                </div>
              ))}
              {searching && q.trim().length >= 2 && (
                <div className="px-3 pb-2">
                  <div className="placeholder-glow">
                    <span className="placeholder col-7 d-block mb-2" />
                    <span className="placeholder col-5 d-block" />
                  </div>
                </div>
              )}
              {!searching && q.trim().length >= 2 && hits.length === 0 && (
                <span className="dropdown-item-text small text-body-secondary d-block pb-2">
                  {t.search.noContentMatch(q.trim())}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

import { useDropdown } from './useDropdown';

/**
 * Kısayol ızgarası — temanın dropdown-shortcuts bileşeni birebir
 * (Hüseyin'in ekran görüntüsüyle istediği parça, 2026-08-13).
 * Builder tam sayfa <a>: panel CSS'i builder'a taşınmasın.
 */
const SHORTCUTS: ReadonlyArray<{
  label: string;
  note: string;
  icon: string;
  href: string;
  external?: boolean;
}> = [
  { label: 'Builder', note: 'Design a signature', icon: 'tabler-edit', href: '/builder', external: true },
  { label: 'Signatures', note: 'Saved designs', icon: 'tabler-signature', href: '/app/signatures' },
  { label: 'Senders', note: 'Seats & publishing', icon: 'tabler-users', href: '/app/senders' },
  { label: 'Members', note: 'Roles & invites', icon: 'tabler-user-cog', href: '/app/members' },
  { label: 'Brand', note: 'Centralized style', icon: 'tabler-palette', href: '/app/brand' },
  { label: 'Account', note: 'Profile & security', icon: 'tabler-user-circle', href: '/app/account' },
  { label: 'Dashboard', note: 'Workspace overview', icon: 'tabler-layout-dashboard', href: '/app' },
  /* Pazarlama sitesi ayrı host — mutlak URL (panelde göreli /faq 404 olur). */
  {
    label: 'Help',
    note: 'FAQ & guides',
    icon: 'tabler-help',
    href: 'https://mailmyra.com/faq',
    external: true,
  },
];

export function ShortcutsMenu() {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  // 2 sütunlu sıralar — temanın row-bordered düzeni.
  const rows: Array<typeof SHORTCUTS extends ReadonlyArray<infer T> ? T[] : never> = [];
  for (let i = 0; i < SHORTCUTS.length; i += 2) rows.push([...SHORTCUTS.slice(i, i + 2)]);

  return (
    <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
        aria-label="Shortcuts"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-layout-grid-add icon-22px text-heading" aria-hidden="true" />
      </button>
      <div
        className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`}
        style={{ minWidth: 380 }}
      >
        <div className="dropdown-menu-header border-bottom">
          <div className="dropdown-header d-flex align-items-center py-3">
            <h6 className="mb-0 me-auto">Shortcuts</h6>
          </div>
        </div>
        <div className="dropdown-shortcuts-list" style={{ maxHeight: 430, overflowY: 'auto' }}>
          {rows.map((pair, i) => (
            <div key={i} className="row row-bordered overflow-visible g-0">
              {pair.map((s) => (
                <div key={s.label} className="dropdown-shortcuts-item col">
                  <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                    <i className={`icon-base ti ${s.icon} icon-26px text-heading`} aria-hidden="true" />
                  </span>
                  {s.external ? (
                    <a href={s.href} className="stretched-link" onClick={() => setOpen(false)}>
                      {s.label}
                    </a>
                  ) : (
                    <Link href={s.href} className="stretched-link" onClick={() => setOpen(false)}>
                      {s.label}
                    </Link>
                  )}
                  <small>{s.note}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

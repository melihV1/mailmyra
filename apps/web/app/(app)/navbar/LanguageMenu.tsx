'use client';

import { useDropdown } from './useDropdown';

/**
 * Dil menüsü — BİLEREK pasif (Hüseyin, 2026-08-13): görsel bütünlük için
 * temadaki yerinde durur, ürün dili İngilizce kilitli (karar 2026-08-10).
 * TR gelirse burada gerçek seçime döner.
 */
export function LanguageMenu() {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
        aria-label="Language"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-language icon-22px text-heading" aria-hidden="true" />
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        <li>
          <button type="button" className="dropdown-item active" onClick={() => setOpen(false)}>
            English
          </button>
        </li>
        <li>
          <span className="dropdown-item-text small text-body-secondary">
            More languages coming soon
          </span>
        </li>
      </ul>
    </li>
  );
}

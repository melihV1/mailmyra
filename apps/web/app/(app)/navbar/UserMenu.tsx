'use client';

import Link from 'next/link';

import { useDropdown } from './useDropdown';

/**
 * Avatar menüsü — temanın dropdown-user bileşeni birebir (2026-08-13 geri
 * bildirimi: "basic istemiyorum", demodaki her satırın karşılığı var).
 * Billing rozeti koltuk doluluğundan gelir; Billing/Pricing/FAQ hedefleri
 * bugünkü gerçek sayfalar — Billing sekmeli Account'a taşınınca href güncellenir.
 */
export function UserMenu({
  email,
  role,
  seatsFull,
  avatarUrl,
}: {
  email: string;
  role: string | null;
  seatsFull: boolean;
  avatarUrl?: string | null;
}) {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();
  const initial = email.slice(0, 1).toUpperCase();
  const roleLabel = role ? role.slice(0, 1).toUpperCase() + role.slice(1) : 'Member';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Tam yükleme: sunucu bileşenleri çerezin gittiğini ancak yeni istekle görür.
    window.location.href = '/login';
  };

  return (
    <li className="nav-item navbar-dropdown dropdown-user dropdown" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow p-0"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <div className="avatar avatar-online">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="rounded-circle" />
          ) : (
            <span className="avatar-initial rounded-circle bg-label-primary">{initial}</span>
          )}
        </div>
      </button>

      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        <li>
          <Link href="/app/profile" className="dropdown-item mt-0" onClick={() => setOpen(false)}>
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0 me-2">
                <div className="avatar avatar-online">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="rounded-circle" />
                  ) : (
                    <span className="avatar-initial rounded-circle bg-label-primary">
                      {initial}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-0">{email}</h6>
                <small className="text-body-secondary">{roleLabel}</small>
              </div>
            </div>
          </Link>
        </li>
        <li>
          <div className="dropdown-divider my-1 mx-n2" />
        </li>
        <li>
          <Link href="/app/profile" className="dropdown-item" onClick={() => setOpen(false)}>
            <i className="icon-base ti tabler-user me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">My Profile</span>
          </Link>
        </li>
        <li>
          <Link
            href="/app/account/security"
            className="dropdown-item"
            onClick={() => setOpen(false)}
          >
            <i className="icon-base ti tabler-settings me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">Security</span>
          </Link>
        </li>
        <li>
          <Link
            href="/app/account/billing"
            className="dropdown-item"
            onClick={() => setOpen(false)}
          >
            <span className="d-flex align-items-center align-middle">
              <i
                className="flex-shrink-0 icon-base ti tabler-file-dollar me-3 icon-md"
                aria-hidden="true"
              />
              <span className="flex-grow-1 align-middle">Billing &amp; Plan</span>
              {seatsFull && (
                <span className="flex-shrink-0 badge bg-danger d-flex align-items-center justify-content-center">
                  !
                </span>
              )}
            </span>
          </Link>
        </li>
        <li>
          <div className="dropdown-divider my-1 mx-n2" />
        </li>
        {/* Pazarlama sitesi ayrı host (mailmyra.com) — panel app.mailmyra.com'da
            yaşadığı için bu ikisi MUTLAK URL (göreli yazılırsa panelde 404). */}
        <li>
          <a
            href="https://mailmyra.com/pricing"
            className="dropdown-item"
            onClick={() => setOpen(false)}
          >
            <i className="icon-base ti tabler-currency-dollar me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">Pricing</span>
          </a>
        </li>
        <li>
          <a
            href="https://mailmyra.com/faq"
            className="dropdown-item"
            onClick={() => setOpen(false)}
          >
            <i className="icon-base ti tabler-question-mark me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">FAQ</span>
          </a>
        </li>
        <li>
          <div className="d-grid px-2 pt-2 pb-1">
            <button
              type="button"
              className="btn btn-sm btn-danger d-flex justify-content-center"
              onClick={() => void logout()}
            >
              <small className="align-middle">Logout</small>
              <i className="icon-base ti tabler-logout ms-2 icon-14px" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </li>
  );
}

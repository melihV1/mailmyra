'use client';

import { useDropdown } from '../(app)/navbar/useDropdown';

/**
 * Personel avatar menüsü — markup müşteri panelindeki UserMenu'dan BİREBİR
 * (tema dropdown-user); yalnız hedefler personele göre: müşteri paneline
 * dönüş + çıkış. Rozet "Staff" der.
 */
export function StaffUserMenu({ email }: { email: string }) {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();
  const initial = email.slice(0, 1).toUpperCase();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <li className="nav-item navbar-dropdown dropdown-user dropdown" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow p-0"
        aria-label="Staff menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <div className="avatar avatar-online">
          <span className="avatar-initial rounded-circle bg-label-danger">{initial}</span>
        </div>
      </button>

      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        <li>
          <div className="dropdown-item mt-0">
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0 me-2">
                <div className="avatar avatar-online">
                  <span className="avatar-initial rounded-circle bg-label-danger">{initial}</span>
                </div>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-0">{email}</h6>
                <small className="text-body-secondary">Staff</small>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div className="dropdown-divider my-1 mx-n2" />
        </li>
        <li>
          <a href="/app" className="dropdown-item">
            <i className="icon-base ti tabler-arrow-back-up me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">Customer panel</span>
          </a>
        </li>
        <li>
          <div className="dropdown-divider my-1 mx-n2" />
        </li>
        <li>
          <button type="button" className="dropdown-item" onClick={() => void logout()}>
            <i className="icon-base ti tabler-logout me-3 icon-md" aria-hidden="true" />
            <span className="align-middle">Log out</span>
          </button>
        </li>
      </ul>
    </li>
  );
}

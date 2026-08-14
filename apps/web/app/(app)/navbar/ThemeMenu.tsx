'use client';

import { useDropdown } from './useDropdown';

export type ThemeChoice = 'light' | 'dark' | 'system';

const OPTIONS: ReadonlyArray<{ value: ThemeChoice; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: 'tabler-sun' },
  { value: 'dark', label: 'Dark', icon: 'tabler-moon-stars' },
  { value: 'system', label: 'System', icon: 'tabler-device-desktop' },
];

/** Tema anahtarı — seçim PanelShell'de yaşar (data-bs-theme'i o basar). */
export function ThemeMenu({
  choice,
  dark,
  onChange,
}: {
  choice: ThemeChoice;
  dark: boolean;
  onChange: (value: ThemeChoice) => void;
}) {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
        aria-label="Toggle theme"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i
          className={`icon-base ti ${dark ? 'tabler-moon-stars' : 'tabler-sun'} icon-22px text-heading`}
          aria-hidden="true"
        />
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              className={`dropdown-item d-flex align-items-center${choice === opt.value ? ' active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <i className={`icon-base ti ${opt.icon} icon-22px me-3`} aria-hidden="true" />
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Account sekmeleri — temanın `pages-account-settings-*` üst çubuğu
 * (nav-pills; Hüseyin'in ekran görüntüsündeki bileşen, 2026-08-14).
 * Sekmeler ayrı ROTALAR: tarayıcı geri tuşu ve derin link bedava,
 * avatar menüsündeki "Billing & Plan" doğrudan /app/account/billing der.
 * Temadaki "Connections" bizde yok — bağlanacak üçüncü parti yok (bize
 * göre ekle-çıkar talimatı).
 */
const TABS = [
  { href: '/app/account', label: 'Account', icon: 'tabler-user' },
  { href: '/app/account/security', label: 'Security', icon: 'tabler-lock' },
  { href: '/app/account/billing', label: 'Billing & Plan', icon: 'tabler-file-dollar' },
  { href: '/app/account/notifications', label: 'Notifications', icon: 'tabler-bell' },
] as const;

export function AccountTabs() {
  const pathname = usePathname();

  return (
    <div className="nav-align-top mb-4">
      <ul className="nav nav-pills flex-column flex-md-row gap-md-0 gap-2">
        {TABS.map((tab) => (
          <li key={tab.href} className="nav-item">
            <Link
              href={tab.href}
              className={`nav-link${pathname === tab.href ? ' active' : ''}`}
            >
              <i className={`icon-base ti ${tab.icon} icon-sm me-2`} aria-hidden="true" />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

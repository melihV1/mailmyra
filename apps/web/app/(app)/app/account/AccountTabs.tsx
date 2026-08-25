'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { nav as navDict } from '../../../../lib/i18n/dict/nav';
import { useLang } from '../../../../lib/i18n/LangProvider';

/**
 * Account sekmeleri — temanın `pages-account-settings-*` üst çubuğu
 * (nav-pills; Hüseyin'in ekran görüntüsündeki bileşen, 2026-08-14).
 * Sekmeler ayrı ROTALAR: tarayıcı geri tuşu ve derin link bedava,
 * avatar menüsündeki "Billing & Plan" doğrudan /app/account/billing der.
 * Temadaki "Connections" bizde yok — bağlanacak üçüncü parti yok (bize
 * göre ekle-çıkar talimatı). Etiketler kabuk sözlüğü `nav.menu`'den —
 * navbar ve arama paletiyle aynı kaynak, burada TEKRARLANMAZ.
 */
export function AccountTabs() {
  const pathname = usePathname();
  const lang = useLang();
  const t = navDict[lang];

  const tabs = [
    { href: '/app/account', label: t.menu.account, icon: 'tabler-user' },
    { href: '/app/account/security', label: t.menu.security, icon: 'tabler-lock' },
    { href: '/app/account/billing', label: t.menu.billingPlan, icon: 'tabler-file-dollar' },
    { href: '/app/account/notifications', label: t.menu.notifications, icon: 'tabler-bell' },
  ] as const;

  return (
    <div className="nav-align-top mb-4">
      <ul className="nav nav-pills flex-column flex-md-row gap-md-0 gap-2">
        {tabs.map((tab) => (
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

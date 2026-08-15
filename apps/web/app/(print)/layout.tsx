import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { currentSession } from '../../lib/auth/current';

/**
 * Yazdırma rotaları — panel kabuğu YOK (menü/navbar kağıda basılmasın),
 * temanın `app-invoice-print` sayfasının karşılığı. Oturum kapısı (app)
 * grubuyla aynı: bu grup da panel içeriği servis ediyor.
 * Vuexy CSS'i yine <link>le gelir, bundle'a girmez.
 */
export default async function PrintLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (!session.user.emailVerifiedAt) redirect('/verify-pending');

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <div className="mm-panel" data-bs-theme="light" style={{ background: '#fff' }}>
        {children}
      </div>
    </>
  );
}

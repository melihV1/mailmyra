import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { currentSession } from '../../lib/auth/current';
import { isStaff } from '../../lib/repo/admin';
import { AdminShell } from './AdminShell';

/**
 * Personel paneli kabuğu.
 *
 * Bu layout'un koruması KOLAYLIK, güvenlik değil: App Router layout ile
 * sayfayı paralel render edebildiği için asıl kapı her repo fonksiyonunun
 * kendi `requireStaff`'ında duruyor (admin.ts baş yorumu). Burası yalnız
 * personel olmayanı kapıdan çevirir ki müşteri paneline yanlışlıkla admin
 * ekranı sızmasın.
 *
 * Personel OLMAYAN `/app`e yollanır — 403 sayfası değil: admin rotalarının
 * varlığı müşteriye sızdırılmaz (API uçları aynı sebeple 404 döner).
 *
 * Vuexy CSS'i müşteri paneliyle aynı dosyalardan; ayrım kabuğun kendisinde
 * (kalıcı koyu tema + STAFF şeridi) — "hangi taraftayım" sorusu renk
 * uzaklığıyla cevaplanır, yazıyla değil.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/admin');
  if (!(await isStaff(session.user.id))) redirect('/app');

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <AdminShell email={session.user.email}>{children}</AdminShell>
    </>
  );
}

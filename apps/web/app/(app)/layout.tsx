import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { currentSession } from '../../lib/auth/current';
import { primaryOrgId, roleFor, seatSummary } from '../../lib/repo/senders';
import { PanelShell } from './PanelShell';
import './panel-overrides.css';

/**
 * Panel kabuğu — Vuexy iskeleti (karar 2026-08-13, CLAUDE.md §Stack "PANEL
 * TEMASI"). Bu grubun altındaki HER rota oturum ister — kontrol tek yerde,
 * sayfalar "kim bu?" diye sormaz.
 *
 * Koruma middleware'de değil çünkü oturum doğrulaması Prisma istiyor ve
 * middleware edge çalışma zamanında Prisma yok. Sunucu bileşeni bizim
 * kurulumda aynı işi görüyor.
 *
 * Tema CSS'i <link> ile ve public/vuexy'den (gitignore'lu) gelir, bundle'a
 * GİRMEZ: panel rotasından çıkınca React link etiketlerini söker, Vuexy
 * kuralları builder/pazarlamaya sızamaz. Dosyalar yoksa (taze klon, ya da
 * lisans satın alınmadan prod) panel çıplak ama çalışır kalır —
 * `node scripts/vuexy-recolor.mjs` üretir.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/signatures');

  // Doğrulanmamış adres panele GİREMEZ (karar 2026-08-14, eski "banner +
  // export kilidi" modelini değiştirir): kapı tek yerde, bekleme odası
  // /verify-pending — doğrulama gelince kendi kendine panele döner.
  if (!session.user.emailVerifiedAt) redirect('/verify-pending');

  // Avatar menüsü kimlik kartı (rol) + Billing rozeti (koltuk doluluğu).
  const orgId = await primaryOrgId(session.user.id);
  const [role, seats] = await Promise.all([
    orgId ? roleFor(session.user.id, orgId) : null,
    seatSummary(session.user.id),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <PanelShell
        email={session.user.email}
        role={role}
        seatsFull={seats.entitled > 0 && seats.active >= seats.entitled}
      >
        {children}
      </PanelShell>
    </>
  );
}

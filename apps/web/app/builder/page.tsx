import { currentSession } from '../../lib/auth/current';
import { isExportGated } from '../../lib/export-gate';
import { BuilderClient } from './BuilderClient';

export const metadata = { title: 'İmza Oluşturucu — Mailmyra' };
// isExportGated() build zamanında değil, HER İSTEKTE değerlendirilmeli:
// `next build` bu sayfayı statik olarak öndeğerlendirirse, build makinesinin
// ortam değişkeni (EXPORT_REQUIRES_AUTH) build çıktısına gömülür ve sunucu
// ortamındaki gerçek değer hiç okunmaz.
export const dynamic = 'force-dynamic';

export default async function BuilderPage() {
  // Kapı artık gerçek oturuma bakıyor: bayrak kapalıysa serbest; açıksa
  // oturum yoksa girişe, doğrulanmamışsa pasif düğme + sebep. Doğrulanmamış
  // adresle export açılmaz (panel-brief §2.2).
  const session = isExportGated() ? await currentSession() : null;
  const gated = !isExportGated()
    ? (false as const)
    : !session
      ? ('login' as const)
      : session.user.emailVerifiedAt
        ? (false as const)
        : ('verify' as const);

  // iconBaseUrl export-gate ile aynı desen: her istekte sunucudan okunur
  // (dosyadaki mevcut force-dynamic yorumu ve export'u aynen kalır).
  return <BuilderClient gated={gated} iconBaseUrl={process.env.CDN_PUBLIC_URL ?? ''} />;
}

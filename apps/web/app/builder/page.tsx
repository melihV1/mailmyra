import { redirect } from 'next/navigation';

import { currentSession } from '../../lib/auth/current';
import type { BrandDocument } from '../../lib/brand-doc';
import { isExportGated } from '../../lib/export-gate';
import { getBrand } from '../../lib/repo/brand';
import { primaryOrgId } from '../../lib/repo/senders';
import { getSignature } from '../../lib/repo/signatures';
import { BuilderClient } from './BuilderClient';

export const metadata = { title: 'Signature builder — Mailmyra' };
// isExportGated() build zamanında değil, HER İSTEKTE değerlendirilmeli:
// `next build` bu sayfayı statik olarak öndeğerlendirirse, build makinesinin
// ortam değişkeni (EXPORT_REQUIRES_AUTH) build çıktısına gömülür ve sunucu
// ortamındaki gerçek değer hiç okunmaz.
export const dynamic = 'force-dynamic';

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Kapı artık gerçek oturuma bakıyor: bayrak kapalıysa serbest; açıksa
  // oturum yoksa girişe, doğrulanmamışsa pasif düğme + sebep. Doğrulanmamış
  // adresle export açılmaz (panel-brief §2.2).
  const params = await searchParams;
  const sig = typeof params.sig === 'string' ? params.sig : undefined;
  // Düzenleme kipi oturum ister; kapı bayrağından bağımsız.
  const session = sig || isExportGated() ? await currentSession() : null;

  // ?sig= ile gelen kayıtlı imza: sahibi değilse ya da yoksa sessizce
  // listeye dön — 404 sayfası imzanın varlığını doğrulamış olurdu.
  let editing: { id: string; data: unknown; name: string } | null = null;
  if (sig) {
    if (!session) redirect('/login?next=/app/signatures');
    const got = await getSignature(session.user.id, sig);
    if (!got.ok) redirect('/app/signatures');
    editing = { id: got.signature.id, data: got.signature.data, name: got.signature.name };
  }

  // Yalnız düzenleme kipi marka alır (T8) — anonim builder davranışı hiç
  // değişmez. `session` burada `editing` doluyken çalışma zamanında her
  // zaman doludur (yukarıdaki redirect garanti eder), ama TS bunu statik
  // olarak bilemez — `session &&` açık kontrolü bu yüzden gerekli.
  let brand: BrandDocument | null = null;
  if (session && editing) {
    const orgId = await primaryOrgId(session.user.id);
    brand = orgId ? await getBrand(orgId) : null;
  }

  const gated = !isExportGated()
    ? (false as const)
    : !session
      ? ('login' as const)
      : session.user.emailVerifiedAt
        ? (false as const)
        : ('verify' as const);

  // iconBaseUrl export-gate ile aynı desen: her istekte sunucudan okunur
  // (dosyadaki mevcut force-dynamic yorumu ve export'u aynen kalır).
  return (
    <BuilderClient
      gated={gated}
      iconBaseUrl={process.env.CDN_PUBLIC_URL ?? ''}
      signatureId={editing?.id}
      initialData={editing?.data}
      initialName={editing?.name}
      brand={brand}
    />
  );
}

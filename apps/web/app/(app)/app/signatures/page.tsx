import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { seedBrandDefaults } from '../../../../lib/brand-apply';
import { signatures as signaturesDict } from '../../../../lib/i18n/dict/signatures';
import { getLang } from '../../../../lib/i18n/lang.server';
import { NewSignatureButton } from './NewSignatureButton';
import { SignatureTable } from './SignatureTable';
import { getBrand } from '../../../../lib/repo/brand';
import { listSenders, primaryOrgId } from '../../../../lib/repo/senders';
import { listSignatures } from '../../../../lib/repo/signatures';
import { mergeWithEmpty } from '../../../builder/reducer';

export async function generateMetadata() {
  return { title: signaturesDict[await getLang()].pageTitle };
}

/**
 * Panelin ana ekranı (panel-brief §2.4). Kayıt akışı adım 7'de geliyor;
 * bugün her yeni hesap boş durumu görür — brief'in dediği gibi yönerge,
 * boş kutu değil.
 */
export default async function SignaturesPage() {
  // Layout korumasına GÜVENME: App Router layout ile sayfayı paralel render
  // edebiliyor; layout redirect'e karar verirken sayfa null oturumla çalışır
  // (canlıda 500 olarak görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/signatures');
  const lang = await getLang();
  const t = signaturesDict[lang];

  const [signatures, senders, orgId] = await Promise.all([
    listSignatures(session.user.id),
    listSenders(session.user.id),
    primaryOrgId(session.user.id),
  ]);
  const options = senders.map((x) => ({ id: x.id, displayName: x.displayName }));

  // Yeni imza tohumu (T8): org'un markası varsa kilitli + varsayılan
  // alanlar baştan doludur — kullanıcı boş formdan başlamaz.
  const brand = orgId ? await getBrand(orgId) : null;
  const seedData = seedBrandDefaults(mergeWithEmpty({}), brand);

  return (
    <section>
      <h4 className="mb-4">{t.heading}</h4>

      {signatures.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-primary">
                <i className="icon-base ti tabler-signature icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>{t.emptyState.title}</h5>
            <p className="text-body-secondary mb-4">{t.emptyState.body}</p>
            <NewSignatureButton seedData={seedData} />
          </div>
        </div>
      ) : (
        // Tablo istemci bileşeninde: süzme/sıralama/toplu seçim ekranda
        // yaşıyor, sunucu yalnız veriyi veriyor.
        <SignatureTable rows={signatures} senders={options} seedData={seedData} />
      )}
    </section>
  );
}

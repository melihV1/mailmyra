import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { seedBrandDefaults } from '../../../../lib/brand-apply';
import { AssignSelect } from './AssignSelect';
import { NewSignatureButton } from './NewSignatureButton';
import { RowActions } from './RowActions';
import { getBrand } from '../../../../lib/repo/brand';
import { listSenders, primaryOrgId } from '../../../../lib/repo/senders';
import { listSignatures } from '../../../../lib/repo/signatures';
import { mergeWithEmpty } from '../../../builder/reducer';
import styles from './signatures.module.css';

export const metadata = { title: 'Signatures — Mailmyra' };

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
  const SENDER_BADGE: Record<string, string> = {
    draft: 'Draft',
    active: 'Live',
    inactive: 'Inactive',
  };

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Signatures</h1>
        {signatures.length > 0 && <NewSignatureButton seedData={seedData} />}
      </header>

      {signatures.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No signatures yet</h2>
          <p className={styles.emptyBody}>
            Build your first signature in a few minutes — pick a template, fill in your details,
            watch the live preview.
          </p>
          <NewSignatureButton seedData={seedData} />
        </div>
      ) : (
        <ul className={styles.list}>
          {signatures.map((s) => (
            <li key={s.id} className={styles.row}>
              <span className={styles.rowName}>{s.name}</span>
              <span className={styles.rowMeta}>{s.templateId}</span>
              {s.senderName && s.senderStatus && (
                <span className={`${styles.senderBadge} ${styles[`sb_${s.senderStatus}`]}`}>
                  {s.senderName} · {SENDER_BADGE[s.senderStatus]}
                </span>
              )}
              <AssignSelect
                signatureId={s.id}
                current={s.senderId}
                senders={options}
              />
              <time className={styles.rowMeta} dateTime={s.updatedAt.toISOString()}>
                {s.updatedAt.toLocaleDateString('en-GB')}
              </time>
              <RowActions id={s.id} name={s.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

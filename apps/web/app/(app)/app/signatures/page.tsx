import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { AssignSelect } from './AssignSelect';
import { NewSignatureButton } from './NewSignatureButton';
import { RowActions } from './RowActions';
import { listSenders } from '../../../../lib/repo/senders';
import { listSignatures } from '../../../../lib/repo/signatures';
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

  const [signatures, senders] = await Promise.all([
    listSignatures(session.user.id),
    listSenders(session.user.id),
  ]);
  const options = senders.map((x) => ({ id: x.id, displayName: x.displayName }));
  const SENDER_BADGE: Record<string, string> = {
    draft: 'Draft',
    active: 'Live',
    inactive: 'Inactive',
  };

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Signatures</h1>
        {signatures.length > 0 && <NewSignatureButton />}
      </header>

      {signatures.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No signatures yet</h2>
          <p className={styles.emptyBody}>
            Build your first signature in a few minutes — pick a template, fill in your details,
            watch the live preview.
          </p>
          <NewSignatureButton />
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

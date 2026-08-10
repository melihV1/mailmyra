import Link from 'next/link';

import { currentSession } from '../../../../lib/auth/current';
import { RowActions } from './RowActions';
import { listSignatures } from '../../../../lib/repo/signatures';
import styles from './signatures.module.css';

export const metadata = { title: 'Signatures — Mailmyra' };

/**
 * Panelin ana ekranı (panel-brief §2.4). Kayıt akışı adım 7'de geliyor;
 * bugün her yeni hesap boş durumu görür — brief'in dediği gibi yönerge,
 * boş kutu değil.
 */
export default async function SignaturesPage() {
  // Layout oturumu garantiledi; null buraya düşmez.
  const session = (await currentSession())!;

  const signatures = await listSignatures(session.user.id);

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Signatures</h1>
        {signatures.length > 0 && (
          <Link href="/builder" className={styles.primary}>
            New signature
          </Link>
        )}
      </header>

      {signatures.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No signatures yet</h2>
          <p className={styles.emptyBody}>
            Build your first signature in a few minutes — pick a template, fill in your details,
            watch the live preview.
          </p>
          <Link href="/builder" className={styles.primary}>
            New signature
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {signatures.map((s) => (
            <li key={s.id} className={styles.row}>
              <span className={styles.rowName}>{s.name}</span>
              <span className={styles.rowMeta}>{s.templateId}</span>
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
